const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const cache = require('./scrapingCache');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Common paths for career and about pages
const CAREER_PATHS = ['/careers', '/careers/', '/career', '/join-us', '/join-our-team', '/work-with-us', '/jobs', '/opportunities'];
const ABOUT_PATHS = ['/about', '/about-us', '/our-story', '/who-we-are', '/about/', '/about-us/'];

/**
 * Scrape a company website for branding data (homepage + career + about pages)
 * @param {string} url - Company website URL
 * @returns {Object} Raw scraped data
 */
async function scrape(url) {
  // Normalize URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const domain = new URL(url).origin;

  // Check cache first
  const cacheKey = domain;
  if (cache.brand.has(cacheKey)) {
    console.log(`[WebsiteScraper] Cache hit for ${domain}`);
    return cache.brand.get(cacheKey);
  }

  console.log(`[WebsiteScraper] Scraping ${url}`);

  // Check robots.txt
  const canScrape = await checkRobotsTxt(domain);
  if (!canScrape) {
    console.log(`[WebsiteScraper] Blocked by robots.txt: ${domain}`);
    return { error: 'blocked_by_robots', domain };
  }

  try {
    // Fetch homepage
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract all data from homepage
    const colors = extractColors($, html);
    const fonts = extractFonts($, html);
    const logos = extractLogos($, domain);
    const metaData = extractMetaData($);
    const brandText = extractBrandText($);

    // Fetch external CSS for more color/font data
    const externalCssData = await fetchExternalCss($, domain);
    colors.push(...externalCssData.colors);
    fonts.push(...externalCssData.fonts);

    // Extract hero images from homepage
    let allHeroImages = extractHeroImages($, domain, 'homepage');
    console.log(`[WebsiteScraper] Found ${allHeroImages.length} hero image candidates from homepage`);

    // Scrape career page for benefits, culture, why-join content
    let careerPageContent = '';
    const careerPage = await findSubPage(domain, CAREER_PATHS);
    if (careerPage) {
      console.log(`[WebsiteScraper] Found career sub-page: ${careerPage.url}`);
      const careerData = extractCareerPageContent(careerPage.$);
      careerPageContent = careerData.text;
      const careerImages = extractHeroImages(careerPage.$, domain, 'careers');
      allHeroImages.push(...careerImages);
      console.log(`[WebsiteScraper] Extracted career content (${careerPageContent.length} chars), ${careerImages.length} images`);
    } else {
      console.log(`[WebsiteScraper] No career sub-page found`);
    }

    // Scrape about page for company info, mission, values
    let aboutPageContent = '';
    const aboutPage = await findSubPage(domain, ABOUT_PATHS);
    if (aboutPage) {
      console.log(`[WebsiteScraper] Found about sub-page: ${aboutPage.url}`);
      const aboutData = extractAboutPageContent(aboutPage.$);
      aboutPageContent = aboutData.text;
      const aboutImages = extractHeroImages(aboutPage.$, domain, 'about');
      allHeroImages.push(...aboutImages);
      console.log(`[WebsiteScraper] Extracted about content (${aboutPageContent.length} chars), ${aboutImages.length} images`);
    } else {
      console.log(`[WebsiteScraper] No about sub-page found`);
    }

    // Sort hero images by relevance, deduplicate, keep top 10
    allHeroImages = deduplicateAndSortImages(allHeroImages);

    const result = {
      domain,
      colors: [...new Set(colors)],
      fonts: [...new Set(fonts)],
      logos,
      metaData,
      brandText,
      heroImages: allHeroImages,
      careerPageContent,
      aboutPageContent,
      scrapedAt: new Date()
    };

    // Cache the result
    cache.brand.set(cacheKey, result);

    console.log(`[WebsiteScraper] Extracted ${colors.length} colors, ${fonts.length} fonts, ${logos.length} logo candidates, ${allHeroImages.length} hero images`);
    return result;

  } catch (error) {
    console.error(`[WebsiteScraper] Error scraping ${url}:`, error.message);
    return { error: error.message, domain };
  }
}

/**
 * Fetch a single sub-page
 * @param {string} domain - Base domain (e.g., "https://example.com")
 * @param {string} path - URL path (e.g., "/careers")
 * @returns {Object|null} { $, url, html } or null on failure
 */
async function fetchSubPage(domain, path) {
  const url = domain + path;
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
      maxRedirects: 3,
      validateStatus: (status) => status === 200
    });

    const $ = cheerio.load(response.data);
    return { $, url, html: response.data };
  } catch {
    return null;
  }
}

