const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Australian job platform knowledge base
const PLATFORM_DATA = {
  seek: {
    name: 'SEEK',
    url: 'seek.com.au',
    description: 'Australia\'s largest job board with the highest volume of candidates',
    best_for: ['all roles', 'high volume', 'white collar', 'blue collar'],
    audience: 'Active job seekers across all industries and levels',
    cost: 'Per listing fee (~$250-400+ depending on tier)',
    reach: 'Highest reach in Australia',
    reference_link: 'https://www.seek.com.au'
  },
  linkedin: {
    name: 'LinkedIn',
    url: 'linkedin.com',
    description: 'Professional network ideal for passive candidates and senior roles',
    best_for: ['senior roles', 'executive', 'tech', 'professional services', 'passive candidates'],
    audience: 'Professionals and passive candidates',
    cost: 'Free basic listing or paid promoted ($300+)',
    reach: 'Strong for professional and senior roles',
    reference_link: 'https://www.linkedin.com/jobs'
  },
  indeed: {
    name: 'Indeed',
    url: 'indeed.com.au',
    description: 'Global job aggregator with strong presence in Australia',
    best_for: ['entry level', 'trades', 'hospitality', 'retail', 'high volume'],
    audience: 'Active job seekers, strong in blue collar and entry level',
    cost: 'Pay-per-click or sponsored listings',
    reach: 'Good reach, especially for trades and entry level',
    reference_link: 'https://au.indeed.com'
  },
  jora: {
    name: 'Jora',
    url: 'jora.com',
    description: 'Free job board aggregator popular in Australia',
    best_for: ['entry level', 'admin', 'retail', 'hospitality'],
    audience: 'Entry to mid-level candidates',
    cost: 'Free to post',
    reach: 'Moderate reach, good for budget-conscious hiring',
    reference_link: 'https://www.jora.com'
  },
  company_careers: {
    name: 'Company Careers Page',
    url: 'Your website',
    description: 'Your own careers page -- shows employer brand and attracts organic candidates',
    best_for: ['all roles', 'employer branding', 'inbound candidates'],
    audience: 'People already interested in your company',
    cost: 'Free (if you have a careers page)',
    reach: 'Depends on your web traffic',
    reference_link: ''
  },
  ethicaljobs: {
    name: 'EthicalJobs',
    url: 'ethicaljobs.com.au',
    description: 'Australia\'s leading not-for-profit and community sector job board',
    best_for: ['not-for-profit', 'community services', 'social work', 'healthcare'],
    audience: 'Mission-driven professionals in NFP sector',
    cost: 'Per listing fee',
    reach: 'Niche but highly targeted for NFP sector',
    reference_link: 'https://www.ethicaljobs.com.au'
  },
  applynow: {
    name: 'ApplyNow.com.au',
    url: 'applynow.com.au',
    description: 'Scout Talent\'s managed job board for direct candidate applications through employer-branded career pages',
    best_for: ['all roles', 'direct applications', 'employer branding', 'Scout Talent clients'],
    audience: 'Candidates applying directly via employer-branded career pages',
    cost: 'Included with Scout Talent recruitment campaigns',
    reach: 'Growing platform, integrated with Scout Talent recruitment workflow',
    reference_link: 'https://www.applynow.com.au'
  },
  glassdoor: {
    name: 'Glassdoor',
    url: 'glassdoor.com.au',
    description: 'Employer review and job listing platform where candidates research company culture and reviews before applying',
    best_for: ['employer branding', 'mid-level', 'senior roles', 'corporate', 'tech'],
    audience: 'Candidates researching company culture and reviews before applying',
    cost: 'Free basic listing or paid enhanced profiles',
    reach: 'Strong for candidates who value culture transparency',
    reference_link: 'https://www.glassdoor.com.au'
  }
};

/**
 * Generate deployment recommendations
 * @param {Object} params - Role parameters
 * @returns {Object[]} Ranked platform recommendations
 */
