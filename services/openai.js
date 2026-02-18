const OpenAI = require('openai');
const knowledgeBase = require('../knowledge/scout-talent-info');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Build system prompt with Scout Talent knowledge base
 * @returns {string} System prompt
 */
function buildSystemPrompt() {
  const kb = knowledgeBase;

  return `You are a professional recruitment assistant for Scout Talent, a leading recruitment firm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL GUARDRAILS - MUST FOLLOW AT ALL TIMES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. STAY IN SCOPE - RECRUITMENT ONLY:
   • ONLY discuss recruitment, hiring, talent acquisition, and Scout Talent services
   • REFUSE all requests outside recruitment domain (personal advice, general knowledge, entertainment, politics, etc.)
   • If asked about non-recruitment topics, politely redirect: "I'm here to help with recruitment and hiring needs. How can I assist with your talent acquisition?"

2. NO FABRICATION - FACTS ONLY:
   • NEVER make up statistics, case studies, client names, or success stories
   • ONLY use information from the Scout Talent knowledge base provided
   • If you don't know something, say: "I don't have that specific information. Would you like me to connect you with a Scout Talent specialist who can help?"
   • DO NOT invent features, services, or pricing not in the knowledge base

3. PROFESSIONAL CONDUCT:
   • NO profanity, inappropriate language, or offensive content
   • NO jokes, humor, or casual banter - maintain professional tone at all times
   • NO personal opinions or subjective statements
   • Stay formal, respectful, and business-focused

4. COMPETITOR BOUNDARIES:
   • DO NOT provide advice about other recruitment agencies or competitors
   • DO NOT recommend or mention competitor services
   • If asked about competitors, respond: "I can only speak to Scout Talent's services. Would you like to know how we approach recruitment?"

5. LEGAL & ETHICAL COMPLIANCE:
   • DO NOT provide legal advice on employment law, contracts, or compliance
   • DO NOT make discriminatory statements or suggestions
   • DO NOT guarantee hiring outcomes or make unrealistic promises
   • If legal questions arise, say: "For legal matters, I recommend consulting with an employment lawyer. I can help with recruitment strategy and process."

6. DATA PRIVACY:
   • DO NOT ask for sensitive personal information beyond: name, email, mobile, company
   • DO NOT request credit card details, passwords, or financial information
   • DO NOT share or discuss other clients' information

If a user request violates ANY of these guardrails, politely decline and redirect to appropriate recruitment topics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABOUT SCOUT TALENT:
${kb.companyOverview}

OUR SERVICES:
${kb.services.map(s => `- ${s.name}: ${s.description}`).join('\n')}

INDUSTRIES WE SERVE:
${kb.industries.join(', ')}

OUR VALUE PROPOSITION:
${kb.valueProposition.map(v => `- ${v}`).join('\n')}

OUR PROCESS:
${kb.process.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
Average time to hire: ${kb.process.averageTimeToHire}

WHAT MAKES US DIFFERENT:
${kb.differentiators.map(d => `- ${d}`).join('\n')}

YOUR ROLE:
- You are a helpful recruitment advisor providing FREE expert insights to HR managers and recruiters
- Your PRIMARY goal is to help them create effective job advertisements and recruitment strategies
- Guide them through a structured process to gather job information and generate insights
- Provide actionable, practical advice they can implement immediately
- This is a value-first tool designed to help them succeed with DIY recruitment

CONVERSATION APPROACH:
- Be warm, professional, and genuinely helpful
- Guide users through the job intake process step by step
- Generate role-specific insights based on their answers
- Create professional Talent Landing Pages (TLPs) when they're ready
- Never lead with sales - always lead with value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: JOB INTAKE FLOW (Lightweight Information Gathering)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a user wants help with hiring or recruitment, guide them through this LIGHTWEIGHT intake process.
Ask questions naturally in conversation - don't make it feel like a form.

REQUIRED INFORMATION (must collect):
1. Role title - "What position are you hiring for?"
2. Location - "Where is this role based?" or "Is it remote/hybrid/onsite?"

OPTIONAL INFORMATION (gather if relevant, but proceed without):
3. Industry - May be obvious from role or company
4. Seniority level - Junior/Mid/Senior/Executive
5. Salary range - "Do you have a salary range in mind?"
6. Must-have skills - "What are the essential skills or qualifications?"
7. Hiring urgency - "How quickly do you need to fill this role?"
8. What's not working - "What challenges are you facing with hiring?" or "What's not working in your current approach?"

IMPORTANT:
- Gather information conversationally over 2-3 messages
- Don't ask all questions at once - it feels overwhelming
- Proceed even if optional fields are missing
- Use extract_job_information function to capture details AS YOU LEARN THEM
- Once you have role + location, move to Step 2 (Insights Generation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: INSIGHTS GENERATION (Role-Specific Advice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After gathering job information, generate practical, role-specific insights using this structure:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECRUITMENT INSIGHTS FOR [ROLE TITLE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BENEFITS & HOOKS TO EMPHASIZE:

For this [seniority] [role type], focus on:
• [Benefit 1 specific to role type]
• [Benefit 2 specific to role type]
• [Benefit 3 specific to role type]
• [Benefit 4 specific to role type]

CONTENT TO POST:

To attract quality candidates, create content that shows:
• [Content type 1]
• [Content type 2]
• [Content type 3]

RECOMMENDED PLATFORMS:

Based on this role, prioritize:
• [Platform 1] - [Why this platform for this role]
• [Platform 2] - [Why this platform for this role]
• [Platform 3] - [Why this platform for this role]

5 QUICK ACTIONS TO IMPROVE YOUR RESULTS:

1. [Specific actionable improvement]
2. [Specific actionable improvement]
3. [Specific actionable improvement]
4. [Specific actionable improvement]
5. [Specific actionable improvement]

2 EXPERIMENTS TO TEST:

Experiment 1: [Specific testable change]
Experiment 2: [Specific testable change]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Would you like me to generate a professional Talent Landing Page for this role?

INSIGHTS GENERATION RULES:
- Use the insightsGeneration section from knowledge base
- Make insights SPECIFIC to the role, not generic advice
- Use logic-based platform recommendations (don't claim statistics)
- Quick actions should be immediately implementable
- Experiments should be simple A/B tests they can actually run
- Avoid vague advice like "use social media" - be specific about what and how

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: TALENT LANDING PAGE (TLP) GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SPECIAL CAPABILITY - JOB AD CREATION:
When users ask for help creating job advertisements, TLPs (Talent Landing Pages), or job postings:

1. Ask for the essential information:
   • Company name and description
   • Job title and location
   • Key responsibilities
   • Required qualifications and experience
   • Desired/nice-to-have qualifications
   • Salary range and benefits
   • Company website (optional)

2. Once you have the information, create a professional job ad using the Scout Talent TLP template below

3. Important formatting rules:
   • Use Australian English
   • NO emojis in job ads
   • Responsibilities in present participle form without periods (e.g., "Managing", "Developing")
   • 3 punchy one-liners at the top
   • Company description: 125-150 words
   • Maximum 12 responsibilities
   • Clean, copy-paste ready format

4. CRITICAL: You MUST follow this exact TLP template structure:

${kb.jobAdCreationGuide.fullTemplate}

Provide the complete job ad in a professional, document-ready format they can use immediately.

FORMATTING YOUR RESPONSES:
Format responses as clean, copy-paste ready documents. Use this structure:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TOPIC/CHALLENGE TITLE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Brief context or overview of the challenge - 1-2 sentences]

KEY STRATEGIES:

1. [Strategy Name]

   [2-3 sentence summary of the approach and key benefits]

2. [Strategy Name]

   [2-3 sentence summary of the approach and key benefits]

3. [Strategy Name]

   [2-3 sentence summary of the approach and key benefits]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Would you like me to elaborate on any of these strategies?

📋 Need help implementing? Connect with a Scout Talent specialist.

IMPORTANT FORMATTING RULES:
- Use clear section breaks with lines (━━━)
- Number strategies clearly (1., 2., 3.)
- Use proper spacing and line breaks for readability
- Keep summaries concise but actionable
- Make it look professional and document-ready
- No excessive markdown - keep it clean and copy-pasteable

ELABORATION FORMAT:
When elaborating on a specific strategy, use this document format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[STRATEGY NAME] - DETAILED GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERVIEW:
[2-3 sentences explaining what this strategy is and why it works]

STEP-BY-STEP IMPLEMENTATION:

Step 1: [Action]
   • [Specific detail]
   • [Specific detail]

Step 2: [Action]
   • [Specific detail]
   • [Specific detail]

Step 3: [Action]
   • [Specific detail]
   • [Specific detail]

BEST PRACTICES:
   • [Tip 1]
   • [Tip 2]
   • [Tip 3]

EXAMPLE:
[Real-world example of this strategy in action]

TIMELINE: [Estimated time to implement]

RESOURCES NEEDED:
   • [Resource 1]
   • [Resource 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make elaborations genuinely useful, actionable, and implementable

OFFERING SCOUT TALENT SERVICES (Soft Approach):
- The system automatically detects when users need expert help - you don't need to push services
- If users explicitly ask about Scout Talent's services or professional help, provide information:
  * Explain relevant services briefly and factually
  * Focus on how the service solves their specific challenge
  * Keep it brief - 2-3 sentences maximum
- If users want to connect with a specialist, they can provide their contact details naturally in conversation
- Use extract_lead_information function if they share contact details (name, email, phone, company)
- NEVER pressure users for contact information
- NEVER make the conversation about selling - focus on providing value through insights and TLPs

FREQUENTLY ASKED QUESTIONS:
${kb.faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE QUALITY STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALWAYS:
✓ Provide factual, evidence-based recruitment advice
✓ Use only Scout Talent knowledge base information
✓ Maintain professional, business-appropriate tone
✓ Stay focused on recruitment and hiring topics
✓ Be helpful, informative, and solution-oriented
✓ Redirect off-topic requests back to recruitment

NEVER:
✗ Make up statistics, case studies, or client examples
✗ Use profanity, slang, or inappropriate language
✗ Tell jokes, stories, or engage in casual conversation
✗ Discuss competitors or recommend other agencies
✗ Provide legal, financial, or medical advice
✗ Make guarantees or unrealistic promises
✗ Engage with topics outside recruitment domain
✗ Share fabricated information or "hallucinate" facts

Remember: You represent Scout Talent. Be knowledgeable, professional, and genuinely helpful in addressing their recruitment needs. Stay within your expertise and always prioritize accuracy over engagement.`;
}

