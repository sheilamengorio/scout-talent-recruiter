const fs = require('fs').promises;
const path = require('path');

/**
 * Generate TLP HTML from job data
 * @param {Object} tlp - TalentPage MongoDB document
 * @returns {String} Generated HTML
 */
async function generate(tlp) {
  // Apply brand data to TLP styling if available
  applyBrandData(tlp);

  // Expose nested brand_data fields at top level for template processing
  tlp.hero_image_url = tlp.brand_data?.hero_image_url || '';

  // Ensure highlight fields are exposed at top level
  tlp.highlight_1 = tlp.highlight_1 || '';
  tlp.highlight_2 = tlp.highlight_2 || '';
  tlp.highlight_3 = tlp.highlight_3 || '';

  // Load base template
  const templatePath = path.join(__dirname, '../templates/base-template.html');
  let template;

  try {
    template = await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    // If template doesn't exist yet, use minimal template
    template = getMinimalTemplate();
  }

  // Replace placeholders with actual data
  let html = template
    .replace(/{{role_title}}/g, tlp.role_title || 'Position Opening')
    .replace(/{{company_name}}/g, tlp.company_name || '')
    .replace(/{{salary_range}}/g, tlp.salary_range || '')
    .replace(/{{location}}/g, tlp.location || '')
    .replace(/{{work_type}}/g, formatWorkType(tlp.work_type))
    .replace(/{{start_date}}/g, tlp.start_date || '')
    .replace(/{{company_description}}/g, tlp.company_description || '')
    .replace(/{{job_description}}/g, tlp.job_description || '')
    .replace(/{{company_logo_url}}/g, proxyImageUrl(tlp.company_logo_url || ''))
    .replace(/{{company_website_url}}/g, tlp.company_website_url || '#')
    .replace(/{{hero_image_url}}/g, proxyImageUrl(tlp.hero_image_url || ''))
    .replace(/{{highlight_1}}/g, escapeHtml(tlp.highlight_1 || ''))
    .replace(/{{highlight_2}}/g, escapeHtml(tlp.highlight_2 || ''))
    .replace(/{{highlight_3}}/g, escapeHtml(tlp.highlight_3 || ''))
    .replace(/{{responsibilities}}/g, generateList(tlp.responsibilities))
    .replace(/{{requirements}}/g, generateList(tlp.requirements))
    .replace(/{{benefits}}/g, generateList(tlp.benefits));

  // Replace brand font import placeholder
  const googleFontsUrl = tlp.brand_data?.fonts?.google_fonts_url || '';
  const fontImport = googleFontsUrl
    ? `<link href="${escapeHtml(googleFontsUrl)}" rel="stylesheet">`
    : '';
  html = html.replace(/{{brand_font_import}}/g, fontImport);

  // Handle conditional blocks (Mustache-style)
  html = processConditionals(html, tlp);

  // Inject custom styling
  html = injectStyles(html, tlp);

  return html;
}

/**
 * Generate standalone HTML (for export)
 * @param {Object} tlp - TalentPage MongoDB document
 * @returns {String} Standalone HTML with inline CSS
 */
async function generateStandalone(tlp) {
  let html = await generate(tlp);

  // Strip the deploy banner for standalone export
  html = html.replace(/<div class="deploy-banner">[\s\S]*?<\/div>\s*/i, '');

  // Add social sharing meta tags
  const metaTags = buildMetaTags(tlp);
  html = html.replace('</head>', `${metaTags}\n</head>`);

  return html;
}

/**
 * Apply brand data to TLP styling fields
 * This is the SINGLE SOURCE OF TRUTH for brand styling application.
 * Only applies scraped data when user hasn't customised (values are still at defaults).
 */
