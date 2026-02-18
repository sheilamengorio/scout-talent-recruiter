const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TalentPage = require('../models/TalentPage');
const tlpGenerator = require('../services/tlpGenerator');
const openaiService = require('../services/openai');
const memoryStorage = require('../services/memoryStorage');
const websiteScraper = require('../services/websiteScraper');
const brandExtractor = require('../services/brandExtractor');
const marketResearch = require('../services/marketResearch');
const interviewQuestions = require('../services/interviewQuestions');
const deploymentAdvisor = require('../services/deploymentAdvisor');

// Check if MongoDB is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Helper: get TLP by ID
async function getTLP(id) {
  if (isMongoConnected()) {
    return await TalentPage.findById(id);
  }
  return memoryStorage.findById(id);
}

// Helper: save TLP
async function saveTLP(tlp) {
  if (isMongoConnected()) {
    await tlp.save();
  } else {
    memoryStorage.update(tlp._id, tlp);
  }
}

/**
 * Run website brand scraping in background
 */
async function runBrandScraping(tlp) {
  try {
    console.log(`[TLP Routes] Starting brand scraping for ${tlp.company_website_url}`);
    tlp.brand_data = tlp.brand_data || {};
    tlp.brand_data.scrape_status = 'in_progress';
    await saveTLP(tlp);

    const rawData = await websiteScraper.scrape(tlp.company_website_url);
    const brandProfile = await brandExtractor.extract(rawData);

    if (brandProfile.error) {
      tlp.brand_data.scrape_status = 'failed';
    } else {
      tlp.brand_data = {
        scrape_status: 'completed',
        scraped_at: new Date(),
        colors: brandProfile.colors || {},
        fonts: brandProfile.fonts || {},
        logo_url: brandProfile.logo_url || '',
        brand_voice_keywords: brandProfile.brand_voice_keywords || [],
        tone_category: brandProfile.tone_category || '',
        writing_style: brandProfile.writing_style || '',
        brand_avoid: brandProfile.brand_avoid || '',
        raw_meta_description: brandProfile.raw_meta_description || '',
        hero_image_url: brandProfile.hero_image_url || '',
        career_page_content: brandProfile.career_page_content || '',
        about_page_content: brandProfile.about_page_content || '',
        scraped_images: brandProfile.scraped_images || []
      };

      // NOTE: Color/font/logo application is handled exclusively by applyBrandData()
      // in tlpGenerator.js during HTML generation. This prevents double-apply issues
      // and ensures user customizations are respected.
    }

    // Regenerate HTML with brand styling
    tlp.generated_html = await tlpGenerator.generate(tlp);
    await saveTLP(tlp);

    console.log(`[TLP Routes] Brand scraping completed: ${tlp.brand_data.scrape_status}`);
  } catch (error) {
    console.error('[TLP Routes] Brand scraping error:', error.message);
    tlp.brand_data = tlp.brand_data || {};
    tlp.brand_data.scrape_status = 'failed';
    await saveTLP(tlp);
  }
}

/**
 * Run market research in background
 */
async function runMarketResearch(tlp, roleTitle, location, industry) {
  try {
    console.log(`[TLP Routes] Starting market research for ${roleTitle} in ${location}`);
    tlp.market_data = tlp.market_data || {};
    tlp.market_data.research_status = 'in_progress';
    await saveTLP(tlp);

    const data = await marketResearch.research(roleTitle, location, industry);

    tlp.market_data = {
      research_status: 'completed',
      researched_at: new Date(),
      similar_roles_count: data.similar_roles_count || 0,
      salary_range_market: data.salary_range_market || { low: '', median: '', high: '' },
      common_benefits: data.common_benefits || [],
      common_requirements: data.common_requirements || [],
      competitor_highlights: data.competitor_highlights || [],
      search_query_used: data.search_query_used || '',
      data_source: data.data_source || 'unavailable'
    };

    await saveTLP(tlp);
    console.log(`[TLP Routes] Market research completed: ${data.data_source}`);
  } catch (error) {
    console.error('[TLP Routes] Market research error:', error.message);
    tlp.market_data = tlp.market_data || {};
    tlp.market_data.research_status = 'failed';
    await saveTLP(tlp);
  }
}

