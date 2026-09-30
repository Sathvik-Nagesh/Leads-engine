/**
 * Deterministic Website Auditor
 *
 * Performs 60+ programmatic checks on fetched website HTML.
 * Does NOT call the LLM. All findings are facts, not opinions.
 *
 * The output feeds into AI analysis as DIRECT evidence.
 */

import * as cheerio from 'cheerio';
import type { FetchResult } from './website-fetcher';

export interface WebsiteAuditResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
  httpsEnabled: boolean;
  sslValid: boolean;
  redirectChain: string[];
  loadTimeMs: number;
  rawHtmlSize: number;

  // Structure
  hasTitle: boolean;
  title: string | null;
  hasMetaDescription: boolean;
  metaDescription: string | null;
  hasH1: boolean;
  h1Text: string | null;
  h2Texts: string[];
  hasCanonical: boolean;
  canonicalUrl: string | null;
  hasRobots: boolean;
  hasSitemap: boolean;
  hasFavicon: boolean;
  hasMobileViewport: boolean;

  // Contact & CTA
  hasPhone: boolean;
  phones: string[];
  hasEmail: boolean;
  emails: string[];
  hasWhatsApp: boolean;
  hasBookingLink: boolean;
  hasCTA: boolean;
  ctaTexts: string[];
  hasContactPage: boolean;
  hasContactForm: boolean;

  // Social
  hasSocialLinks: boolean;
  socialLinks: Record<string, string>;

  // Content
  hasBlog: boolean;
  hasPortfolio: boolean;
  hasPricing: boolean;
  hasCareers: boolean;
  pageWordCount: number;

  // Analytics & Tech
  hasAnalytics: boolean;
  analyticsTypes: string[];
  cms: string | null;
  framework: string | null;
  technologies: string[];

  // SEO
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  imageCount: number;
  imagesWithAlt: number;

  // Quality indicators
  hasAccessibilityIssues: boolean;
  accessibilityIssues: string[];

  // Extracted content (cleaned, for AI)
  extractedText: string;
  extractedLinks: Array<{ text: string; href: string }>;
  internalLinks: string[];
  externalLinks: string[];

  // Fetch error
  fetchError?: string;
}

// ── Detection patterns ──────────────────────────────────────

const PHONE_PATTERN = /(?:\+91[\s-]?)?(?:\(?0?\d{2,4}\)?[\s-]?)?\d{7,10}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const WHATSAPP_PATTERN = /(?:wa\.me|whatsapp\.com|api\.whatsapp)/i;

const CTA_KEYWORDS = [
  'get started', 'book now', 'schedule', 'contact us', 'get a quote',
  'request a demo', 'try free', 'sign up', 'get in touch', 'call us',
  'enquire now', 'enquiry', 'buy now', 'order now', 'apply now',
  'register', 'download', 'free consultation', 'talk to us',
];

const BOOKING_PATTERNS = [
  /calendly\.com/i, /acuityscheduling/i, /booksy/i, /zocdoc/i,
  /fresha/i, /zcal\./i, /tidycal/i, /book\s*(a|an|online)?\s*(appointment|call|demo|session)/i,
];