function applyBrandData(tlp) {
  if (!tlp.brand_data || tlp.brand_data.scrape_status !== 'completed') return;

  const bd = tlp.brand_data;

  // Check if values are still at defaults (user hasn't customised)
  const isDefaultPrimary = !tlp.primary_color || tlp.primary_color === '#667eea';
  const isDefaultSecondary = !tlp.secondary_color || tlp.secondary_color === '#764ba2';
  const isDefaultFont = !tlp.font_family || tlp.font_family === 'Arial, sans-serif';

  // Apply brand colors only if scraped data exists AND user hasn't customised
  if (bd.colors?.primary && isDefaultPrimary) {
    tlp.primary_color = bd.colors.primary;
  }
  if (bd.colors?.secondary && isDefaultSecondary) {
    tlp.secondary_color = bd.colors.secondary;
  }

  // Apply brand fonts only if scraped and user hasn't customised
  if (bd.fonts?.heading && isDefaultFont) {
    const fontStack = bd.fonts.body
      ? `'${bd.fonts.heading}', '${bd.fonts.body}', sans-serif`
      : `'${bd.fonts.heading}', sans-serif`;
    tlp.font_family = fontStack;
  }

  // Apply logo (only if no logo set yet)
  if (bd.logo_url && !tlp.company_logo_url) {
    tlp.company_logo_url = bd.logo_url;
  }

  // Apply hero image (only if no hero image set yet)
  if (bd.hero_image_url && !tlp.hero_image_url) {
    tlp.hero_image_url = bd.hero_image_url;
  }
}

/**
 * Build social sharing meta tags for export
 */
function buildMetaTags(tlp) {
  const title = `${tlp.role_title || 'Job Opening'} at ${tlp.company_name || 'Our Company'}`;
  const description = tlp.job_description
    ? tlp.job_description.substring(0, 160)
    : `Apply for ${tlp.role_title || 'this position'} at ${tlp.company_name || 'our company'}`;

  return `
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  ${tlp.company_logo_url ? `<meta property="og:image" content="${escapeHtml(tlp.company_logo_url)}">` : ''}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">`;
}

/**
 * Format work type for display
 */
function formatWorkType(workType) {
  const types = {
    'remote': 'Remote',
    'hybrid': 'Hybrid',
    'onsite': 'On-site'
  };
  return types[workType] || '';
}

/**
 * Generate HTML list from array
 */