/**
 * POST /api/chat
 * Handle conversational AI chat for TLP creation
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversation = [], tlp_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const useMongo = isMongoConnected();
    let tlp;

    // Get or create TLP
    if (tlp_id) {
      tlp = await getTLP(tlp_id);
      if (!tlp) {
        return res.status(404).json({ error: 'TLP not found' });
      }
    } else {
      if (useMongo) {
        tlp = new TalentPage();
        await tlp.save();
      } else {
        tlp = memoryStorage.create();
      }
    }

    // Add user message to conversation history
    if (!tlp.conversation_history) {
      tlp.conversation_history = [];
    }
    tlp.conversation_history.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Get AI response with function calling
    const aiResponse = await openaiService.handleTLPConversation(
      message,
      conversation,
      tlp
    );

    // Add AI message to conversation history
    tlp.conversation_history.push({
      role: 'assistant',
      content: aiResponse.reply,
      timestamp: new Date()
    });

    // Update TLP with extracted data
    if (aiResponse.extracted_data && Object.keys(aiResponse.extracted_data).length > 0) {
      // Handle branding overrides explicitly (primary_color, secondary_color, font_family)
      if (aiResponse.extracted_data.primary_color) {
        tlp.primary_color = aiResponse.extracted_data.primary_color;
      }
      if (aiResponse.extracted_data.secondary_color) {
        tlp.secondary_color = aiResponse.extracted_data.secondary_color;
      }
      if (aiResponse.extracted_data.font_family) {
        tlp.font_family = aiResponse.extracted_data.font_family;
      }

      Object.assign(tlp, aiResponse.extracted_data);
    }

    // Update conversation phase based on state
    updateConversationPhase(tlp);

    // Process tool actions (non-update functions)
    const scrapingStatus = {
      brand: tlp.brand_data?.scrape_status || 'pending',
      market: tlp.market_data?.research_status || 'pending'
    };

    if (aiResponse.tool_actions) {
      for (const action of aiResponse.tool_actions) {
        switch (action.name) {
          case 'trigger_website_scrape': {
            const url = action.args.website_url;
            if (url && tlp.brand_data?.scrape_status !== 'in_progress' && tlp.brand_data?.scrape_status !== 'completed') {
              tlp.company_website_url = url;
              scrapingStatus.brand = 'in_progress';
              // Run async - don't await
              runBrandScraping(tlp).catch(err => console.error('Brand scraping background error:', err));
            }
            break;
          }
          case 'trigger_market_research': {
            if (tlp.market_data?.research_status !== 'in_progress' && tlp.market_data?.research_status !== 'completed') {
              scrapingStatus.market = 'in_progress';
              // Run async - don't await
              runMarketResearch(tlp, action.args.role_title, action.args.location, action.args.industry).catch(err => console.error('Market research background error:', err));
            }
            break;
          }
          case 'generate_interview_questions': {
            const categories = action.args.categories || ['behavioral', 'technical', 'situational', 'culture_fit'];
            const questions = await interviewQuestions.generate(tlp, categories);
            tlp.interview_questions = questions;
            break;
          }
          case 'get_deployment_recommendations': {
            const recommendations = await deploymentAdvisor.recommend(action.args);
            tlp.deployment_platforms = recommendations;
            break;
          }
        }
      }
    }

    // Generate updated TLP HTML
    tlp.generated_html = await tlpGenerator.generate(tlp);

    // Save TLP
    await saveTLP(tlp);

    res.json({
      reply: aiResponse.reply,
      tlp_id: tlp._id,
      updated_fields: aiResponse.extracted_data || {},
      preview_url: `/tlp/${tlp._id}`,
      scraping_status: scrapingStatus,
      interview_questions: tlp.interview_questions?.length > 0 ? tlp.interview_questions : undefined,
      deployment_platforms: tlp.deployment_platforms?.length > 0 ? tlp.deployment_platforms : undefined,
      conversation_phase: tlp.conversation_phase
    });

  } catch (error) {
    console.error('Chat error:', error.message || error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * Update conversation phase based on TLP state
 */
function updateConversationPhase(tlp) {
  const hasBasics = tlp.role_title && tlp.company_name;
  const hasContent = tlp.job_description || (tlp.responsibilities?.length > 0);
  const hasFullContent = hasContent && tlp.requirements?.length > 0;
  const isScraping = tlp.brand_data?.scrape_status === 'in_progress' || tlp.market_data?.research_status === 'in_progress';

  if (!hasBasics) {
    tlp.conversation_phase = 'intake';
  } else if (isScraping) {
    tlp.conversation_phase = 'researching';
  } else if (!hasFullContent) {
    tlp.conversation_phase = 'content_creation';
  } else if (tlp.deployment_platforms?.length > 0) {
    tlp.conversation_phase = 'deployment';
  } else if (hasFullContent) {
    tlp.conversation_phase = 'review';
  }
}

/**
 * POST /api/tlp/create
 * Create a new empty TLP
 */
router.post('/create', async (req, res) => {
  try {
    const useMongo = isMongoConnected();
    let tlp;

    if (useMongo) {
      tlp = new TalentPage();
      await tlp.save();
    } else {
      tlp = memoryStorage.create();
    }

    res.json({
      tlp_id: tlp._id,
      message: 'TLP created successfully'
    });
  } catch (error) {
    console.error('Create TLP error:', error);
    res.status(500).json({ error: 'Failed to create TLP' });
  }
});

/**
 * PUT /api/tlp/:id
 * Update TLP (for inline edits and styling)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const useMongo = isMongoConnected();
    let tlp;

    if (useMongo) {
      tlp = await TalentPage.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
    } else {
      tlp = memoryStorage.update(id, updates);
    }

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    // Regenerate HTML with updates
    const generated_html = await tlpGenerator.generate(tlp);
    tlp.generated_html = generated_html;

    if (useMongo) {
      await tlp.save();
    } else {
      memoryStorage.update(id, { generated_html });
    }

    res.json({
      message: 'TLP updated successfully',
      tlp: tlp
    });
  } catch (error) {
    console.error('Update TLP error:', error);
    res.status(500).json({ error: 'Failed to update TLP' });
  }
});

/**
 * GET /api/tlp/:id/data
 * Get TLP data as JSON
 */
