/**
 * In-memory storage for TLP data when MongoDB is not available
 * This is a fallback solution for development/testing
 */

class MemoryStorage {
  constructor() {
    this.tlps = new Map();
    this.nextId = 1;
  }

  /**
   * Create a new TLP
   */
  create(data = {}) {
    const id = `tlp_${this.nextId++}`;
    const tlp = {
      _id: id,
      // Job details
      role_title: data.role_title || '',
      salary_range: data.salary_range || '',
      start_date: data.start_date || '',
      location: data.location || '',
      work_type: data.work_type || '',

      // Company info
      company_name: data.company_name || '',
      company_description: data.company_description || '',
      company_logo_url: data.company_logo_url || '',
      company_website_url: data.company_website_url || '',
      industry: data.industry || '',

      // TLP content
      job_description: data.job_description || '',
      responsibilities: data.responsibilities || [],
      requirements: data.requirements || [],
      benefits: data.benefits || [],

      // Brand data (scraped from company website)
      brand_data: data.brand_data || {
        scrape_status: 'pending',
        scraped_at: null,
        colors: { primary: '', secondary: '', accent: '', background: '', text: '' },
        fonts: { heading: '', body: '', google_fonts_url: '' },
        logo_url: '',
        brand_voice_keywords: [],
        raw_meta_description: '',
        hero_image_url: '',
        career_page_content: '',
        about_page_content: '',
        scraped_images: [],
        tone_category: '',
        writing_style: '',
        brand_avoid: ''
      },

      // Highlight hooks
      highlight_1: data.highlight_1 || '',
      highlight_2: data.highlight_2 || '',
      highlight_3: data.highlight_3 || '',

      // Market research data
      market_data: data.market_data || {
        research_status: 'pending',
        researched_at: null,
        similar_roles_count: 0,
        salary_range_market: { low: '', median: '', high: '' },
        common_benefits: [],
        common_requirements: [],
        competitor_highlights: [],
        search_query_used: '',
        data_source: ''
      },

      // Interview questions
      interview_questions: data.interview_questions || [],

      // Deployment platform recommendations
      deployment_platforms: data.deployment_platforms || [],

      // Conversation phase
      conversation_phase: data.conversation_phase || 'intake',

      // Styling
      primary_color: data.primary_color || '#667eea',
      secondary_color: data.secondary_color || '#764ba2',
      font_family: data.font_family || 'Arial, sans-serif',
      template_style: data.template_style || 'default',

      // Generated content
      generated_html: data.generated_html || '',

      // Conversation history
      conversation_history: data.conversation_history || [],

      // Deployment
      deployment_status: data.deployment_status || 'draft',
      deployed_url: data.deployed_url || '',
      deployed_at: data.deployed_at || null,

      // Tracking
      view_count: data.view_count || 0,
      application_count: data.application_count || 0,

      // Metadata
      created_at: new Date(),
      updated_at: new Date()
    };

    this.tlps.set(id, tlp);
    return tlp;
  }

  /**
   * Find TLP by ID
   */
  findById(id) {
    return this.tlps.get(id) || null;
  }

  /**
   * Update TLP by ID
   */
  update(id, updates) {
    const tlp = this.tlps.get(id);
    if (!tlp) return null;

    const updated = {
      ...tlp,
      ...updates,
      _id: id, // Preserve ID
      created_at: tlp.created_at, // Preserve created_at
      updated_at: new Date()
    };

    this.tlps.set(id, updated);
    return updated;
  }

  /**
   * Delete TLP by ID
   */
  delete(id) {
    return this.tlps.delete(id);
  }

  /**
   * Get all TLPs
   */
  findAll() {
    return Array.from(this.tlps.values());
  }
}

// Singleton instance
const memoryStorage = new MemoryStorage();

module.exports = memoryStorage;