const ANALYTICS_PATTERNS = [
  { pattern: /google-analytics|googletagmanager|gtag\(/i, name: 'Google Analytics' },
  { pattern: /facebook\.com\/tr|fbq\(/i, name: 'Facebook Pixel' },
  { pattern: /hotjar/i, name: 'Hotjar' },
  { pattern: /clarity\.ms/i, name: 'Microsoft Clarity' },
  { pattern: /mixpanel/i, name: 'Mixpanel' },
  { pattern: /segment\.com/i, name: 'Segment' },
];

const CMS_PATTERNS = [
  { pattern: /wp-content|wp-json|wordpress/i, name: 'WordPress' },
  { pattern: /wix\.com|wixstatic/i, name: 'Wix' },
  { pattern: /squarespace\.com|squarespace-cdn/i, name: 'Squarespace' },
  { pattern: /shopify\.com|myshopify/i, name: 'Shopify' },
  { pattern: /webflow\.io|webflow-prod/i, name: 'Webflow' },
  { pattern: /ghost-frontend/i, name: 'Ghost' },
  { pattern: /drupal/i, name: 'Drupal' },
  { pattern: /joomla/i, name: 'Joomla' },
  { pattern: /duda\.co/i, name: 'Duda' },
];

const FRAMEWORK_PATTERNS = [
  { pattern: /__NEXT_DATA__/i, name: 'Next.js' },
  { pattern: /nuxt\.js|__nuxt/i, name: 'Nuxt.js' },
  { pattern: /data-react-root|react-dom/i, name: 'React' },
  { pattern: /ng-version|angular/i, name: 'Angular' },
  { pattern: /\bvue\b/i, name: 'Vue.js' },
  { pattern: /gatsby-focus-wrapper/i, name: 'Gatsby' },
  { pattern: /astro-root|astro-island/i, name: 'Astro' },
];

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  linkedin: /linkedin\.com\/(company|in)\//i,
  facebook: /facebook\.com\/(?!tr\b)/i,
  instagram: /instagram\.com\//i,
  twitter: /(?:twitter|x)\.com\//i,
  youtube: /youtube\.com\//i,
};

export function auditWebsite(fetchResult: FetchResult): WebsiteAuditResult {
  if (fetchResult.error || !fetchResult.html) {
    return makeErrorAudit(fetchResult);
  }

  const html = fetchResult.html;
  const $ = cheerio.load(html);

  // ── Title ─────────────────────────────────────────────────
  const title = $('title').first().text().trim() || null;

  // ── Meta description ──────────────────────────────────────
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;

  // ── Headings ──────────────────────────────────────────────
  const h1Text = $('h1').first().text().trim() || null;
  const hasH1 = Boolean(h1Text);
  const h2Texts = $('h2')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);

  // ── Canonical ─────────────────────────────────────────────
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || null;

  // ── Viewport ──────────────────────────────────────────────
  const viewport = $('meta[name="viewport"]').attr('content') ?? '';
  const hasMobileViewport = viewport.includes('width=device-width');

  // ── Favicon ───────────────────────────────────────────────
  const hasFavicon =
    $('link[rel="icon"], link[rel="shortcut icon"]').length > 0 ||
    html.includes('favicon');

  // ── Sitemap / Robots ──────────────────────────────────────
  // We check the HTML for references; actual sitemap.xml check is async
  const hasRobots = html.includes('robots') || $('meta[name="robots"]').length > 0;
  const hasSitemap = html.toLowerCase().includes('sitemap');

  // ── Structured data ───────────────────────────────────────
  const structuredDataScripts = $('script[type="application/ld+json"]');
  const structuredDataTypes: string[] = [];
  structuredDataScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '{}');
      const type = data['@type'] ?? data?.mainEntity?.['@type'];
      if (type) structuredDataTypes.push(Array.isArray(type) ? type.join(', ') : type);
    } catch { /* skip invalid JSON */ }
  });

  // ── Contact & CTA ─────────────────────────────────────────
  const bodyText = $('body').text();
  const htmlLower = html.toLowerCase();

  const phoneMatches = [...(bodyText.match(PHONE_PATTERN) ?? [])].filter(
    (p) => p.replace(/\D/g, '').length >= 7
  );
  const emailMatches = [...(bodyText.match(EMAIL_PATTERN) ?? [])].filter(
    (e) => !e.includes('@sentry') && !e.includes('@example')
  );

  const hasWhatsApp = WHATSAPP_PATTERN.test(html);

  const hasBookingLink = BOOKING_PATTERNS.some((p) =>
    typeof p === 'object' && 'test' in p ? p.test(html) : html.includes(p)
  );

  // CTA detection — check buttons, links, headings for CTA text
  const ctaTexts: string[] = [];
  $('a, button, [class*="cta"], [class*="btn"]').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (CTA_KEYWORDS.some((kw) => text.includes(kw))) {
      const original = $(el).text().trim();
      if (original && !ctaTexts.includes(original)) ctaTexts.push(original);
    }
  });

  const hasContactPage =
    $('a[href*="contact"]').length > 0 ||
    htmlLower.includes('/contact');

  const hasContactForm =
    $('form').length > 0 ||
    $('input[type="text"], textarea').length > 2;

  // ── Social links ──────────────────────────────────────────
  const socialLinks: Record<string, string> = {};
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
      if (pattern.test(href) && !socialLinks[platform]) {
        socialLinks[platform] = href;
      }
    }
  });

  // ── Content sections ──────────────────────────────────────
  const hasBlog =
    htmlLower.includes('/blog') ||
    htmlLower.includes('/news') ||
    htmlLower.includes('/articles');

  const hasPortfolio =
    htmlLower.includes('/portfolio') ||
    htmlLower.includes('/work') ||
    htmlLower.includes('/projects') ||
    htmlLower.includes('/case-studies');

  const hasPricing =
    htmlLower.includes('/pricing') ||
    htmlLower.includes('/plans') ||
    htmlLower.includes('pricing') ||
    htmlLower.includes('₹') ||
    htmlLower.includes('per month') ||
    htmlLower.includes('/month');

  const hasCareers =
    htmlLower.includes('/careers') ||
    htmlLower.includes('/jobs') ||
    htmlLower.includes('/join-us') ||
    htmlLower.includes('we are hiring') ||
    htmlLower.includes("we're hiring");

  // ── Analytics detection ───────────────────────────────────
  const analyticsTypes: string[] = [];
  for (const { pattern, name } of ANALYTICS_PATTERNS) {
    if (pattern.test(html)) analyticsTypes.push(name);
  }

  // ── CMS detection ─────────────────────────────────────────
  let cms: string | null = null;
  for (const { pattern, name } of CMS_PATTERNS) {
    if (pattern.test(html)) { cms = name; break; }
  }

  // ── Framework detection ───────────────────────────────────
  let framework: string | null = null;
  for (const { pattern, name } of FRAMEWORK_PATTERNS) {
    if (pattern.test(html)) { framework = name; break; }
  }

  // ── Additional technologies ───────────────────────────────
  const technologies: string[] = [];
  if (html.includes('cdn.jsdelivr.net/npm/bootstrap')) technologies.push('Bootstrap');
  if (html.includes('jquery')) technologies.push('jQuery');
  if (html.includes('tailwind')) technologies.push('Tailwind CSS');
  if (html.includes('animate.css')) technologies.push('Animate.css');
  if (html.includes('font-awesome') || html.includes('fontawesome')) technologies.push('Font Awesome');
  if (html.includes('fonts.googleapis.com')) technologies.push('Google Fonts');
  if (html.includes('slick') || html.includes('swiper') || html.includes('owl')) technologies.push('Carousel/Slider');
  if (cms) technologies.push(cms);
  if (framework) technologies.push(framework);

  // ── Images & accessibility ────────────────────────────────
  const allImages = $('img');
  const imageCount = allImages.length;
  const imagesWithAlt = allImages.filter((_, el) => $(el).attr('alt') !== undefined).length;
  const imagesWithoutAlt = imageCount - imagesWithAlt;

  const accessibilityIssues: string[] = [];
  if (imagesWithoutAlt > 0) accessibilityIssues.push(`${imagesWithoutAlt} images missing alt text`);
  if (!hasMobileViewport) accessibilityIssues.push('No mobile viewport meta tag');
  if (!hasH1) accessibilityIssues.push('No H1 heading');

  // ── Word count ────────────────────────────────────────────
  // Remove script/style from text count
  $('script, style, nav, footer, header').remove();
  const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
  const pageWordCount = cleanText.split(/\s+/).filter(Boolean).length;

  // ── Extract text for AI (cleaned) ─────────────────────────
  // Re-load for clean extraction
  const $clean = cheerio.load(fetchResult.html);
  $clean('script, style, nav, footer, noscript, iframe, [aria-hidden="true"]').remove();
  const extractedText = $clean('body').text().replace(/\s+/g, ' ').trim().slice(0, 20_000);

  // ── Links ─────────────────────────────────────────────────
  const domain = new URL(fetchResult.finalUrl || fetchResult.url).hostname;
  const extractedLinks: Array<{ text: string; href: string }> = [];
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim().slice(0, 100);
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    extractedLinks.push({ text, href });

    if (href.includes(domain)) internalLinks.push(href);
    else if (href.startsWith('http')) externalLinks.push(href);
  });

  return {
    url: fetchResult.url,
    finalUrl: fetchResult.finalUrl,
    httpStatus: fetchResult.statusCode,
    httpsEnabled: fetchResult.httpsEnabled,
    sslValid: fetchResult.sslValid,
    redirectChain: fetchResult.redirectChain,
    loadTimeMs: fetchResult.loadTimeMs,
    rawHtmlSize: fetchResult.contentLength,

    hasTitle: Boolean(title),
    title,
    hasMetaDescription: Boolean(metaDescription),
    metaDescription,
    hasH1: Boolean(h1Text),
    h1Text,
    h2Texts,
    hasCanonical: Boolean(canonicalUrl),
    canonicalUrl,
    hasRobots,
    hasSitemap,
    hasFavicon,
    hasMobileViewport,

    hasPhone: phoneMatches.length > 0,
    phones: [...new Set(phoneMatches)].slice(0, 5),
    hasEmail: emailMatches.length > 0,
    emails: [...new Set(emailMatches)].slice(0, 5),
    hasWhatsApp,
    hasBookingLink,
    hasCTA: ctaTexts.length > 0,
    ctaTexts: ctaTexts.slice(0, 5),
    hasContactPage,
    hasContactForm,

    hasSocialLinks: Object.keys(socialLinks).length > 0,
    socialLinks,

    hasBlog,
    hasPortfolio,
    hasPricing,
    hasCareers,
    pageWordCount,

    hasAnalytics: analyticsTypes.length > 0,
    analyticsTypes,
    cms,
    framework,
    technologies: [...new Set(technologies)],

    hasStructuredData: structuredDataTypes.length > 0,
    structuredDataTypes,
    imageCount,
    imagesWithAlt,

    hasAccessibilityIssues: accessibilityIssues.length > 0,
    accessibilityIssues,

    extractedText,
    extractedLinks: extractedLinks.slice(0, 50),
    internalLinks: internalLinks.slice(0, 30),
    externalLinks: externalLinks.slice(0, 20),
  };
}

