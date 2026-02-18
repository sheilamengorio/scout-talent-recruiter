// Scout Talent - Talent Landing Page Generator
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import service modules
const openaiService = require('./services/openai');
const salesforceService = require('./services/salesforce');
const leadDetector = require('./services/leadDetector');
const intentScoring = require('./services/intentScoring');

// Import models
const TalentPage = require('./models/TalentPage');

const app = express();
const port = process.env.PORT || 5000;

// MongoDB Connection (optional - app runs without it)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scout-talent';

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log('✓ MongoDB connected successfully');
  })
  .catch(() => {
    console.log('  (MongoDB not running – app will run without DB features)');
  });

// Middleware
app.use(bodyParser.json());

// CORS - allow frontend from any origin (for split deployment)
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.static('public'));

// Track which conversations have already created leads (in-memory)
// In production, consider using a database or session storage
const leadsCreated = new Set();

// Track lead IDs for each conversation (for post-creation updates)
// Key: conversation ID, Value: { leadId, contactDataProvided }
const conversationLeads = new Map();

// Track session data for intent scoring (in-memory)
// Key: conversation ID, Value: session data
const sessions = new Map();

/**
 * Generate a unique conversation ID from the conversation messages
 * This helps prevent duplicate lead creation for the same conversation
 */
function getConversationId(conversation) {
  if (!conversation || conversation.length === 0) return 'empty';

  // Use first user message as a simple conversation identifier
  const firstUserMessage = conversation.find(m => m.role === 'user');
  if (firstUserMessage) {
    return firstUserMessage.content.substring(0, 50);
  }

  return 'unknown';
}

/**
 * Accumulate job data from all function calls
 * @param {Array} toolCalls - Array of tool calls
 * @returns {Object} Accumulated job data
 */
function accumulateJobData(toolCalls) {
  const jobData = {
    role_title: null,
    location: null,
    work_type: null,
    industry: null,
    seniority: null,
    salary_range: null,
    must_have_skills: [],
    hiring_urgency: null,
    whats_not_working: null
  };

  toolCalls.forEach(call => {
    if (call.name === 'extract_job_information' && call.arguments) {
      const args = call.arguments;

      // Update fields if they have values
      if (args.role_title) jobData.role_title = args.role_title;
      if (args.location) jobData.location = args.location;
      if (args.work_type) jobData.work_type = args.work_type;
      if (args.industry) jobData.industry = args.industry;
      if (args.seniority) jobData.seniority = args.seniority;
      if (args.salary_range) jobData.salary_range = args.salary_range;
      if (args.hiring_urgency) jobData.hiring_urgency = args.hiring_urgency;
      if (args.whats_not_working) jobData.whats_not_working = args.whats_not_working;

      // Accumulate skills
      if (args.must_have_skills && Array.isArray(args.must_have_skills)) {
        args.must_have_skills.forEach(skill => {
          if (!jobData.must_have_skills.includes(skill)) {
            jobData.must_have_skills.push(skill);
          }
        });
      }
    }
  });

  return jobData;
}

/**
 * Content moderation - check for inappropriate content
 */
function moderateContent(message) {
  const text = message.toLowerCase();

  // List of profanity and inappropriate terms to block
  const blockedWords = [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
    'crap', 'piss', 'cock', 'dick', 'pussy', 'cunt'
  ];

  // Check for profanity
  for (const word of blockedWords) {
    if (text.includes(word)) {
      return {
        blocked: true,
        reason: 'Please keep the conversation professional. I\'m here to help with recruitment needs.'
      };
    }
  }

  return { blocked: false };
}

/**
 * Main chat endpoint - handles conversation with AI and lead creation
 */