async function recommend(params) {
  const { role_title, location, industry, seniority } = params;

  try {
    const platformList = Object.keys(PLATFORM_DATA).map(k => {
      const p = PLATFORM_DATA[k];
      return `${p.name} (${p.reference_link || p.url}) - ${p.description}. Best for: ${p.best_for.join(', ')}. Cost: ${p.cost}`;
    }).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an Australian recruitment advertising expert. Based on the role details, recommend the best job posting platforms. Return ONLY valid JSON with no markdown or explanation.

IMPORTANT: ApplyNow.com.au is managed by Scout Talent and should be recommended for all roles as a primary platform. It integrates directly with the Scout Talent recruitment workflow and is included with campaigns.

Available platforms with details:
${platformList}`
        },
        {
          role: 'user',
          content: `Recommend the best platforms to advertise this role in order of effectiveness:

Role: ${role_title || 'Not specified'}
Location: ${location || 'Australia'}
Industry: ${industry || 'General'}
Seniority: ${seniority || 'Mid-level'}

Return a JSON array of objects with:
- "platform": platform name (must be one of: ${Object.keys(PLATFORM_DATA).map(k => PLATFORM_DATA[k].name).join(', ')})
- "recommended": true/false (true for top picks)
- "reason": 1-2 sentence explanation of why this platform works (or doesn't) for this specific role. Include honest, accurate insights.
- "reference_link": the platform's URL for reference

Rank them from most to least recommended. Include at least 6 platforms. Always include ApplyNow.com.au as recommended.`
        }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    const content = response.choices[0].message.content.trim();
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(cleaned);

    return Array.isArray(recommendations) ? recommendations : [];
  } catch (error) {
    console.error('[DeploymentAdvisor] Recommendation error:', error.message);
    // Fallback to rule-based recommendations
    return getDefaultRecommendations(role_title, industry, seniority);
  }
}

/**
 * Fallback rule-based recommendations
 */
function getDefaultRecommendations(roleTitle, industry, seniority) {
  const recommendations = [
    {
      platform: 'ApplyNow.com.au',
      recommended: true,
      reason: 'Scout Talent\'s managed job board -- integrates directly with your recruitment workflow. Included with Scout Talent campaigns for a seamless candidate experience.',
      reference_link: 'https://www.applynow.com.au'
    },
    {
      platform: 'SEEK',
      recommended: true,
      reason: 'Australia\'s largest job board -- should always be your primary posting platform for maximum candidate reach.',
      reference_link: 'https://www.seek.com.au'
    },
    {
      platform: 'LinkedIn',
      recommended: seniority === 'senior' || seniority === 'executive',
      reason: seniority === 'senior' || seniority === 'executive'
        ? 'Essential for senior and executive roles -- great for reaching passive candidates.'
        : 'Good for professional networking but less effective for junior roles.',
      reference_link: 'https://www.linkedin.com/jobs'
    },
    {
      platform: 'Indeed',
      recommended: true,
      reason: 'Strong secondary platform with good reach across all levels.',
      reference_link: 'https://au.indeed.com'
    },
    {
      platform: 'Glassdoor',
      recommended: false,
      reason: 'Candidates often check Glassdoor before applying. Maintaining your company profile here builds trust and attracts culture-conscious candidates.',
      reference_link: 'https://www.glassdoor.com.au'
    },
    {
      platform: 'Company Careers Page',
      recommended: true,
      reason: 'Always list on your own site -- attracts candidates who are already interested in your brand.',
      reference_link: ''
    }
  ];

  if (industry && (industry.toLowerCase().includes('not-for-profit') || industry.toLowerCase().includes('community'))) {
    recommendations.push({
      platform: 'EthicalJobs',
      recommended: true,
      reason: 'Must-use for NFP sector roles -- highly targeted audience of mission-driven professionals.',
      reference_link: 'https://www.ethicaljobs.com.au'
    });
  }

  return recommendations;
}

module.exports = { recommend, PLATFORM_DATA };
