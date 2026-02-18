const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Process raw scraped data into a normalized brand profile
 * @param {Object} rawData - Raw data from websiteScraper.scrape()
 * @returns {Object} Normalized brand profile
 */
async function extract(rawData) {
  if (rawData.error) {
    return { error: rawData.error };
  }

  const colors = extractBrandColors(rawData.colors || []);
  const fonts = extractBrandFonts(rawData.fonts || []);
  const logo = selectBestLogo(rawData.logos || []);
  const brandVoice = await analyzeBrandVoice(rawData.brandText || [], rawData.metaData || {});
  const heroImageUrl = selectBestHeroImage(rawData.heroImages || []);

  return {
    colors,
    fonts,
    logo_url: logo,
    brand_voice_keywords: brandVoice.keywords,
    tone_category: brandVoice.tone_category || '',
    writing_style: brandVoice.writing_style || '',
    brand_avoid: brandVoice.avoid || '',
    raw_meta_description: rawData.metaData?.description || rawData.metaData?.ogDescription || '',
    hero_image_url: heroImageUrl,
    career_page_content: rawData.careerPageContent || '',
    about_page_content: rawData.aboutPageContent || '',
    scraped_images: (rawData.heroImages || []).map(img => ({ url: img.url, alt: img.alt, source: img.source }))
  };
}

/**
 * Select the best hero image from scraped candidates
 * @param {Object[]} heroImages - Array of { url, alt, source, relevance }
 * @returns {string} URL of best hero image or empty string
 */
function selectBestHeroImage(heroImages) {
  if (!heroImages || heroImages.length === 0) return '';

  // Images are already sorted by relevance from websiteScraper
  // Pick the highest relevance image that has relevance > 0
  const best = heroImages.find(img => img.relevance > 0);
  if (best) return best.url;

  // If no high-relevance images, return the first one anyway
  return heroImages[0]?.url || '';
}

/**
 * Extract and normalize brand colors from raw color data
 */
function extractBrandColors(rawColors) {
  if (!rawColors.length) {
    return { primary: '', secondary: '', accent: '', background: '', text: '' };
  }

  // Normalize all colors to hex
  const normalized = rawColors
    .map(c => ({ hex: normalizeToHex(c.value), source: c.source, priority: c.priority || 5 }))
    .filter(c => c.hex && c.hex.length === 7);

  // Filter out whites, blacks, and common greys
  const nonNeutral = normalized.filter(c => !isNeutralColor(c.hex));

  // Group similar colors (within threshold)
  const clusters = clusterColors(nonNeutral);

  // Sort clusters by combined priority + frequency
  clusters.sort((a, b) => {
    const scoreA = a.totalPriority + (a.count * 2);
    const scoreB = b.totalPriority + (b.count * 2);
    return scoreB - scoreA;
  });

  // Check for theme-color override
  const themeColor = rawColors.find(c => c.source === 'theme-color');
  const themeHex = themeColor ? normalizeToHex(themeColor.value) : null;

  // Check for CSS custom property colors (highest priority brand indicators)
  const varColors = rawColors.filter(c => c.source && c.source.includes('-var'));
  const varHex = varColors.length ? normalizeToHex(varColors[0].value) : null;

  const primary = varHex || themeHex || (clusters[0]?.representative || '');
  const secondary = clusters.length > 1 ? clusters[1].representative : '';
  const accent = clusters.length > 2 ? clusters[2].representative : '';

  return { primary, secondary, accent, background: '', text: '' };
}

/**
 * Normalize any CSS color value to hex
 */