/**
 * Try multiple path variants to find a sub-page
 * @param {string} domain - Base domain
 * @param {string[]} paths - Array of path variants to try
 * @returns {Object|null} First successful result or null
 */
async function findSubPage(domain, paths) {
  for (const path of paths) {
    const result = await fetchSubPage(domain, path);
    if (result) return result;
  }
  return null;
}

/**
 * Extract career page content (benefits, culture, why-join)
 * @param {CheerioAPI} $ - Cheerio loaded page
 * @returns {Object} { text, headings }
 */
function extractCareerPageContent($) {
  const texts = new Set();
  const headings = [];

  // Try specific selectors first for structured career content
  const careerSelectors = [
    '.benefits', '.perks', '.culture', '.values', '.why-join', '.why-work',
    '#benefits', '#perks', '#culture', '#values', '#why-join', '#why-work',
    '[class*="benefit"]', '[class*="perk"]', '[class*="culture"]', '[class*="value"]',
    '[class*="why-join"]', '[class*="why-work"]', '[class*="career"]'
  ];

  // Extract from career-specific sections
  careerSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      // Get headings
      $(el).find('h1, h2, h3, h4').each((_, heading) => {
        const text = $(heading).text().trim();
        if (text && text.length < 200) {
          headings.push(text);
          texts.add(text);
        }
      });

      // Get paragraph text
      $(el).find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20 && text.length < 500) {
          texts.add(text);
        }
      });

      // Get list items (benefits often in lists)
      $(el).find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text && text.length > 5 && text.length < 200) {
          texts.add(text);
        }
      });
    });
  });

  // Also look for headings that contain career-related keywords
  const careerKeywords = ['benefit', 'perk', 'culture', 'why join', 'why work', 'what we offer',
    'our values', 'life at', 'work with us', 'grow', 'career', 'team', 'diversity', 'inclusion'];

  $('h1, h2, h3, h4').each((_, el) => {
    const headingText = $(el).text().trim().toLowerCase();
    if (careerKeywords.some(kw => headingText.includes(kw))) {
      headings.push($(el).text().trim());

      // Get sibling/next content
      const parent = $(el).parent();
      parent.find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20 && text.length < 500) {
          texts.add(text);
        }
      });
      parent.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text && text.length > 5 && text.length < 200) {
          texts.add(text);
        }
      });
    }
  });

  // If still not enough content, get general paragraph text from the page
  if (texts.size < 5) {
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 30 && text.length < 500) {
        texts.add(text);
      }
    });
  }

  // Limit to 20 unique text items
  const uniqueTexts = Array.from(texts).slice(0, 20);

  return {
    text: uniqueTexts.join('\n\n'),
    headings
  };
}

/**
 * Extract about page content (mission, values, history, founding story)
 * @param {CheerioAPI} $ - Cheerio loaded page
 * @returns {Object} { text, headings }
 */
function extractAboutPageContent($) {
  const texts = new Set();
  const headings = [];

  // Keywords for about page sections
  const aboutKeywords = ['mission', 'vision', 'values', 'story', 'history', 'about',
    'founded', 'purpose', 'who we are', 'what we do', 'our team', 'leadership'];

  // Look for headings with about-related keywords
  $('h1, h2, h3, h4').each((_, el) => {
    const headingText = $(el).text().trim().toLowerCase();
    if (aboutKeywords.some(kw => headingText.includes(kw))) {
      headings.push($(el).text().trim());

      // Get sibling/next paragraph content
      const parent = $(el).parent();
      parent.find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20 && text.length < 600) {
          texts.add(text);
        }
      });
    }
  });

  // Try specific about selectors
  const aboutSelectors = [
    '.about', '.mission', '.values', '.story', '.history',
    '#about', '#mission', '#values', '#story', '#history',
    '[class*="about"]', '[class*="mission"]', '[class*="story"]'
  ];

  aboutSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      $(el).find('p').each((_, p) => {
        const text = $(p).text().trim();
        if (text && text.length > 20 && text.length < 600) {
          texts.add(text);
        }
      });
    });
  });

  // Fallback: general paragraph content
  if (texts.size < 3) {
    $('main p, article p, .content p, section p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 30 && text.length < 600) {
        texts.add(text);
      }
    });
  }

  // If still not enough, get any p tags
  if (texts.size < 3) {
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 30 && text.length < 600) {
        texts.add(text);
      }
    });
  }

  // Limit to 15 unique text items
  const uniqueTexts = Array.from(texts).slice(0, 15);

  return {
    text: uniqueTexts.join('\n\n'),
    headings
  };
}