router.get('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    res.json(tlp);
  } catch (error) {
    console.error('Get TLP data error:', error);
    res.status(500).json({ error: 'Failed to get TLP data' });
  }
});

/**
 * GET /api/tlp/:id/scraping-status
 * Get current scraping status for polling
 */
router.get('/:id/scraping-status', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    res.json({
      brand_status: tlp.brand_data?.scrape_status || 'pending',
      market_status: tlp.market_data?.research_status || 'pending',
      brand_data: tlp.brand_data?.scrape_status === 'completed' ? {
        colors: tlp.brand_data.colors,
        fonts: tlp.brand_data.fonts,
        logo_url: tlp.brand_data.logo_url
      } : null,
      market_data: tlp.market_data?.research_status === 'completed' ? {
        similar_roles_count: tlp.market_data.similar_roles_count,
        salary_range_market: tlp.market_data.salary_range_market,
        data_source: tlp.market_data.data_source
      } : null
    });
  } catch (error) {
    console.error('Scraping status error:', error);
    res.status(500).json({ error: 'Failed to get scraping status' });
  }
});

/**
 * POST /api/tlp/:id/scrape-brand
 * Manual trigger for brand scraping
 */
router.post('/:id/scrape-brand', async (req, res) => {
  try {
    const { id } = req.params;
    const { website_url } = req.body;

    if (!website_url) {
      return res.status(400).json({ error: 'website_url is required' });
    }

    const tlp = await getTLP(id);
    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    tlp.company_website_url = website_url;

    // Run async
    runBrandScraping(tlp).catch(err => console.error('Brand scraping error:', err));

    res.json({ status: 'initiated', message: 'Brand scraping started' });
  } catch (error) {
    console.error('Scrape brand error:', error);
    res.status(500).json({ error: 'Failed to initiate brand scraping' });
  }
});

/**
 * POST /api/tlp/:id/market-research
 * Manual trigger for market research
 */
router.post('/:id/market-research', async (req, res) => {
  try {
    const { id } = req.params;
    const { role_title, location, industry } = req.body;

    if (!role_title || !location) {
      return res.status(400).json({ error: 'role_title and location are required' });
    }

    const tlp = await getTLP(id);
    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    // Run async
    runMarketResearch(tlp, role_title, location, industry).catch(err => console.error('Market research error:', err));

    res.json({ status: 'initiated', message: 'Market research started' });
  } catch (error) {
    console.error('Market research error:', error);
    res.status(500).json({ error: 'Failed to initiate market research' });
  }
});

/**
 * GET /api/tlp/:id/market-data
 * Get market research results
 */
router.get('/:id/market-data', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    res.json(tlp.market_data || { research_status: 'pending' });
  } catch (error) {
    console.error('Get market data error:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

/**
 * GET /api/tlp/:id/interview-questions
 * Get or generate interview questions
 */
router.get('/:id/interview-questions', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    // Generate if not already done
    if (!tlp.interview_questions || tlp.interview_questions.length === 0) {
      const questions = await interviewQuestions.generate(tlp);
      tlp.interview_questions = questions;
      await saveTLP(tlp);
    }

    res.json({ questions: tlp.interview_questions });
  } catch (error) {
    console.error('Interview questions error:', error);
    res.status(500).json({ error: 'Failed to get interview questions' });
  }
});

/**
 * GET /api/tlp/:id/deployment-recommendations
 * Get platform recommendations
 */
router.get('/:id/deployment-recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    if (!tlp.deployment_platforms || tlp.deployment_platforms.length === 0) {
      const recommendations = await deploymentAdvisor.recommend({
        role_title: tlp.role_title,
        location: tlp.location,
        industry: tlp.industry
      });
      tlp.deployment_platforms = recommendations;
      await saveTLP(tlp);
    }

    res.json({ platforms: tlp.deployment_platforms });
  } catch (error) {
    console.error('Deployment recommendations error:', error);
    res.status(500).json({ error: 'Failed to get deployment recommendations' });
  }
});

/**
 * POST /api/tlp/:id/export
 * Export TLP as downloadable HTML file
 */
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const tlp = await getTLP(id);

    if (!tlp) {
      return res.status(404).json({ error: 'TLP not found' });
    }

    // Generate standalone HTML (with inline CSS)
    const standalone_html = await tlpGenerator.generateStandalone(tlp);

    // Set headers for file download
    const filename = `${tlp.role_title || 'job'}_${tlp.company_name || 'posting'}.html`
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(standalone_html);

  } catch (error) {
    console.error('Export TLP error:', error);
    res.status(500).json({ error: 'Failed to export TLP' });
  }
});

module.exports = router;