function normalizeToHex(value) {
  if (!value || typeof value !== 'string') return '';
  value = value.trim();

  // Already hex
  if (value.startsWith('#')) {
    if (value.length === 4) {
      // Expand shorthand #abc -> #aabbcc
      return '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    }
    if (value.length === 7) return value.toLowerCase();
    if (value.length === 9) return value.substring(0, 7).toLowerCase(); // Strip alpha
    return '';
  }

  // RGB/RGBA
  const rgbMatch = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  // HSL - simplified conversion
  const hslMatch = value.match(/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    return hslToHex(h, s, l);
  }

  return '';
}

/**
 * Convert HSL to hex
 */
function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [r, g, b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a color is a neutral (white, black, grey)
 */
function isNeutralColor(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);

  // Check if very light (near white)
  if (r > 230 && g > 230 && b > 230) return true;

  // Check if very dark (near black)
  if (r < 25 && g < 25 && b < 25) return true;

  // Check if grey (r, g, b are very close to each other)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 20 && r > 50 && r < 210) return true;

  return false;
}

/**
 * Cluster similar colors together
 */
function clusterColors(colors) {
  const clusters = [];
  const threshold = 40; // Color distance threshold

  for (const color of colors) {
    let matched = false;
    for (const cluster of clusters) {
      if (colorDistance(color.hex, cluster.representative) < threshold) {
        cluster.count++;
        cluster.totalPriority += color.priority;
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({
        representative: color.hex,
        count: 1,
        totalPriority: color.priority
      });
    }
  }

  return clusters;
}

/**
 * Calculate simple color distance
 */
function colorDistance(hex1, hex2) {
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);
  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Extract and normalize brand fonts
 */
function extractBrandFonts(rawFonts) {
  if (!rawFonts.length) {
    return { heading: '', body: '', google_fonts_url: '' };
  }

  const systemFonts = new Set([
    'arial', 'helvetica', 'verdana', 'georgia', 'times new roman', 'times',
    'courier new', 'courier', 'tahoma', 'trebuchet ms', 'impact',
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
    'roboto', 'oxygen', 'ubuntu', 'cantarell', 'fira sans',
    'droid sans', 'helvetica neue', 'inherit', 'initial', 'unset'
  ]);

  // Get Google Fonts URL if available
  const googleFontsUrl = rawFonts
    .filter(f => f.type === 'url' && f.value.includes('fonts.googleapis.com'))
    .map(f => f.value)[0] || '';

  // Get custom font names (non-system fonts)
  const customFonts = rawFonts
    .filter(f => f.type === 'name' || f.type === 'declaration')
    .map(f => {
      // For declarations, take the first font in the stack
      const firstFont = f.value.split(',')[0].trim();
      return firstFont;
    })
    .filter(f => !systemFonts.has(f.toLowerCase()));

  // Count frequency
  const fontCounts = {};
  customFonts.forEach(f => {
    fontCounts[f] = (fontCounts[f] || 0) + 1;
  });

  // Sort by frequency
  const sortedFonts = Object.entries(fontCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return {
    heading: sortedFonts[0] || '',
    body: sortedFonts[1] || sortedFonts[0] || '',
    google_fonts_url: googleFontsUrl
  };
}

/**
 * Select the best logo from candidates
 */
function selectBestLogo(logos) {
  if (!logos.length) return '';

  // Already sorted by priority in websiteScraper
  // Return the highest priority logo URL
  return logos[0]?.url || '';
}

/**
 * Analyze brand voice using AI - returns structured voice profile
 */
async function analyzeBrandVoice(brandTexts, metaData) {
  const allText = [
    metaData.description || '',
    metaData.ogDescription || '',
    ...brandTexts
  ].filter(t => t.length > 0).join('\n');

  if (!allText || allText.length < 20) {
    return { keywords: [], tone_category: '', writing_style: '', avoid: '' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You analyze company website text and identify brand voice characteristics. Return ONLY a JSON object with this exact structure (no explanation, no markdown):
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "tone_category": "one of: innovative_bold, professional_trusted, friendly_community, mission_driven",
  "writing_style": "A 1-2 sentence instruction for how to write copy matching this brand",
  "sample_hook": "A sample opening hook line for a job ad matching this brand",
  "avoid": "What to avoid in copy for this brand"
}`
        },
        {
          role: 'user',
          content: `Analyze this company's website text and return a structured brand voice profile.\n\nText:\n${allText.substring(0, 2000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const content = response.choices[0].message.content.trim();
    // Strip markdown code fences if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      tone_category: parsed.tone_category || '',
      writing_style: parsed.writing_style || '',
      sample_hook: parsed.sample_hook || '',
      avoid: parsed.avoid || ''
    };
  } catch (error) {
    console.error('[BrandExtractor] Brand voice analysis error:', error.message);
    return { keywords: [], tone_category: '', writing_style: '', avoid: '' };
  }
}

module.exports = { extract };