function generateList(items) {
  if (!items || items.length === 0) {
    return '<li>To be determined</li>';
  }

  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('\n');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Convert external image URL to proxied URL to avoid hotlinking blocks
 */
function proxyImageUrl(url) {
  if (!url) return '';
  // Only proxy external URLs (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  // Already relative or data-uri, return as-is
  return url;
}

/**
 * Process Mustache-style conditional blocks
 */
function processConditionals(html, tlp) {
  const fields = ['company_logo_url', 'salary_range', 'location', 'work_type', 'start_date',
    'company_description', 'job_description', 'benefits', 'company_website_url', 'hero_image_url',
    'highlight_1', 'highlight_2', 'highlight_3'];

  fields.forEach(field => {
    const value = tlp[field];
    const isEmpty = !value || (Array.isArray(value) && value.length === 0);

    // Handle inverted conditionals FIRST: {{^field}}content{{/^field}} (show when field is empty)
    // Using {{/^field}} as closing tag to avoid conflict with positive blocks
    const invertedPattern = new RegExp(`{{\\^${field}}}([\\s\\S]*?){{/\\^${field}}}`, 'g');
    if (isEmpty) {
      // Field is empty, show the inverted block content
      html = html.replace(invertedPattern, '$1');
    } else {
      // Field has value, remove inverted block entirely
      html = html.replace(invertedPattern, '');
    }

    // Handle positive conditionals: {{#field}}...{{/field}}
    const pattern = new RegExp(`{{#${field}}}[\\s\\S]*?{{/${field}}}`, 'g');

    if (isEmpty) {
      html = html.replace(pattern, '');
    } else {
      html = html.replace(new RegExp(`{{#${field}}}`, 'g'), '');
      html = html.replace(new RegExp(`{{/${field}}}`, 'g'), '');
    }
  });

  return html;
}

/**
 * Inject custom styles based on TLP data and brand
 */
function injectStyles(html, tlp) {
  const primaryColor = tlp.primary_color || '#667eea';
  const secondaryColor = tlp.secondary_color || '#764ba2';
  const fontFamily = tlp.font_family || 'Arial, sans-serif';

  const customCSS = `
    <style>
      :root {
        --primary-color: ${primaryColor};
        --secondary-color: ${secondaryColor};
        --font-family: ${fontFamily};
      }

      body {
        font-family: var(--font-family);
      }

      .hero-content {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      }

      .btn-primary {
        background: var(--primary-color);
      }

      .accent {
        color: var(--primary-color);
      }

      h2 {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }

      li:before {
        color: var(--primary-color);
      }

      .btn-apply {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      }

      .btn-apply:hover {
        box-shadow: 0 10px 20px ${primaryColor}4D;
      }
    </style>
  `;

  return html.replace('</head>', `${customCSS}\n</head>`);
}

/**
 * Get minimal template when base template doesn't exist yet
 * New design: Top bar (white bg, small logo) + Two-column hero (left: job info gradient, right: company image)
 */
function getMinimalTemplate() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{role_title}} - {{company_name}}</title>
  {{brand_font_import}}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif);
      line-height: 1.6;
      color: #333;
    }

    .deploy-banner {
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 20px;
      text-align: center;
    }

    .btn-deploy {
      background: #0052CC;
      color: white;
      padding: 12px 28px;
      border: none;
      border-radius: 6px;
      font-size: 0.95em;
      font-weight: 600;
      cursor: pointer;
      display: inline-block;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-deploy:hover {
      background: #0747A6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);
    }

    /* Top Bar - White background with small logo */
    .top-bar {
      background: white;
      padding: 16px 24px;
      border-bottom: 1px solid #eee;
    }

    .top-bar .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .top-bar-logo {
      max-width: 150px;
      max-height: 60px;
      height: auto;
      object-fit: contain;
    }

    /* Hero Section - Two column layout */
    .hero {
      display: flex;
      min-height: 320px;
      margin-bottom: 40px;
    }

    .hero-content {
      flex: 0 0 55%;
      background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
      color: white;
      padding: 45px 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* When no hero image, content takes full width */
    .hero-content.hero-full-width {
      flex: 1;
      text-align: center;
      padding: 50px 40px;
    }

    .hero-content.hero-full-width .job-meta {
      justify-content: center;
    }

    .hero-image {
      flex: 0 0 45%;
      overflow: hidden;
    }

    .hero-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      font-size: 2.4em;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }

    .company-name {
      font-size: 1.2em;
      opacity: 0.95;
      font-weight: 500;
      margin-bottom: 20px;
    }

    .job-meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 16px;
    }

    .meta-badge {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    section {
      margin: 40px 0;
    }

    h2 {
      color: var(--primary-color, #667eea);
      border-bottom: 2px solid var(--primary-color, #667eea);
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    ul {
      list-style: none;
      padding: 0;
    }

    li {
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
    }

    li:before {
      content: "\\2713";
      position: absolute;
      left: 0;
      color: var(--primary-color, #667eea);
      font-weight: bold;
    }

    .btn-apply {
      background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
      color: white;
      padding: 15px 40px;
      border: none;
      border-radius: 30px;
      font-size: 1.2em;
      cursor: pointer;
      display: inline-block;
      margin: 40px 0;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-apply:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    /* Highlights Bar */
    .highlights-bar {
      background: #f8f9fa;
      padding: 24px 0;
      border-bottom: 1px solid #eee;
    }

    .highlights-grid {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .highlight-item {
      flex: 1;
      min-width: 220px;
      max-width: 320px;
      background: white;
      border-left: 4px solid var(--primary-color, #667eea);
      padding: 16px 20px;
      font-weight: 600;
      font-size: 0.95em;
      color: #333;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      line-height: 1.4;
    }

    /* Mid-page CTA */
    .mid-cta {
      background: linear-gradient(135deg, var(--primary-color, #667eea) 0%, var(--secondary-color, #764ba2) 100%);
      padding: 32px 20px;
      margin: 40px 0;
      border-radius: 12px;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    .cta-text {
      color: white;
      font-size: 1.1em;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .btn-apply-mid {
      margin: 0;
      background: white;
      color: var(--primary-color, #667eea);
      font-weight: 700;
    }

    .btn-apply-mid:hover {
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      background: white;
    }

    /* Enhanced Apply Section */
    .apply-section {
      background: #f8f9fa;
      padding: 50px 20px;
      margin-top: 40px;
    }

    .apply-heading {
      border: none;
      font-size: 1.8em;
      margin-bottom: 12px;
    }

    .apply-subtext {
      color: #666;
      font-size: 1.05em;
      margin-bottom: 24px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    @media (max-width: 768px) {
      .hero {
        flex-direction: column;
      }
      .hero-content {
        flex: none;
        padding: 35px 24px;
      }
      .hero-image {
        flex: none;
        max-height: 250px;
      }
      h1 { font-size: 1.8em; }
      .container { padding: 16px; }
      .job-meta { gap: 8px; }
      .meta-badge { font-size: 0.85em; padding: 6px 12px; }
      .highlights-grid { flex-direction: column; align-items: center; }
      .highlight-item { min-width: unset; max-width: 100%; width: 100%; }
      .mid-cta { margin: 24px 16px; padding: 24px 16px; }
      .apply-heading { font-size: 1.4em; }
    }
  </style>
</head>
<body>
  <div class="deploy-banner">
    <a href="https://recruiter.scouttalent.ai/trial-signup" class="btn-deploy">Deploy to Seek with Scout Talent</a>
  </div>

  {{#company_logo_url}}
  <div class="top-bar">
    <div class="container">
      <img src="{{company_logo_url}}" alt="{{company_name}}" class="top-bar-logo" onerror="this.style.display='none'">
    </div>
  </div>
  {{/company_logo_url}}

  <div class="hero">
    <div class="hero-content{{^hero_image_url}} hero-full-width{{/^hero_image_url}}">
      <h1>{{role_title}}</h1>
      <div class="company-name">{{company_name}}</div>
      <div class="job-meta">
        {{#salary_range}}<div class="meta-badge">{{salary_range}}</div>{{/salary_range}}
        {{#location}}<div class="meta-badge">{{location}}</div>{{/location}}
        {{#work_type}}<div class="meta-badge">{{work_type}}</div>{{/work_type}}
      </div>
    </div>
    {{#hero_image_url}}
    <div class="hero-image">
      <img src="{{hero_image_url}}" alt="Life at {{company_name}}" onerror="this.parentElement.style.display='none'">
    </div>
    {{/hero_image_url}}
  </div>

  <div class="highlights-bar">
    <div class="highlights-grid">
      {{#highlight_1}}<div class="highlight-item">{{highlight_1}}</div>{{/highlight_1}}
      {{#highlight_2}}<div class="highlight-item">{{highlight_2}}</div>{{/highlight_2}}
      {{#highlight_3}}<div class="highlight-item">{{highlight_3}}</div>{{/highlight_3}}
    </div>
  </div>

  <div class="container">
    {{#company_description}}
    <section>
      <h2>About {{company_name}}</h2>
      <p>{{company_description}}</p>
    </section>
    {{/company_description}}

    {{#job_description}}
    <section>
      <h2>About the Role</h2>
      <p>{{job_description}}</p>
    </section>
    {{/job_description}}

    <div class="mid-cta" style="text-align: center;">
      <p class="cta-text">Interested? Don't wait -- roles like this fill fast.</p>
      <a href="#apply" class="btn-apply btn-apply-mid">Apply Now</a>
    </div>

    <section>
      <h2>Responsibilities</h2>
      <ul>
        {{responsibilities}}
      </ul>
    </section>

    <section>
      <h2>Requirements</h2>
      <ul>
        {{requirements}}
      </ul>
    </section>

    {{#benefits}}
    <section>
      <h2>What We Offer</h2>
      <ul>
        {{benefits}}
      </ul>
    </section>
    {{/benefits}}

  </div>

  <div class="apply-section" id="apply">
    <div style="text-align: center;">
      <h2 class="apply-heading">Ready to Make Your Move?</h2>
      <p class="apply-subtext">If you share our values and have the skills to succeed, we'd love to hear from you.</p>
      <a href="#apply" class="btn-apply">Apply Now</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = {
  generate,
  generateStandalone
};