/**
 * Extract hero/team/workplace images from a page
 * @param {CheerioAPI} $ - Cheerio loaded page
 * @param {string} domain - Base domain for resolving URLs
 * @param {string} source - Page source identifier (homepage, careers, about)
 * @returns {Object[]} Array of { url, alt, source, relevance }
 */
function extractHeroImages($, domain, source) {
  const images = [];

  // Relevance keywords for scoring
  const highRelevanceKeywords = ['team', 'people', 'culture', 'workplace', 'office', 'career',
    'staff', 'employee', 'work', 'life', 'join', 'together', 'group', 'colleague'];
  const mediumRelevanceKeywords = ['hero', 'banner', 'header', 'about', 'company', 'community',
    'diversity', 'meeting', 'collaboration'];

  // Scan all <img> elements
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (!src) return;

    const resolvedUrl = resolveUrl(src, domain);
    if (!resolvedUrl) return;

    const alt = ($(el).attr('alt') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();
    const parentCls = ($(el).parent().attr('class') || '').toLowerCase();
    const grandparentCls = ($(el).parent().parent().attr('class') || '').toLowerCase();

    // Skip logos, icons, tiny images
    const ext = resolvedUrl.split('?')[0].split('.').pop().toLowerCase();
    if (['svg', 'ico', 'gif'].includes(ext)) return;
    if (alt.includes('logo') || cls.includes('logo') || src.toLowerCase().includes('logo')) return;
    if (alt.includes('icon') || cls.includes('icon') || src.toLowerCase().includes('icon')) return;

    // Check specified dimensions (skip tiny images)
    const width = parseInt($(el).attr('width') || '0');
    const height = parseInt($(el).attr('height') || '0');
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) return;

    // Calculate relevance score
    let relevance = 0;
    const allText = `${alt} ${cls} ${parentCls} ${grandparentCls}`;

    highRelevanceKeywords.forEach(kw => {
      if (allText.includes(kw)) relevance += 3;
    });
    mediumRelevanceKeywords.forEach(kw => {
      if (allText.includes(kw)) relevance += 2;
    });

    // Boost for being in hero/banner sections
    if (parentCls.includes('hero') || parentCls.includes('banner') || grandparentCls.includes('hero') || grandparentCls.includes('banner')) {
      relevance += 4;
    }

    // Boost for larger specified dimensions
    if (width > 600 || height > 400) relevance += 2;
    if (width > 1000 || height > 600) relevance += 2;

    // Boost for preferred file types
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) relevance += 1;

    // Boost based on page source
    if (source === 'careers') relevance += 2;
    if (source === 'about') relevance += 1;

    // Only include images with some relevance or from career/about pages
    if (relevance > 0 || source !== 'homepage') {
      images.push({
        url: resolvedUrl,
        alt: $(el).attr('alt') || '',
        source,
        relevance
      });
    }
  });

  // Also check CSS background-image on hero/banner sections
  $('[class*="hero"], [class*="banner"], [class*="header-image"], [class*="cover"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
    if (bgMatch) {
      const bgUrl = resolveUrl(bgMatch[1], domain);
      if (bgUrl) {
        images.push({
          url: bgUrl,
          alt: 'Background image',
          source,
          relevance: 5 // Background heroes are usually good candidates
        });
      }
    }
  });

  return images;
}

/**
 * Deduplicate and sort hero images
 * @param {Object[]} images - Array of hero image objects
 * @returns {Object[]} Deduplicated and sorted, top 10
 */
function deduplicateAndSortImages(images) {
  const seen = new Set();
  const unique = [];

  // Sort by relevance first
  images.sort((a, b) => b.relevance - a.relevance);

  for (const img of images) {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      unique.push(img);
    }
  }

  return unique.slice(0, 10);
}

/**
 * Check robots.txt to see if we can scrape
 */