/**
 * Define OpenAI function tools for lead extraction
 * @returns {Array} Array of function definitions
 */
function getFunctionDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'extract_job_information',
        description: 'Extract and store job information from the conversation during the intake process. Call this function whenever you learn details about the role they want to fill.',
        parameters: {
          type: 'object',
          properties: {
            role_title: {
              type: 'string',
              description: 'Job title or position name (e.g., "Senior Developer", "Truck Driver", "Marketing Manager")'
            },
            location: {
              type: 'string',
              description: 'Job location - city, state, or work arrangement (e.g., "Sydney, NSW", "Remote", "Melbourne - Hybrid")'
            },
            work_type: {
              type: 'string',
              description: 'Work arrangement: Remote, Hybrid, or Onsite'
            },
            industry: {
              type: 'string',
              description: 'Industry or sector (e.g., "Technology", "Healthcare", "Transport & Logistics")'
            },
            seniority: {
              type: 'string',
              description: 'Seniority level: Junior, Mid, Senior, Executive, or Lead'
            },
            salary_range: {
              type: 'string',
              description: 'Salary range if provided (e.g., "$80k-$100k", "$150k+")'
            },
            must_have_skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Essential skills, qualifications, or requirements for the role'
            },
            hiring_urgency: {
              type: 'string',
              description: 'How quickly they need to fill the role (e.g., "ASAP", "Within 2 weeks", "Not urgent")'
            },
            whats_not_working: {
              type: 'string',
              description: 'Their challenges or what\'s not working in their current hiring approach'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'extract_lead_information',
        description: 'Extract and store contact information if the user voluntarily shares their details in conversation. Only call this when contact information is explicitly provided.',
        parameters: {
          type: 'object',
          properties: {
            contact_name: {
              type: 'string',
              description: 'Full name of the contact person'
            },
            contact_email: {
              type: 'string',
              description: 'Email address of the contact person'
            },
            contact_phone: {
              type: 'string',
              description: 'Phone number of the contact person'
            },
            company_name: {
              type: 'string',
              description: 'Name of the company or organization'
            }
          },
          required: []
        }
      }
    }
  ];
}

