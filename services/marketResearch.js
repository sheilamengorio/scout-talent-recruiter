const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const cache = require('./scrapingCache');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Research the job market for a given role
 * Tries SEEK scraping first, falls back to AI estimation
 * @param {string} roleTitle - Job title
 * @param {string} location - Job location
 * @param {string} industry - Industry/sector
 * @returns {Object} Market research data
 */
async function research(roleTitle, location, industry) {
  const cacheKey = `${roleTitle}|${location}|${industry}`.toLowerCase();

  if (cache.market.has(cacheKey)) {
    console.log('[MarketResearch] Cache hit');
    return cache.market.get(cacheKey);
  }

  console.log(`[MarketResearch] Researching: ${roleTitle} in ${location} (${industry})`);

  // Try SEEK scraping first
  let result = await scrapeSeek(roleTitle, location);

  if (result.error) {
    console.log('[MarketResearch] SEEK scraping failed, falling back to AI estimation');
    result = await aiEstimate(roleTitle, location, industry);
  }

  // Cache the result
  cache.market.set(cacheKey, result);

  return result;
}

/**
 * Scrape SEEK for market data
 */
async function scrapeSeek(roleTitle, location) {
  try {
    // Format role and location for SEEK URL
    const formattedRole = roleTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const formattedLocation = formatSeekLocation(location);

    const searchUrl = `https://www.seek.com.au/${formattedRole}-jobs/in-${formattedLocation}`;
    console.log(`[MarketResearch] SEEK URL: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Extract total results count
    const totalResults = extractResultCount($);

    // Extract job listings
    const listings = extractListings($);

    // Aggregate salary data
    const salaryData = aggregateSalaries(listings);

    // Extract common benefits and requirements
    const commonBenefits = extractCommonItems(listings, 'benefits');
    const commonRequirements = extractCommonItems(listings, 'requirements');

    // Generate competitor highlights
    const highlights = listings.slice(0, 5).map(l =>
      `${l.company}: ${l.title}${l.salary ? ' (' + l.salary + ')' : ''}`
    ).filter(Boolean);

    return {
      similar_roles_count: totalResults,
      salary_range_market: salaryData,
      common_benefits: commonBenefits,
      common_requirements: commonRequirements,
      competitor_highlights: highlights,
      search_query_used: searchUrl,
      data_source: 'seek.com.au',
      researched_at: new Date()
    };

  } catch (error) {
    console.error('[MarketResearch] SEEK scraping error:', error.message);
    return { error: error.message };
  }
}

/**
 * Format location for SEEK URL
 */
function formatSeekLocation(location) {
  if (!location) return 'All-Australia';

  const loc = location.toLowerCase().trim();

  // Map common location names to SEEK URL format
  const locationMap = {
    'sydney': 'All-Sydney-NSW',
    'melbourne': 'All-Melbourne-VIC',
    'brisbane': 'All-Brisbane-QLD',
    'perth': 'All-Perth-WA',
    'adelaide': 'All-Adelaide-SA',
    'canberra': 'All-Canberra-ACT',
    'hobart': 'All-Hobart-TAS',
    'darwin': 'All-Darwin-NT',
    'gold coast': 'All-Gold-Coast-QLD',
    'newcastle': 'All-Newcastle-Maitland-Hunter-NSW',
    'remote': 'All-Australia',
    'australia': 'All-Australia'
  };

  // Check for city match
  for (const [city, seekFormat] of Object.entries(locationMap)) {
    if (loc.includes(city)) return seekFormat;
  }

  // State-level matching
  if (loc.includes('nsw') || loc.includes('new south wales')) return 'in-New-South-Wales';
  if (loc.includes('vic') || loc.includes('victoria')) return 'in-Victoria';
  if (loc.includes('qld') || loc.includes('queensland')) return 'in-Queensland';
  if (loc.includes('wa') || loc.includes('western australia')) return 'in-Western-Australia';
  if (loc.includes('sa') || loc.includes('south australia')) return 'in-South-Australia';

  // Default: use as-is with formatting
  return loc.replace(/[,\s]+/g, '-').replace(/[^a-z0-9-]/g, '') || 'All-Australia';
}

/**
 * Extract total results count from SEEK page
 */
function extractResultCount($) {
  // SEEK shows "X,XXX jobs" in various elements
  const countText = $('[data-automation="totalJobsCount"]').text() ||
    $('h1').text() ||
    $('[class*="jobCount"], [class*="job-count"], [class*="totalJobs"]').text() ||
    '';

  const match = countText.match(/([\d,]+)\s*jobs?/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''));
  }

  // Try counting visible job cards as fallback
  const cardCount = $('[data-automation="normalJob"], [data-card-type="JobCard"], article[data-testid]').length;
  return cardCount || 0;
}

/**
 * Extract job listings from SEEK page
 */
function extractListings($) {
  const listings = [];

  // SEEK job cards - try multiple selectors as SEEK changes structure
  const cardSelectors = [
    '[data-automation="normalJob"]',
    '[data-card-type="JobCard"]',
    'article[data-testid]',
    '[class*="JobCard"]',
    '[role="article"]'
  ];

  let cards = $([]);
  for (const selector of cardSelectors) {
    cards = $(selector);
    if (cards.length > 0) break;
  }

  cards.each((i, el) => {
    if (i >= 20) return false; // Max 20 listings

    const $el = $(el);

    const title = $el.find('[data-automation="jobTitle"], a[class*="jobTitle"], h3 a, [class*="title"] a').first().text().trim();
    const company = $el.find('[data-automation="jobCompany"], [class*="company"], [class*="advertiser"]').first().text().trim();
    const salary = $el.find('[data-automation="jobSalary"], [class*="salary"]').first().text().trim();
    const loc = $el.find('[data-automation="jobLocation"], [class*="location"]').first().text().trim();
    const tags = [];

    $el.find('[class*="tag"], [class*="badge"], [class*="benefit"]').each((_, tag) => {
      const text = $(tag).text().trim();
      if (text && text.length < 50) tags.push(text);
    });

    if (title || company) {
      listings.push({ title, company, salary, location: loc, tags });
    }
  });

  return listings;
}

/**
 * Aggregate salary data from listings
 */
function aggregateSalaries(listings) {
  const salaries = [];

  for (const listing of listings) {
    if (!listing.salary) continue;

    // Parse salary strings like "$80,000 - $100,000", "$120k", "$90,000 - $110,000 per year"
    const numbers = listing.salary.match(/\$?([\d,]+)k?/gi);
    if (numbers) {
      numbers.forEach(n => {
        let val = parseInt(n.replace(/[$,]/g, ''));
        // If value seems like it's in thousands shorthand (e.g., "120k")
        if (n.toLowerCase().includes('k')) {
          val *= 1000;
        }
        // If value is reasonable for annual salary
        if (val >= 30000 && val <= 500000) {
          salaries.push(val);
        } else if (val >= 30 && val <= 500) {
          // Might be in thousands without k
          salaries.push(val * 1000);
        }
      });
    }
  }

  if (salaries.length === 0) {
    return { low: '', median: '', high: '' };
  }

  salaries.sort((a, b) => a - b);

  const low = salaries[0];
  const high = salaries[salaries.length - 1];
  const median = salaries[Math.floor(salaries.length / 2)];

  return {
    low: formatSalary(low),
    median: formatSalary(median),
    high: formatSalary(high)
  };
}

/**
 * Format salary for display
 */
function formatSalary(amount) {
  if (!amount) return '';
  if (amount >= 1000) {
    return '$' + Math.round(amount / 1000) + 'k';
  }
  return '$' + amount.toLocaleString();
}

/**
 * Extract common items from listings
 */
function extractCommonItems(listings, type) {
  // For now, extract common tags/keywords from listing data
  const items = {};

  listings.forEach(listing => {
    listing.tags.forEach(tag => {
      items[tag] = (items[tag] || 0) + 1;
    });
  });

  return Object.entries(items)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([item]) => item);
}

/**
 * AI-powered market estimation fallback
 */
async function aiEstimate(roleTitle, location, industry) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a recruitment market expert specializing in the Australian job market. Provide realistic, current market estimates. Return ONLY valid JSON with no explanation or markdown.`
        },
        {
          role: 'user',
          content: `Estimate the current Australian job market for: "${roleTitle}" in "${location || 'Australia'}" in the "${industry || 'general'}" industry.

Return this exact JSON structure:
{
  "similar_roles_count": <estimated number of similar active listings>,
  "salary_range_market": {
    "low": "<e.g. $80k>",
    "median": "<e.g. $100k>",
    "high": "<e.g. $130k>"
  },
  "common_benefits": ["<benefit 1>", "<benefit 2>", "<benefit 3>", "<benefit 4>", "<benefit 5>"],
  "common_requirements": ["<requirement 1>", "<requirement 2>", "<requirement 3>", "<requirement 4>"],
  "competitor_highlights": ["<insight about competition for this role>", "<market trend>"]
}`
        }
      ],
      temperature: 0.4,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();
    // Strip markdown code blocks if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(cleaned);

    return {
      similar_roles_count: data.similar_roles_count || 0,
      salary_range_market: data.salary_range_market || { low: '', median: '', high: '' },
      common_benefits: data.common_benefits || [],
      common_requirements: data.common_requirements || [],
      competitor_highlights: data.competitor_highlights || [],
      search_query_used: `AI estimate: ${roleTitle} in ${location}`,
      data_source: 'ai_estimation',
      researched_at: new Date()
    };

  } catch (error) {
    console.error('[MarketResearch] AI estimation error:', error.message);
    return {
      similar_roles_count: 0,
      salary_range_market: { low: '', median: '', high: '' },
      common_benefits: [],
      common_requirements: [],
      competitor_highlights: [],
      search_query_used: `Failed: ${roleTitle} in ${location}`,
      data_source: 'unavailable',
      researched_at: new Date()
    };
  }
}

module.exports = { research };
