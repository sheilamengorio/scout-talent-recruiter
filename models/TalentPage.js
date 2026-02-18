const mongoose = require('mongoose');

const talentPageSchema = new mongoose.Schema({
  // Job details
  role_title: { type: String, default: '' },
  salary_range: { type: String, default: '' },
  start_date: { type: String, default: '' },
  location: { type: String, default: '' },
  work_type: { type: String, enum: ['remote', 'hybrid', 'onsite', ''], default: '' },

  // Company info
  company_name: { type: String, default: '' },
  company_description: { type: String, default: '' },
  company_logo_url: { type: String, default: '' },
  company_website_url: { type: String, default: '' },
  industry: { type: String, default: '' },

  // TLP content
  job_description: { type: String, default: '' },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  benefits: [{ type: String }],

  // Brand data (scraped from company website)
  brand_data: {
    scrape_status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
    scraped_at: { type: Date },
    colors: {
      primary: { type: String, default: '' },
      secondary: { type: String, default: '' },
      accent: { type: String, default: '' },
      background: { type: String, default: '' },
      text: { type: String, default: '' }
    },
    fonts: {
      heading: { type: String, default: '' },
      body: { type: String, default: '' },
      google_fonts_url: { type: String, default: '' }
    },
    logo_url: { type: String, default: '' },
    brand_voice_keywords: [{ type: String }],
    raw_meta_description: { type: String, default: '' },
    hero_image_url: { type: String, default: '' },
    career_page_content: { type: String, default: '' },
    about_page_content: { type: String, default: '' },
    scraped_images: [{ url: String, alt: String, source: String }],
    tone_category: { type: String, default: '' },
    writing_style: { type: String, default: '' },
    brand_avoid: { type: String, default: '' }
  },

  // Highlight hooks (3 punchy one-liners)
  highlight_1: { type: String, default: '' },
  highlight_2: { type: String, default: '' },
  highlight_3: { type: String, default: '' },

  // Market research data (from SEEK or AI estimation)
  market_data: {
    research_status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
    researched_at: { type: Date },
    similar_roles_count: { type: Number, default: 0 },
    salary_range_market: {
      low: { type: String, default: '' },
      median: { type: String, default: '' },
      high: { type: String, default: '' }
    },
    common_benefits: [{ type: String }],
    common_requirements: [{ type: String }],
    competitor_highlights: [{ type: String }],
    search_query_used: { type: String, default: '' },
    data_source: { type: String, default: '' }
  },

  // Interview questions
  interview_questions: [{
    question: { type: String },
    category: { type: String, enum: ['behavioral', 'technical', 'situational', 'culture_fit'] },
    rationale: { type: String }
  }],

  // Deployment platform recommendations
  deployment_platforms: [{
    platform: { type: String },
    recommended: { type: Boolean, default: false },
    reason: { type: String }
  }],

  // Conversation phase tracking
  conversation_phase: {
    type: String,
    enum: ['intake', 'researching', 'content_creation', 'review', 'deployment', 'complete'],
    default: 'intake'
  },

  // Styling
  primary_color: { type: String, default: '#667eea' },
  secondary_color: { type: String, default: '#764ba2' },
  font_family: { type: String, default: 'Arial, sans-serif' },
  template_style: { type: String, enum: ['default', 'modern', 'minimal'], default: 'default' },

  // Generated content
  generated_html: { type: String, default: '' },

  // Conversation history
  conversation_history: [{
    role: { type: String, enum: ['user', 'assistant', 'system'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // Deployment
  deployment_status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  deployed_url: { type: String, default: '' },
  deployed_at: { type: Date },

  // Tracking
  view_count: { type: Number, default: 0 },
  application_count: { type: Number, default: 0 },

  // Metadata
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update updated_at before saving
talentPageSchema.pre('save', function() {
  this.updated_at = Date.now();
});

module.exports = mongoose.model('TalentPage', talentPageSchema);
