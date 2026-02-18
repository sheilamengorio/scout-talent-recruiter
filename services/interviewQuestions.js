const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate role-specific interview questions
 * @param {Object} tlp - TalentPage document
 * @param {string[]} categories - Question categories to include
 * @returns {Object[]} Array of interview questions
 */
async function generate(tlp, categories = ['behavioral', 'technical', 'situational', 'culture_fit']) {
  const prompt = buildPrompt(tlp, categories);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert interviewer and recruitment specialist. Generate insightful, role-specific interview questions. Return ONLY valid JSON with no markdown or explanation.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content.trim();
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const questions = JSON.parse(cleaned);

    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('[InterviewQuestions] Generation error:', error.message);
    return [];
  }
}

function buildPrompt(tlp, categories) {
  return `Generate 8-12 tailored interview questions for this role:

Role: ${tlp.role_title || 'Not specified'}
Company: ${tlp.company_name || 'Not specified'}
Industry: ${tlp.industry || 'Not specified'}

Responsibilities:
${(tlp.responsibilities || []).map(r => '- ' + r).join('\n') || 'Not specified'}

Requirements:
${(tlp.requirements || []).map(r => '- ' + r).join('\n') || 'Not specified'}

Benefits/Culture:
${(tlp.benefits || []).map(b => '- ' + b).join('\n') || 'Not specified'}

Categories to include: ${categories.join(', ')}

Return a JSON array where each object has:
- "question": the interview question
- "category": one of "behavioral", "technical", "situational", "culture_fit"
- "rationale": brief explanation of what this question assesses (1 sentence)

Make questions specific to THIS role, not generic. Reference actual responsibilities and requirements.`;
}

module.exports = { generate };