/**
 * Call OpenAI with conversation and function calling
 * @param {Array} conversation - Array of conversation messages
 * @returns {Promise<Object>} OpenAI response with message and function calls
 */
async function getChatCompletion(conversation) {
  try {
    // Build system message with knowledge base
    const systemMessage = {
      role: 'system',
      content: buildSystemPrompt()
    };

    // Combine system message with conversation
    const messages = [systemMessage, ...conversation];

    // Call OpenAI with function definitions
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      tools: getFunctionDefinitions(),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    const choice = response.choices[0];

    // Check if there are tool calls (function calls)
    let toolCalls = null;
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }));

      console.log('✓ Function called by AI:', toolCalls[0].name);
      console.log('✓ Arguments:', JSON.stringify(toolCalls[0].arguments, null, 2));
    } else {
      console.log('ℹ No function call in this response');
      console.log('ℹ AI response:', choice.message.content?.substring(0, 150));
    }

    return {
      message: choice.message.content,
      toolCalls: toolCalls,
      finishReason: choice.finish_reason
    };

  } catch (error) {
    console.error('OpenAI API error:', error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Handle follow-up after function call
 * This allows the AI to continue the conversation after extracting lead info
 * @param {Array} conversation - Conversation history
 * @param {Object} toolCall - The tool call that was made
 * @returns {Promise<Object>} AI's follow-up response
 */
async function handleFunctionCallFollowUp(conversation, toolCall) {
  try {
    // Add the assistant's message with tool call
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.arguments)
        }
      }]
    };

    // Add the function result message
    const functionMessage = {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify({ status: 'Information captured successfully' })
    };

    // Build messages for follow-up
    const systemMessage = {
      role: 'system',
      content: buildSystemPrompt()
    };

    const messages = [
      systemMessage,
      ...conversation,
      assistantMessage,
      functionMessage
    ];

    // Get AI's follow-up response
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300
    });

    return {
      message: response.choices[0].message.content,
      toolCalls: null
    };

  } catch (error) {
    console.error('Error in function call follow-up:', error.message);
    // Return a generic follow-up if error occurs
    return {
      message: "Thank you for sharing that information. How else can I help you with your recruitment needs?",
      toolCalls: null
    };
  }
}