async function checkRobotsTxt(domain) {
  try {
    const response = await axios.get(`${domain}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    });
    const robots = robotsParser(`${domain}/robots.txt`, response.data);
    return robots.isAllowed(domain + '/', USER_AGENT);
  } catch {
    // If robots.txt doesn't exist or errors, allow scraping
    return true;
  }
}

/**
 * Extract CSS colors from inline styles and style tags
 */
function extractColors($, html) {
  const colors = [];

  // Check <meta name="theme-color">
  const themeColor = $('meta[name="theme-color"]').attr('content');
  if (themeColor) {
    colors.push({ value: themeColor, source: 'theme-color', priority: 10 });
  }

  // Extract colors from <style> tags
  $('style').each((_, el) => {
    const css = $(el).text();
    extractColorsFromCss(css, colors, 'style-tag');
  });

  // Extract colors from inline styles on key elements
  const keySelectors = ['body', 'header', 'nav', '.header', '.navbar', '#header', 'footer', 'a', 'button', '.btn', 'h1', 'h2'];
  keySelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const style = $(el).attr('style');
      if (style) {
        extractColorsFromCss(style, colors, 'inline-' + selector);
      }
    });
  });

  // Extract colors from data attributes that might contain branding
  $('[data-color], [data-primary-color], [data-brand-color]').each((_, el) => {
    const color = $(el).attr('data-color') || $(el).attr('data-primary-color') || $(el).attr('data-brand-color');
    if (color) {
      colors.push({ value: color, source: 'data-attr', priority: 8 });
    }
  });

  return colors;
}

/**
 * Extract color values from CSS text
 */
function extractColorsFromCss(css, colors, source) {
  // Hex colors
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
  let match;
  while ((match = hexPattern.exec(css)) !== null) {
    colors.push({ value: match[0], source, priority: 5 });
  }

  // RGB/RGBA colors
  const rgbPattern = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/g;
  while ((match = rgbPattern.exec(css)) !== null) {
    colors.push({ value: match[0], source, priority: 5 });
  }

  // HSL colors
  const hslPattern = /hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*[\d.]+)?\s*\)/g;
  while ((match = hslPattern.exec(css)) !== null) {
    colors.push({ value: match[0], source, priority: 3 });
  }

  // CSS custom properties that look like brand colors
  const varPattern = /--(?:primary|brand|main|accent|secondary)[\w-]*:\s*([^;]+)/g;
  while ((match = varPattern.exec(css)) !== null) {
    const value = match[1].trim();
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      colors.push({ value, source: source + '-var', priority: 9 });
    }
  }
}

/**
 * Extract font families from CSS
 */
function extractFonts($, html) {
  const fonts = [];

  // Google Fonts links
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      fonts.push({ value: href, source: 'google-fonts-link', type: 'url' });

      // Parse font names from URL
      const familyMatch = href.match(/family=([^&]+)/);
      if (familyMatch) {
        const families = decodeURIComponent(familyMatch[1]).split('|');
        families.forEach(f => {
          const name = f.split(':')[0].replace(/\+/g, ' ');
          fonts.push({ value: name, source: 'google-fonts-link', type: 'name' });
        });
      }
    }
  });

  // @import Google Fonts from style tags
  $('style').each((_, el) => {
    const css = $(el).text();
    const importPattern = /@import\s+url\(['"]?(https?:\/\/fonts\.googleapis\.com[^'")\s]+)['"]?\)/g;
    let match;
    while ((match = importPattern.exec(css)) !== null) {
      fonts.push({ value: match[1], source: 'google-fonts-import', type: 'url' });
    }
  });

  // Font-family declarations from style tags
  const allCss = $('style').map((_, el) => $(el).text()).get().join('\n');
  const fontFamilyPattern = /font-family:\s*([^;}]+)/g;
  let match;
  while ((match = fontFamilyPattern.exec(allCss)) !== null) {
    const fontValue = match[1].trim().replace(/['"]/g, '');
    fonts.push({ value: fontValue, source: 'css-declaration', type: 'declaration' });
  }

  return fonts;
}

/**
 * Extract logo candidates
 */
function extractLogos($, domain) {
  const logos = [];

  // og:image (reduced priority - often a promotional banner, NOT the actual logo)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    logos.push({ url: resolveUrl(ogImage, domain), source: 'og:image', priority: 4 });
  }

  // apple-touch-icon
  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      logos.push({ url: resolveUrl(href, domain), source: 'apple-touch-icon', priority: 7 });
    }
  });

  // Favicon (PNG preferred)
  $('link[rel="icon"][type="image/png"], link[rel="shortcut icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const sizes = $(el).attr('sizes') || '';
      const size = parseInt(sizes.split('x')[0]) || 0;
      logos.push({ url: resolveUrl(href, domain), source: 'favicon', priority: 3 + Math.min(size / 100, 3) });
    }
  });

  // Images in header/nav with "logo" in src, alt, or class
  $('header img, nav img, .header img, .navbar img, #header img').each((_, el) => {
    const src = $(el).attr('src');
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();

    if (src && (alt.includes('logo') || cls.includes('logo') || id.includes('logo') || src.toLowerCase().includes('logo'))) {
      logos.push({ url: resolveUrl(src, domain), source: 'header-img', priority: 10 });
    }
  });

  // SVG logos in header/nav (many modern sites use inline SVG for logos)
  $('header svg, nav svg, .header svg, .navbar svg, #header svg').each((_, el) => {
    const cls = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    const parentCls = ($(el).parent().attr('class') || '').toLowerCase();
    const parentHref = $(el).parent().attr('href') || '';

    // Check if the SVG is likely a logo (class/id contains "logo" or parent links to homepage)
    if (cls.includes('logo') || id.includes('logo') || parentCls.includes('logo') || parentHref === '/' || parentHref === domain) {
      // Try to find an image fallback or data-uri in the SVG
      const svgImg = $(el).find('image');
      if (svgImg.length) {
        const svgSrc = svgImg.attr('href') || svgImg.attr('xlink:href');
        if (svgSrc) {
          logos.push({ url: resolveUrl(svgSrc, domain), source: 'header-svg', priority: 10 });
        }
      }
    }
  });

  // Also check for img tags in header that might not have "logo" in attributes but are the first/main image
  $('header a[href="/"] img, nav a[href="/"] img, .header a[href="/"] img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const alreadyAdded = logos.some(l => l.url === resolveUrl(src, domain));
      if (!alreadyAdded) {
        logos.push({ url: resolveUrl(src, domain), source: 'header-home-link', priority: 9 });
      }
    }
  });

  // Any img with "logo" in attributes anywhere on the page
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();

    if (src && (alt.includes('logo') || cls.includes('logo') || src.toLowerCase().includes('logo'))) {
      // Check if already added from header
      const alreadyAdded = logos.some(l => l.url === resolveUrl(src, domain));
      if (!alreadyAdded) {
        logos.push({ url: resolveUrl(src, domain), source: 'page-img', priority: 6 });
      }
    }
  });

  // Sort by priority descending
  logos.sort((a, b) => b.priority - a.priority);

  return logos;
}

/**
 * Extract meta data
 */
function extractMetaData($) {
  return {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    keywords: $('meta[name="keywords"]').attr('content') || ''
  };
}

/**
 * Extract brand-relevant text from the page
 */
function extractBrandText($) {
  const texts = [];

  // Hero section text
  $('h1').each((i, el) => {
    if (i < 3) texts.push($(el).text().trim());
  });

  $('h2').each((i, el) => {
    if (i < 5) texts.push($(el).text().trim());
  });

  // "About" section text
  $('section, div').each((_, el) => {
    const text = $(el).text().toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();

    if (id.includes('about') || cls.includes('about') || id.includes('mission') || cls.includes('mission')) {
      const content = $(el).find('p').first().text().trim();
      if (content && content.length < 500) {
        texts.push(content);
      }
    }
  });

  return texts.filter(t => t.length > 0).slice(0, 10);
}

/**
 * Fetch external CSS files and extract colors/fonts
 */
async function fetchExternalCss($, domain) {
  const colors = [];
  const fonts = [];
  const cssLinks = [];

  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.includes('fonts.googleapis.com')) {
      cssLinks.push(resolveUrl(href, domain));
    }
  });

  // Fetch up to 3 external CSS files
  const linksToFetch = cssLinks.slice(0, 3);

  await Promise.all(linksToFetch.map(async (cssUrl) => {
    try {
      const resp = await axios.get(cssUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 8000
      });
      const css = resp.data;
      extractColorsFromCss(css, colors, 'external-css');

      // Extract fonts from external CSS
      const fontFamilyPattern = /font-family:\s*([^;}]+)/g;
      let match;
      while ((match = fontFamilyPattern.exec(css)) !== null) {
        fonts.push({ value: match[1].trim().replace(/['"]/g, ''), source: 'external-css', type: 'declaration' });
      }
    } catch {
      // Ignore individual CSS fetch failures
    }
  }));

  return { colors, fonts };
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url, domain) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return domain + url;
  return domain + '/' + url;
}

module.exports = { scrape };