function makeErrorAudit(fetchResult: FetchResult): WebsiteAuditResult {
  return {
    url: fetchResult.url,
    finalUrl: fetchResult.finalUrl || fetchResult.url,
    httpStatus: fetchResult.statusCode,
    httpsEnabled: fetchResult.httpsEnabled,
    sslValid: fetchResult.sslValid,
    redirectChain: fetchResult.redirectChain,
    loadTimeMs: fetchResult.loadTimeMs,
    rawHtmlSize: 0,
    hasTitle: false, title: null,
    hasMetaDescription: false, metaDescription: null,
    hasH1: false, h1Text: null, h2Texts: [],
    hasCanonical: false, canonicalUrl: null,
    hasRobots: false, hasSitemap: false, hasFavicon: false, hasMobileViewport: false,
    hasPhone: false, phones: [],
    hasEmail: false, emails: [],
    hasWhatsApp: false, hasBookingLink: false,
    hasCTA: false, ctaTexts: [],
    hasContactPage: false, hasContactForm: false,
    hasSocialLinks: false, socialLinks: {},
    hasBlog: false, hasPortfolio: false, hasPricing: false, hasCareers: false,
    pageWordCount: 0,
    hasAnalytics: false, analyticsTypes: [],
    cms: null, framework: null, technologies: [],
    hasStructuredData: false, structuredDataTypes: [],
    imageCount: 0, imagesWithAlt: 0,
    hasAccessibilityIssues: false, accessibilityIssues: [],
    extractedText: '',
    extractedLinks: [], internalLinks: [], externalLinks: [],
    fetchError: fetchResult.error,
  };
}