app.post('/api/agent', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({
        error: 'Invalid request: conversation array is required'
      });
    }

    // Moderate the latest user message
    const lastUserMessage = conversation.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const moderation = moderateContent(lastUserMessage.content);
      if (moderation.blocked) {
        return res.json({
          reply: moderation.reason
        });
      }
    }

    console.log(`\n=== New Chat Request (${conversation.length} messages) ===`);

    // Log the user's latest message for debugging
    if (lastUserMessage) {
      console.log('User message:', lastUserMessage.content.substring(0, 100));
    }

    // Get or initialize session data for intent scoring
    const conversationId = getConversationId(conversation);
    let sessionData = sessions.get(conversationId);
    if (!sessionData) {
      sessionData = intentScoring.initializeSessionData();
      sessions.set(conversationId, sessionData);
    }

    // Step 1: Get AI response with function calling
    const aiResponse = await openaiService.getChatCompletion(conversation);

    let finalMessage = aiResponse.message;
    let toolCalls = aiResponse.toolCalls;

    // Step 2: Calculate intent score
    const intentData = intentScoring.calculateIntentScore(sessionData, conversation);
    console.log('Intent:', intentScoring.getIntentSummary(intentData));

    // Step 3: Extract contact data and job data from tool calls (if any)
    let contactData = {};
    let jobData = {};
    let userNeeds = '';

    if (toolCalls && toolCalls.length > 0) {
      console.log('AI triggered function call:', toolCalls[0].name);

      // Extract all tool calls from conversation
      const allToolCalls = leadDetector.extractToolCallsFromConversation(conversation);
      allToolCalls.push(toolCalls[0]);

      // Handle different function types
      if (toolCalls[0].name === 'extract_job_information') {
        // Extract job data from this and previous calls
        jobData = accumulateJobData(allToolCalls);
        console.log('Job data:', JSON.stringify(jobData, null, 2));

        // Extract "what's not working" if provided
        if (jobData.whats_not_working) {
          userNeeds = jobData.whats_not_working;
        }

        // Track activity for intent scoring
        if (jobData.role_title && jobData.location) {
          // Update session - user provided core job details
          sessionData = intentScoring.updateSessionData(sessionData, 'job_intake_complete');
          sessions.set(conversationId, sessionData);
        }
      }

      if (toolCalls[0].name === 'extract_lead_information') {
        // Get contact data if provided
        contactData = leadDetector.accumulateLeadData(allToolCalls);
        console.log('Contact data:', leadDetector.getLeadSummary(contactData));
      }

      // Get AI's follow-up response
      const followUp = await openaiService.handleFunctionCallFollowUp(conversation, toolCalls[0]);
      finalMessage = followUp.message;
    }

    // Step 4: Check if should create lead (intent score >= 60)
    const shouldCreate = intentScoring.shouldCreateLead(intentData.intent_score);
    const alreadyCreated = leadsCreated.has(conversationId);

    if (shouldCreate && !alreadyCreated) {
      console.log('\n🎯 High intent detected - Creating Salesforce lead automatically...');

      // Create lead in Salesforce with intent data
      const salesforceResult = await salesforceService.createLead(
        intentData,
        jobData,
        userNeeds,
        contactData,
        conversation
      );

      if (salesforceResult.success) {
        console.log(`✓ Lead ${salesforceResult.updated ? 'updated' : 'created'}: ${salesforceResult.leadId}`);

        // Mark this conversation as having created a lead
        leadsCreated.add(conversationId);

        // Track lead ID for future updates
        conversationLeads.set(conversationId, {
          leadId: salesforceResult.leadId,
          contactDataProvided: !!(contactData.contact_email || contactData.contact_phone)
        });

        // Add transparent message to user
        finalMessage += '\n\nBased on what you\'ve shared, our team can help. Someone may reach out shortly.';
      } else {
        console.error('✗ Failed to create lead:', salesforceResult.error);
        // Don't fail the chat - just log the error
      }
    }

    // Step 5: If lead already exists, check for post-creation updates
    if (alreadyCreated && conversationLeads.has(conversationId)) {
      const leadInfo = conversationLeads.get(conversationId);

      // Check if new contact information was provided after lead creation
      const hasNewContactData = contactData.contact_email || contactData.contact_phone || contactData.contact_name || contactData.company_name;

      if (hasNewContactData && !leadInfo.contactDataProvided) {
        console.log('\n📝 Updating lead with new contact information...');

        const updateResult = await salesforceService.updateLeadPostCreation(
          leadInfo.leadId,
          {
            contact_name: contactData.contact_name,
            contact_email: contactData.contact_email,
            contact_phone: contactData.contact_phone,
            company_name: contactData.company_name,
            availability: jobData.hiring_urgency || null,
            additional_notes: null
          },
          conversation
        );

        if (updateResult.success) {
          console.log('✓ Lead updated with contact details');

          // Mark that contact data has been provided
          leadInfo.contactDataProvided = true;
          conversationLeads.set(conversationId, leadInfo);
        }
      }
    }

    // Step 5: Return response to frontend
    res.json({
      reply: finalMessage || "Thank you for your interest in Scout Talent. How can I help you today?"
    });

  } catch (error) {
    console.error('Error in /api/agent:', error.message);

    res.status(500).json({
      error: 'I apologize, but I encountered an error. Please try again or contact us directly.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Import TLP routes
const tlpRoutes = require('./routes/tlpRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const memoryStorage = require('./services/memoryStorage');

// Mount TLP routes
app.use('/api', tlpRoutes);
app.use('/api', uploadRoutes);

/**
 * POST /api/trial-signup - Handle trial signup form
 */
app.post('/api/trial-signup', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      jobTitle,
      workEmail,
      companyName,
      employeeCount,
      phone,
      country,
      trialReason
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !workEmail || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create lead in Salesforce
    const salesforceService = require('./services/salesforce');

    const leadData = {
      firstName,
      lastName,
      email: workEmail,
      company: companyName,
      phone: phone || '',
      title: jobTitle || '',
      leadSource: 'TLP Generator - Trial Signup',
      description: `Trial Reason: ${trialReason}\nEmployee Count: ${employeeCount}\nCountry: ${country}`
    };

    try {
      await salesforceService.createLead(leadData);
      console.log(`✓ Trial signup lead created for ${workEmail}`);
    } catch (sfError) {
      console.error('Salesforce error:', sfError);
      // Continue even if Salesforce fails
    }

    // TODO: In production, also:
    // 1. Create trial account in your system
    // 2. Send welcome email
    // 3. Set up trial expiration (14 days)

    res.json({
      success: true,
      message: 'Trial account created successfully'
    });

  } catch (error) {
    console.error('Trial signup error:', error);
    res.status(500).json({ error: 'Failed to create trial account' });
  }
});

/**
 * GET /tlp/:id - Public hosted TLP page
 */
app.get('/tlp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const useMongo = mongoose.connection.readyState === 1;
    let tlp;

    if (useMongo) {
      const TalentPage = require('./models/TalentPage');
      tlp = await TalentPage.findById(id);

      if (tlp) {
        // Increment view count
        tlp.view_count += 1;
        await tlp.save();
      }
    } else {
      tlp = memoryStorage.findById(id);
      if (tlp) {
        // Increment view count
        tlp.view_count += 1;
        memoryStorage.update(id, { view_count: tlp.view_count });
      }
    }

    if (!tlp) {
      return res.status(404).send('<h1>Talent Landing Page Not Found</h1>');
    }

    // Serve generated HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(tlp.generated_html || '<h1>Page is being generated...</h1>');

  } catch (error) {
    console.error('Error serving TLP:', error);
    res.status(500).send('<h1>Error loading page</h1>');
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        openai: 'unknown',
        salesforce: 'unknown'
      }
    };

    // Test Salesforce connection (optional - can be slow)
    if (req.query.checkSalesforce === 'true') {
      try {
        const sfConnected = await salesforceService.testConnection();
        health.services.salesforce = sfConnected ? 'ok' : 'error';
      } catch (error) {
        health.services.salesforce = 'error';
      }
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Get system info (for debugging)
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Scout Talent Recruitment ChatBot',
    version: '2.0.0',
    features: [
      'AI-powered recruitment assistant',
      'Knowledge base with Scout Talent services',
      'Automatic lead detection',
      'Salesforce integration',
      'Conversation transcript capture'
    ],
    endpoints: {
      chat: 'POST /api/agent',
      health: 'GET /api/health',
      info: 'GET /api/info'
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log('\n==============================================');
  console.log('🚀 Scout Talent Recruitment ChatBot Started');
  console.log('==============================================');
  console.log(`Server running on: http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log('\nFeatures enabled:');
  console.log('  ✓ AI-powered chat with Scout Talent knowledge');
  console.log('  ✓ Automatic lead detection');
  console.log('  ✓ Salesforce integration');
  console.log('\nEnvironment:');
  console.log(`  OpenAI API: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  Salesforce: ${process.env.SALESFORCE_USERNAME ? '✓ Configured' : '✗ Missing'}`);
  console.log('==============================================');
  console.log(`\n  👉 Open in browser: http://localhost:${port}\n`);
});
