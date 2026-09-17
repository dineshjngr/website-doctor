import * as cheerio from 'cheerio';
import { calculateScores } from './scoring.js';

const USER_AGENT = 'WebsiteDoctor/0.1 (+https://github.com/dineshjngr/website-doctor)';
const AI_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended'];

const issue = (category, severity, code, title, evidence, recommendation) => ({
  category, severity, code, title, evidence, recommendation
});

const normalizeUrl = (url) => {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http/https URLs are supported.');
  return u.toString();
};

async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, ...(options.headers || {}) },
      signal: controller.signal,
      ...options
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseRobotsForBots(robotsText) {
  const lower = robotsText.toLowerCase();
  return AI_BOTS.map((bot) => {
    const idx = lower.indexOf(`user-agent: ${bot.toLowerCase()}`);
    if (idx === -1) return { bot, status: 'not-explicitly-mentioned' };
    const next = lower.indexOf('user-agent:', idx + 12);
    const block = lower.slice(idx, next === -1 ? undefined : next);
    const blocked = /disallow:\s*\/\s*(?:\n|$)/.test(block);
    return { bot, status: blocked ? 'blocked' : 'allowed-or-partial' };
  });
}

export async function auditWebsite(inputUrl) {
  const started = Date.now();
  const url = normalizeUrl(inputUrl);
  const response = await safeFetch(url);
  const finalUrl = response.url;
  const html = await response.text();
  const $ = cheerio.load(html);
  const issues = [];
  const pageUrl = new URL(finalUrl);

  if (!response.ok) issues.push(issue('crawlability', 'critical', 'HTTP_STATUS', `Page returns HTTP ${response.status}`, finalUrl, 'Return a successful 2xx response for canonical indexable pages.'));
  if (url !== finalUrl) issues.push(issue('crawlability', 'info', 'REDIRECT', 'Requested URL redirects', `${url} → ${finalUrl}`, 'Confirm the redirect is intentional, direct and uses the preferred canonical hostname/protocol.'));

  const robotsMeta = $('meta[name="robots"], meta[name="googlebot"]').map((_, el) => ($(el).attr('content') || '').toLowerCase()).get().join(',');
  if (robotsMeta.includes('noindex')) issues.push(issue('crawlability', 'critical', 'NOINDEX', 'Page contains a noindex directive', robotsMeta, 'Remove noindex from pages intended to appear in organic search.'));
  if (robotsMeta.includes('nofollow')) issues.push(issue('links', 'high', 'NOFOLLOW_PAGE', 'Page-level nofollow directive detected', robotsMeta, 'Use page-level nofollow only when intentionally preventing link discovery/signals.'));

  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical) {
    issues.push(issue('crawlability', 'high', 'CANONICAL_MISSING', 'Canonical tag is missing', 'No rel=canonical found', 'Add a self-referencing canonical on canonical indexable pages.'));
  } else {
    try {
      const canonicalUrl = new URL(canonical, finalUrl).toString();
      if (canonicalUrl !== finalUrl) issues.push(issue('crawlability', 'medium', 'CANONICAL_DIFFERENT', 'Canonical points to a different URL', canonicalUrl, 'Verify canonicalization is intentional and points to the preferred equivalent URL.'));
    } catch {
      issues.push(issue('crawlability', 'high', 'CANONICAL_INVALID', 'Canonical URL is invalid', canonical, 'Use an absolute or valid relative canonical URL.'));
    }
  }

  const title = $('title').first().text().trim();
  if (!title) issues.push(issue('onPage', 'high', 'TITLE_MISSING', 'Title tag is missing', 'No <title> found', 'Add a unique, descriptive title aligned with search intent.'));
  else if (title.length < 25) issues.push(issue('onPage', 'medium', 'TITLE_SHORT', 'Title may be too short', `${title.length} characters`, 'Use enough context to clearly describe the page without keyword stuffing.'));
  else if (title.length > 65) issues.push(issue('onPage', 'medium', 'TITLE_LONG', 'Title may truncate in search results', `${title.length} characters`, 'Consider a more concise title while preserving the main topic and value proposition.'));

  const descriptions = $('meta[name="description"]');
  const description = descriptions.first().attr('content')?.trim() || '';
  if (!description) issues.push(issue('onPage', 'high', 'META_DESCRIPTION_MISSING', 'Meta description is missing', 'No meta description found', 'Add a unique description that accurately summarises the page.'));
  if (descriptions.length > 1) issues.push(issue('onPage', 'medium', 'META_DESCRIPTION_DUPLICATE_TAG', 'Multiple meta description tags detected', `${descriptions.length} tags`, 'Keep a single meta description tag.'));
  if (description && (description.length < 70 || description.length > 170)) issues.push(issue('onPage', 'low', 'META_DESCRIPTION_LENGTH', 'Meta description length is unusual', `${description.length} characters`, 'Review for clarity and useful SERP messaging rather than targeting an exact character count.'));

  const h1s = $('h1');
  if (h1s.length === 0) issues.push(issue('content', 'high', 'H1_MISSING', 'No H1 heading found', '0 H1 elements', 'Add one clear primary heading describing the page topic.'));
  if (h1s.length > 1) issues.push(issue('content', 'low', 'MULTIPLE_H1', 'Multiple H1 headings detected', `${h1s.length} H1 elements`, 'Multiple H1s can be valid, but verify the heading hierarchy communicates one clear primary topic.'));

  const headings = $('h1,h2,h3,h4,h5,h6').map((_, el) => Number(el.tagName.slice(1))).get();
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) {
      issues.push(issue('content', 'low', 'HEADING_SKIP', 'Heading hierarchy skips a level', `H${headings[i - 1]} → H${headings[i]}`, 'Use a logical nested heading structure where practical.'));
      break;
    }
  }

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;
  if (wordCount < 150) issues.push(issue('content', 'medium', 'THIN_CONTENT_SIGNAL', 'Very little indexable text detected', `${wordCount} words`, 'Confirm the page satisfies user intent and that key content is available in rendered HTML.'));

  const links = $('a[href]');
  let emptyAnchors = 0, genericAnchors = 0, internalLinks = 0, externalLinks = 0;
  const generic = new Set(['click here', 'here', 'read more', 'learn more', 'more']);
  links.each((_, el) => {
    const href = $(el).attr('href');
    const anchor = $(el).text().trim().toLowerCase();
    if (!anchor && !$(el).attr('aria-label')) emptyAnchors++;
    if (generic.has(anchor)) genericAnchors++;
    try {
      const target = new URL(href, finalUrl);
      if (target.hostname === pageUrl.hostname) internalLinks++;
      else if (['http:', 'https:'].includes(target.protocol)) externalLinks++;
    } catch {}
  });
  if (emptyAnchors) issues.push(issue('links', 'medium', 'EMPTY_ANCHORS', 'Links without descriptive text detected', `${emptyAnchors} links`, 'Add descriptive visible text or accessible labels to meaningful links.'));
  if (genericAnchors >= 3) issues.push(issue('links', 'low', 'GENERIC_ANCHORS', 'Several generic anchor texts detected', `${genericAnchors} links`, 'Use descriptive anchors that communicate destination/context where natural.'));
  if (internalLinks === 0) issues.push(issue('links', 'high', 'NO_INTERNAL_LINKS', 'No internal links detected', '0 internal links', 'Connect the page to relevant site sections and related content.'));

  const images = $('img');
  let missingAlt = 0, lazyHeroRisk = 0, dimensionMissing = 0;
  images.each((i, el) => {
    if ($(el).attr('alt') == null) missingAlt++;
    if (i < 2 && ($(el).attr('loading') || '').toLowerCase() === 'lazy') lazyHeroRisk++;
    if (!$(el).attr('width') || !$(el).attr('height')) dimensionMissing++;
  });
  if (missingAlt) issues.push(issue('media', 'medium', 'IMG_ALT_MISSING', 'Images without alt attributes detected', `${missingAlt}/${images.length} images`, 'Add meaningful alt text for informative images and empty alt for decorative images.'));
  if (lazyHeroRisk) issues.push(issue('performance', 'medium', 'LCP_LAZYLOAD_RISK', 'Above-the-fold image may be lazy-loaded', `${lazyHeroRisk} early image(s)`, 'Avoid lazy-loading the likely LCP image; consider fetchpriority="high" where appropriate.'));
  if (dimensionMissing >= 3) issues.push(issue('performance', 'low', 'IMG_DIMENSIONS_MISSING', 'Several images lack width/height attributes', `${dimensionMissing} images`, 'Reserve image space to reduce layout shifts.'));

  if (!$('meta[name="viewport"]').attr('content')) issues.push(issue('performance', 'high', 'VIEWPORT_MISSING', 'Viewport meta tag is missing', 'No viewport tag', 'Add a responsive viewport meta tag for mobile rendering.'));

  const jsonLdScripts = $('script[type="application/ld+json"]');
  if (jsonLdScripts.length === 0) issues.push(issue('schema', 'medium', 'JSONLD_MISSING', 'No JSON-LD structured data detected', '0 JSON-LD blocks', 'Add only schema types that accurately represent visible content and entities.'));
  let invalidJsonLd = 0;
  jsonLdScripts.each((_, el) => { try { JSON.parse($(el).html()); } catch { invalidJsonLd++; } });
  if (invalidJsonLd) issues.push(issue('schema', 'high', 'JSONLD_INVALID', 'Invalid JSON-LD detected', `${invalidJsonLd} invalid block(s)`, 'Fix JSON syntax and validate structured data against Schema.org/Google requirements.'));

  if (!$('html').attr('lang')) issues.push(issue('international', 'medium', 'HTML_LANG_MISSING', 'HTML language attribute is missing', '<html> has no lang', 'Set the primary language with a valid BCP 47 language tag.'));
  const hreflangs = $('link[rel="alternate"][hreflang]');
  if (hreflangs.length > 0 && !$('link[rel="alternate"][hreflang="x-default"]').length) issues.push(issue('international', 'low', 'XDEFAULT_MISSING', 'Hreflang exists without x-default', `${hreflangs.length} hreflang tags`, 'Consider x-default for a language/region selector or fallback page when appropriate.'));

  const headers = response.headers;
  const securityChecks = [
    ['content-security-policy', 'CSP_MISSING', 'Content-Security-Policy header is missing'],
    ['strict-transport-security', 'HSTS_MISSING', 'HSTS header is missing'],
    ['x-content-type-options', 'XCTO_MISSING', 'X-Content-Type-Options header is missing'],
    ['referrer-policy', 'REFERRER_POLICY_MISSING', 'Referrer-Policy header is missing']
  ];
  for (const [header, code, titleText] of securityChecks) {
    if (!headers.get(header)) issues.push(issue('security', 'low', code, titleText, `${header}: not found`, 'Review whether this security header should be configured for the site.'));
  }

  const robotsUrl = new URL('/robots.txt', pageUrl.origin).toString();
  let robotsText = '';
  try {
    const robotsRes = await safeFetch(robotsUrl);
    robotsText = robotsRes.ok ? await robotsRes.text() : '';
    if (!robotsRes.ok) issues.push(issue('crawlability', 'medium', 'ROBOTS_UNAVAILABLE', 'robots.txt could not be fetched successfully', `HTTP ${robotsRes.status}`, 'Serve a valid robots.txt at the site root, even if it allows all crawling.'));
  } catch {
    issues.push(issue('crawlability', 'medium', 'ROBOTS_FETCH_ERROR', 'robots.txt fetch failed', robotsUrl, 'Check robots.txt availability and server/network behaviour.'));
  }

  let aiBots = [];
  if (robotsText) {
    aiBots = parseRobotsForBots(robotsText);
    const blockedBots = aiBots.filter((b) => b.status === 'blocked');
    if (blockedBots.length) issues.push(issue('aiSearch', 'medium', 'AI_BOTS_BLOCKED', 'Some AI/search crawlers appear blocked in robots.txt', blockedBots.map(b => b.bot).join(', '), 'Review bot-specific blocking against your AI-search visibility and content licensing policy.'));
    if (!/sitemap:/i.test(robotsText)) issues.push(issue('crawlability', 'low', 'ROBOTS_SITEMAP_MISSING', 'robots.txt does not advertise a sitemap', robotsUrl, 'Add one or more Sitemap directives when an XML sitemap is available.'));
  }

  const sitemapUrl = new URL('/sitemap.xml', pageUrl.origin).toString();
  try {
    const sitemapRes = await safeFetch(sitemapUrl);
    if (!sitemapRes.ok) issues.push(issue('crawlability', 'medium', 'SITEMAP_DEFAULT_MISSING', 'Default /sitemap.xml was not found', `HTTP ${sitemapRes.status}`, 'Expose an XML sitemap and reference its actual URL in robots.txt.'));
  } catch {
    issues.push(issue('crawlability', 'low', 'SITEMAP_FETCH_ERROR', 'Could not test /sitemap.xml', sitemapUrl, 'Verify sitemap availability manually or via the URL declared in robots.txt.'));
  }

  if (!$('meta[property="og:title"]').length) issues.push(issue('onPage', 'low', 'OG_TITLE_MISSING', 'Open Graph title is missing', 'og:title not found', 'Add Open Graph metadata if pages are expected to be shared socially or in messaging apps.'));
  if (!$('meta[property="og:image"]').length) issues.push(issue('onPage', 'low', 'OG_IMAGE_MISSING', 'Open Graph image is missing', 'og:image not found', 'Provide a representative share image with suitable dimensions and absolute URL.'));

  const scores = calculateScores(issues);
  const severityCounts = ['critical','high','medium','low','info'].reduce((acc, s) => {
    acc[s] = issues.filter(i => i.severity === s).length;
    return acc;
  }, {});

  return {
    url,
    finalUrl,
    auditedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    httpStatus: response.status,
    title,
    description,
    wordCount,
    links: { total: links.length, internal: internalLinks, external: externalLinks },
    images: { total: images.length, missingAlt },
    structuredDataBlocks: jsonLdScripts.length,
    robotsUrl,
    sitemapUrl,
    aiBots,
    severityCounts,
    scores,
    issues: issues.sort((a, b) => ['critical','high','medium','low','info'].indexOf(a.severity) - ['critical','high','medium','low','info'].indexOf(b.severity))
  };
}