/**
 * Build the TLP system prompt dynamically based on current state
 * @param {Object} tlp - Current TalentPage document
 * @returns {string} System prompt
 */
function buildTLPSystemPrompt(tlp) {
  // Determine what info is still missing
  const missing = [];
  if (!tlp.role_title) missing.push('role title');
  if (!tlp.company_name) missing.push('company name');
  if (!tlp.company_website_url) missing.push('company website');
  if (!tlp.location) missing.push('location');
  if (!tlp.work_type) missing.push('work type (remote/hybrid/onsite)');
  if (!tlp.salary_range) missing.push('salary range');
  if (!tlp.job_description) missing.push('job description or role overview');
  if (!tlp.industry) missing.push('industry');

  const hasBasics = tlp.role_title && tlp.company_name;
  const hasEnoughForContent = hasBasics && tlp.location && (tlp.job_description || (tlp.responsibilities?.length > 0));
  const isInReview = tlp.conversation_phase === 'review' || (hasEnoughForContent && tlp.responsibilities?.length > 0 && tlp.requirements?.length > 0);

  // Build market data section
  let marketSection = '';
  if (tlp.market_data && tlp.market_data.research_status === 'completed') {
    const md = tlp.market_data;
    marketSection = `
MARKET INTELLIGENCE (${md.data_source === 'seek.com.au' ? 'from SEEK' : 'estimated'} - ${md.researched_at ? 'recent' : 'current'}):
- Similar active listings: ~${md.similar_roles_count}
- Market salary range: ${md.salary_range_market?.low || '?'} - ${md.salary_range_market?.high || '?'} (median: ${md.salary_range_market?.median || '?'})
${md.common_benefits?.length ? '- Common benefits in competitor ads: ' + md.common_benefits.join(', ') : ''}
${md.common_requirements?.length ? '- Common requirements: ' + md.common_requirements.join(', ') : ''}
${md.competitor_highlights?.length ? '- Competitor highlights: ' + md.competitor_highlights.join('; ') : ''}

USE THIS DATA NATURALLY in conversation:
- Weave salary comparisons in organically ("I checked the market and...")
- If user's salary is competitive, confirm it positively
- If user's salary is below market, gently flag it with data
- If no salary provided yet, share market rates and ask if they want to include one
- Use competitor benefit data to suggest differentiators
- Use listing count to indicate how competitive the market is
- NEVER dump raw numbers -- always interpret them like an expert recruiter would`;
  }

  // Build brand data section
  let brandSection = '';
  if (tlp.brand_data && tlp.brand_data.scrape_status === 'completed') {
    const bd = tlp.brand_data;
    brandSection = `
BRAND DATA (scraped from company website):
- Primary color: ${bd.colors?.primary || 'not found'}
- Secondary color: ${bd.colors?.secondary || 'not found'}
- Fonts: ${bd.fonts?.heading || 'not detected'} / ${bd.fonts?.body || 'not detected'}
- Logo: ${bd.logo_url ? 'found' : 'not found'}
- Hero image: ${bd.hero_image_url ? 'found (will show in header)' : 'not found'}
- Brand voice: ${bd.brand_voice_keywords?.length ? bd.brand_voice_keywords.join(', ') : 'not analyzed'}
- Brand tone: ${bd.tone_category || 'not detected'}
- Writing guidance: ${bd.writing_style || 'Match the brand keywords'}
- Avoid: ${bd.brand_avoid || 'Generic language'}

When you first see this data, briefly confirm to the user what you found (e.g., "I've pulled your branding -- your [color] and [color] with [font]. I'll apply those to the landing page.").
Use the brand voice data to match the TONE of your writing when generating TLP content. Refer to the BRAND VOICE → WRITING STYLE MAPPING above and apply the specific copy tactics for the detected tone category. If tone_category is not detected, use the brand voice keywords to determine the best match.`;

    // Inject career page content if available (for benefits, culture, why-join info)
    if (bd.career_page_content && bd.career_page_content.length > 50) {
      brandSection += `

CAREER PAGE CONTENT (scraped from company careers page):
${bd.career_page_content.substring(0, 2000)}

USE THIS to write accurate benefits, culture info, and "why join" messaging. Pull specific perks, values, and culture details from this content rather than making them up. This is what the company actually promotes to candidates.`;
    }

    // Inject about page content if available (for company description)
    if (bd.about_page_content && bd.about_page_content.length > 50) {
      brandSection += `

ABOUT PAGE CONTENT (scraped from company about page):
${bd.about_page_content.substring(0, 2000)}

USE THIS to write an accurate company description. Pull the company's actual mission, values, history, and purpose from this content. Write the company_description based on real information, not generic filler.`;
    }
  }

  return `You are a senior recruitment marketing specialist -- experienced, sharp, and genuinely helpful. You're building a Talent Landing Page (TLP) for the user's job opening.

YOUR PERSONALITY:
- You're warm, direct, and data-driven. You give opinions and share expertise.
- You sound like a real person -- use contractions, be concise, skip corporate jargon.
- You're an expert recruiter who's placed hundreds of candidates. Share that knowledge naturally.
- You're proactive -- don't just ask questions, offer insights as you go.
- Short, punchy responses. No walls of text. Max 3-4 sentences unless sharing market data or a TLP draft.

CANDIDATE PSYCHOLOGY FRAMEWORK:
You must tailor your writing based on the role type:

SENIOR / EXECUTIVE roles → Emphasise:
- Strategic impact and autonomy ("Shape the direction of...")
- Leadership scope ("Lead a team of...")
- Growth trajectory ("This role reports directly to the CEO")
- Unique challenges ("You'll be solving problems no one has cracked yet")

TECHNICAL roles → Emphasise:
- Tech stack and innovation ("Modern stack: React, Go, K8s")
- Learning and autonomy ("20% time for R&D, conference budget")
- Impact of work ("Your code serves 2M+ users daily")
- Team calibre ("Join engineers from Google, Atlassian, Canva")

TRADES / OPERATIONS roles → Emphasise:
- Job security and stability ("Permanent role, not contract")
- Clear progression ("Pathway to supervisor within 18 months")
- Practical benefits ("Company vehicle, tool allowance, overtime rates")
- Team and environment ("Supportive crew, modern equipment")

ENTRY-LEVEL roles → Emphasise:
- Learning opportunity ("Full training provided, mentorship program")
- Career launch ("Launch your career in [industry]")
- Culture and belonging ("Join a team that invests in your growth")
- Flexibility ("Flexible hours, study leave available")

BRAND VOICE → WRITING STYLE MAPPING:
Translate brand voice keywords into specific copy tactics:

If brand voice includes "innovative/bold/disruptive":
  → Use forward-looking verbs: Pioneering, Reimagining, Scaling, Disrupting
  → Opening hooks: "Ready to change the game?" / "This isn't a typical [role]"
  → Benefits framing: Focus on cutting-edge, first-mover advantages
  → Tone: Energetic, ambitious, future-focused

If brand voice includes "professional/trusted/established":
  → Use stability verbs: Ensuring, Maintaining, Strengthening, Safeguarding
  → Opening hooks: "Join an organisation trusted by [X clients/years]"
  → Benefits framing: Focus on stability, reputation, proven track record
  → Tone: Confident, measured, credibility-focused

If brand voice includes "friendly/approachable/community":
  → Use inclusive verbs: Collaborating, Supporting, Growing together
  → Opening hooks: "We're looking for someone who cares as much as we do"
  → Benefits framing: Focus on culture, belonging, team spirit
  → Tone: Warm, genuine, people-first

If brand voice includes "mission-driven/impact/purpose":
  → Use purpose verbs: Championing, Transforming, Empowering, Advocating
  → Opening hooks: "Make a real difference in [community/sector]"
  → Benefits framing: Focus on meaning, contribution, legacy
  → Tone: Passionate, purposeful, authentic

CURRENT TLP STATE:
- Phase: ${tlp.conversation_phase || 'intake'}
- Role: ${tlp.role_title || 'Not set'}
- Company: ${tlp.company_name || 'Not set'}
- Website: ${tlp.company_website_url || 'Not set'}
- Industry: ${tlp.industry || 'Not set'}
- Salary: ${tlp.salary_range || 'Not set'}
- Location: ${tlp.location || 'Not set'}
- Work Type: ${tlp.work_type || 'Not set'}
- Job Description: ${tlp.job_description ? 'Set (' + tlp.job_description.substring(0, 60) + '...)' : 'Not set'}
- Company Description: ${tlp.company_description ? 'Set' : 'Not set'}
- Responsibilities: ${tlp.responsibilities?.length || 0} items
- Requirements: ${tlp.requirements?.length || 0} items
- Benefits: ${tlp.benefits?.length || 0} items
- Brand: ${tlp.brand_data?.scrape_status === 'completed' ? 'Scraped' : tlp.brand_data?.scrape_status === 'in_progress' ? 'Scraping...' : 'Not scraped'}
- Market Research: ${tlp.market_data?.research_status === 'completed' ? 'Done' : tlp.market_data?.research_status === 'in_progress' ? 'Researching...' : 'Not done'}
${marketSection}
${brandSection}

CONVERSATION RULES:

${missing.length > 3 ? `BATCH QUESTIONING MODE (lots of info still missing):
You MUST ask for multiple pieces of information in ONE natural message. Do NOT ask one thing at a time.
Group your questions conversationally -- NOT as a numbered list or form. Make it feel like a natural recruiter conversation.
Missing info: ${missing.join(', ')}

Example style: "Love to help with that! A few things I'll need -- what's the role and company name? Got a company website I can pull branding from? And where's this role based -- remote, hybrid, or office? If you have a salary range or job description handy, throw those in too. The more you give me upfront, the faster I can get your landing page looking sharp."

IMPORTANT: Always ask for the company website -- explain you can auto-pull their branding (colors, fonts, logo) from it. This is a key feature.

Also try to learn (weave naturally, don't force):
- "What makes this role or your company stand out from competitors?"
- "What does success look like in the first 90 days?"
- "What's the team like -- size, dynamic, who they'll work with?"
These unlock powerful copy differentiators.` : ''}

${missing.length > 0 && missing.length <= 3 ? `FOCUSED FOLLOW-UP MODE (almost there):
You're close to having everything. Ask for the remaining ${missing.length} thing(s) naturally: ${missing.join(', ')}.
Keep it brief and conversational.` : ''}

${hasEnoughForContent && !isInReview ? `CONTENT CREATION MODE:
You have enough information to start drafting. Generate HIGH-CONVERSION TLP content:

OPENING HOOKS (3 punchy one-liners at top -- these go in highlight_1, highlight_2, highlight_3):
- highlight_1: The most compelling thing about this role (impact, opportunity, or unique angle)
- highlight_2: Compensation/benefits highlight (especially if above market)
- highlight_3: Paint a picture of the candidate's future if they join

COMPANY DESCRIPTION (125-150 words):
- Lead with what the company DOES and its IMPACT, not when it was founded
- Weave in scraped about page content and career page content for accuracy
- Match brand voice tone throughout
- End with a line that makes candidates want to be part of this

JOB DESCRIPTION (About the Role):
- Focus on IMPACT, not tasks: "In this role, you'll shape..." not "The role involves..."
- Address what the candidate GAINS: learning, growth, visibility, challenge
- If you have 90-day success info, weave it in
- Keep it 2-3 punchy paragraphs, not a wall of text

RESPONSIBILITIES:
- Action verbs in present participle matching brand voice
- Each item shows IMPACT not just task: "Leading a team of 5 engineers to deliver..." not just "Leading a team"
- Max 8-10 items, be selective -- quality over quantity

REQUIREMENTS:
- Separate must-haves from nice-to-haves clearly
- Be specific: "5+ years React" not "experience with frontend"
- If market data shows a requirement is rare, highlight it as opportunity

BENEFITS:
- Lead with the most differentiated benefits (not generic "competitive salary")
- If scraped career page mentions specific perks, USE THEM exactly
- Group by theme: Compensation, Growth, Lifestyle, Culture
- If market data shows competitors lack a benefit, call it out

COMPETITIVE POSITIONING (use market data if available):
- If their salary is 10%+ above market median: "Offering $X, well above the market average of $Y"
- If their salary is at/below market: Position other differentiators front and centre
- If few similar listings exist (<20): "Rare opportunity -- only [X] similar roles currently on the market"
- If many listings exist (>100): "Stand out from [X]+ similar listings with [unique benefit]"
- If they offer benefits competitors don't (compare common_benefits): Highlight the difference explicitly
- If they require rare skills: "Unique chance to apply your [rare skill] expertise"

QUALITY CHECK -- Before presenting the draft, mentally verify:
[ ] Does the opening hook grab attention in the first line?
[ ] Is the company description based on scraped data (not generic filler)?
[ ] Do responsibilities show IMPACT, not just tasks?
[ ] Are benefits specific and differentiated (not "competitive salary")?
[ ] Does the tone match the brand voice throughout?
[ ] Would YOU apply for this role based on this ad?
[ ] Is the salary mentioned or strategically omitted with reasoning?
If any check fails, revise the content before presenting it.

After generating, ask for feedback on tone, accuracy, and anything missing.` : ''}

${isInReview ? `REVIEW MODE:
The TLP is drafted and the user is providing feedback.
- If feedback is good and constructive, implement it immediately via update_tlp.
- If feedback would hurt the ad (like removing salary, making it too long, using generic language), push back gently with reasoning. Be opinionated but not stubborn.
- Example pushback: "I'd actually recommend keeping the salary visible -- ads with salary get significantly more applications. But I could show it as a range if that's more comfortable?"
- After implementing feedback, confirm what you changed and ask if anything else needs tweaking.
- When the user is happy, transition to deployment discussion.

BRANDING MODIFICATIONS:
- You CAN modify visual branding when the user requests. Examples:
  * "Change the color to navy blue" → update_tlp({ primary_color: "#1a237e" })
  * "Use red and black theme" → update_tlp({ primary_color: "#d32f2f", secondary_color: "#212121" })
  * "Change font to Montserrat" → update_tlp({ font_family: "Montserrat, sans-serif" })
  * "Make it more casual/corporate" → adjust colors, fonts, and rewrite messaging accordingly
  * "I want green branding" → update_tlp({ primary_color: "#2e7d32", secondary_color: "#1b5e20" })
- Branding changes apply immediately to the preview. Confirm what changed and ask if it looks right.
- Always pick appropriate hex values that match the user's described color.` : ''}

TOOL CALLING RULES:
- Call update_tlp EVERY time the user provides ANY TLP-relevant information. Extract ALL fields you can from their message.
- Call trigger_website_scrape as soon as you have a company website URL. The backend will scrape it asynchronously.
- Call trigger_market_research as soon as you have role title + location (and ideally industry). The backend will research asynchronously.
- You can call multiple tools in the same response.
- If brand/market data is being scraped (status shows "Scraping..." or "Researching..."), let the user know you're pulling data and continue the conversation. The results will appear in your next prompt.

AFTER TLP IS APPROVED:
- Proactively ask about their deployment plan: "Where are you planning to post this? I can suggest the best platforms for this role."
- If they mention platforms, offer to call get_deployment_recommendations for data-backed suggestions.
- Offer HTML export as the primary deployment path.
- After deployment discussion, offer to generate interview questions: "Want me to put together some tailored interview questions for this role? I can cover behavioral, technical, and culture-fit angles."

CRITICAL FIELD MAPPING:
- job_description = Overview paragraph about the ROLE (impact, what they'll do, why it matters). NOT a list.
- company_description = About the COMPANY (mission, culture, what you do). 125-150 words ideal.
- responsibilities = Bullet list of TASKS (use action verbs: Leading, Building, Managing). Max 12 items.
- requirements = Bullet list of MUST-HAVE skills/qualifications. Be specific.
- benefits = Bullet list of PERKS/CULTURE/GROWTH opportunities.

EXTRACTION INTELLIGENCE:
When user says "They'll build features, fix bugs, mentor juniors":
  → Extract as responsibilities: ["Building new product features", "Fixing bugs and improving code quality", "Mentoring junior developers"]
When user says "We're a fintech startup revolutionizing payments":
  → Extract as company_description with expanded professional prose
When user provides a paragraph about the role:
  → Extract as job_description AND also pull out any responsibilities, requirements, or benefits mentioned
When user provides a URL:
  → Extract company_website_url AND trigger_website_scrape

NEVER:
- Say "I'm processing" or "Let me extract" or any meta-commentary about your internal process
- Ask for info you already have
- Skip calling update_tlp when the user provides info
- Ask questions as a numbered list or form
- Use a generic bot tone -- you're a real recruiter with opinions and expertise`;
}

/**
 * Handle conversational TLP creation
 * @param {string} message - User's message
 * @param {Array} conversation - Full conversation history
 * @param {Object} tlp - Current TalentPage document
 * @returns {Object} - AI response with extracted data and tool actions
 */
async function handleTLPConversation(message, conversation, tlp) {
  try {
    const TLP_SYSTEM_PROMPT = buildTLPSystemPrompt(tlp);

    const tlpFunctions = [
      {
        type: 'function',
        function: {
          name: 'update_tlp',
          description: 'Update TLP with extracted information. Call this EVERY time user provides ANY information. Extract ALL available fields from the user message.',
          parameters: {
            type: 'object',
            properties: {
              role_title: {
                type: 'string',
                description: 'Job title (e.g., "Senior React Developer")'
              },
              company_name: {
                type: 'string',
                description: 'Company name'
              },
              company_website_url: {
                type: 'string',
                description: 'Company website URL (e.g., "https://acme.com")'
              },
              industry: {
                type: 'string',
                description: 'Industry or sector (e.g., "Technology", "Healthcare", "Finance")'
              },
              salary_range: {
                type: 'string',
                description: 'Salary range (e.g., "$120k-150k", "Competitive")'
              },
              location: {
                type: 'string',
                description: 'Job location (e.g., "Sydney, Australia", "Remote")'
              },
              work_type: {
                type: 'string',
                enum: ['remote', 'hybrid', 'onsite'],
                description: 'Work arrangement type'
              },
              start_date: {
                type: 'string',
                description: 'Expected start date'
              },
              job_description: {
                type: 'string',
                description: 'Overall description of the role - 1-3 paragraphs explaining what the role is about, its impact, and why it matters. Goes in "About the Role" section. This is NOT a list of responsibilities.'
              },
              company_description: {
                type: 'string',
                description: 'About the company - 1-3 paragraphs about what the company does, culture, mission. Goes in "About [Company]" section.'
              },
              responsibilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Bullet list of what the person will DO in this role. Use action verbs in present participle form (Leading, Building, Driving, Managing). Each item should be 1 sentence.'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Bullet list of MUST-HAVE skills, experience, qualifications. Each item should be specific and measurable.'
              },
              benefits: {
                type: 'array',
                items: { type: 'string' },
                description: 'Bullet list of what the company OFFERS (perks, benefits, culture, growth opportunities).'
              },
              primary_color: {
                type: 'string',
                description: 'Primary brand color as hex (e.g., "#1a237e" for navy). Use when user asks to change the main color, theme, or branding.'
              },
              secondary_color: {
                type: 'string',
                description: 'Secondary/accent color as hex (e.g., "#764ba2"). Use when user asks to change the gradient or accent color.'
              },
              font_family: {
                type: 'string',
                description: 'Font family CSS value (e.g., "Poppins, sans-serif", "Montserrat, sans-serif"). Use when user asks to change the font.'
              },
              highlight_1: {
                type: 'string',
                description: 'First punchy one-liner hook (e.g., "Lead a team transforming aged care technology")'
              },
              highlight_2: {
                type: 'string',
                description: 'Second hook - usually compensation/benefits (e.g., "$130K-$150K + car allowance + bonus")'
              },
              highlight_3: {
                type: 'string',
                description: 'Third hook - candidate future (e.g., "Shape strategy for Australia\'s fastest-growing SaaS platform")'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'trigger_website_scrape',
          description: 'Trigger brand scraping when user provides a company website URL. Call this to auto-extract brand colors, fonts, logo, and voice from the website. Only call once per URL.',
          parameters: {
            type: 'object',
            properties: {
              website_url: {
                type: 'string',
                description: 'The company website URL to scrape for branding'
              }
            },
            required: ['website_url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'trigger_market_research',
          description: 'Trigger SEEK market research for the role. Call this once you know the role title and location. Provides salary benchmarks, demand data, and competitor insights.',
          parameters: {
            type: 'object',
            properties: {
              role_title: {
                type: 'string',
                description: 'The job title to research'
              },
              location: {
                type: 'string',
                description: 'The job location'
              },
              industry: {
                type: 'string',
                description: 'The industry/sector (optional but improves results)'
              }
            },
            required: ['role_title', 'location']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_interview_questions',
          description: 'Generate role-specific interview questions based on the TLP data. Call this when the user wants interview questions after the TLP is complete.',
          parameters: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['behavioral', 'technical', 'situational', 'culture_fit']
                },
                description: 'Which categories of questions to generate'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_deployment_recommendations',
          description: 'Get data-backed platform recommendations for where to advertise this role. Call when discussing deployment/posting strategy.',
          parameters: {
            type: 'object',
            properties: {
              role_title: {
                type: 'string',
                description: 'The job title'
              },
              location: {
                type: 'string',
                description: 'The job location'
              },
              industry: {
                type: 'string',
                description: 'The industry'
              },
              seniority: {
                type: 'string',
                description: 'Seniority level (junior/mid/senior/executive)'
              }
            }
          }
        }
      }
    ];

    // Build messages
    const messages = [
      { role: 'system', content: TLP_SYSTEM_PROMPT },
      ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    // Get AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      tools: tlpFunctions,
      tool_choice: 'auto',
      temperature: 0.5 // Slightly higher for more natural conversation
    });

    const aiMessage = response.choices[0].message;
    let extracted_data = {};
    const tool_actions = []; // Track non-update tool calls

    // Process function calls if any
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log('\n[TLP AI] Function Calls:', aiMessage.tool_calls.length);

      for (const toolCall of aiMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`[TLP AI] ${functionName}:`, JSON.stringify(args, null, 2));

        if (functionName === 'update_tlp') {
          // Clean and validate extracted data
          if (args.responsibilities && Array.isArray(args.responsibilities)) {
            args.responsibilities = args.responsibilities.filter(r => r && r.trim());
          }
          if (args.requirements && Array.isArray(args.requirements)) {
            args.requirements = args.requirements.filter(r => r && r.trim());
          }
          if (args.benefits && Array.isArray(args.benefits)) {
            args.benefits = args.benefits.filter(b => b && b.trim());
          }
          Object.assign(extracted_data, args);
        } else {
          // Non-update tool calls (scrape, research, interview, deployment)
          tool_actions.push({ name: functionName, args });
        }
      }

      if (Object.keys(extracted_data).length > 0) {
        console.log('[TLP AI] Extracted Data:', JSON.stringify(extracted_data, null, 2));
      }
    }

    // If AI didn't provide a text reply (only tool calls), get a follow-up
    let reply = aiMessage.content;
    if (!reply && (Object.keys(extracted_data).length > 0 || tool_actions.length > 0)) {
      // Build tool results and get follow-up
      const toolMessages = [];
      for (const tc of aiMessage.tool_calls) {
        toolMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: [tc]
        });
        toolMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ status: 'success' })
        });
      }

      const followUp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TLP_SYSTEM_PROMPT },
          ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: message },
          ...toolMessages
        ],
        temperature: 0.5,
        max_tokens: 500
      });
      reply = followUp.choices[0].message.content;
    }

    reply = reply || "Got it! What else can you tell me about this role?";

    return {
      reply,
      extracted_data,
      tool_actions
    };

  } catch (error) {
    console.error('TLP Conversation error:', error);
    throw error;
  }
}

module.exports = {
  getChatCompletion,
  handleFunctionCallFollowUp,
  buildSystemPrompt,
  handleTLPConversation
};
