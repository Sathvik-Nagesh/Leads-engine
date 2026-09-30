/**
 * Prisma Seed — Brandex Capability Library
 *
 * Run with: npx prisma db seed
 * Or: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CAPABILITIES = [
  // ── TECHNOLOGY ─────────────────────────────────────────────
  {
    name: 'Website Development',
    category: 'TECHNOLOGY' as const,
    description: 'Design and development of professional business websites — from simple brochure sites to complex portals.',
    idealCustomers: 'Businesses with no website, outdated websites, poor mobile experience, or low online visibility.',
    positiveSignals: [
      'no website found', 'website returns error', 'non-mobile-friendly website',
      'very old website', 'no HTTPS', 'website last updated 5+ years ago',
      'Wix/Blogger site', 'poor page speed', 'no clear CTA',
      'competitor has better website', 'business expanding but no online presence',
    ],
    negativeSignals: [
      'recently relaunched website', 'has professional Next.js/React site',
      'active Webflow site with strong content', 'just hired a web agency',
    ],
    evidenceRequirements: [
      'Observed website quality or absence',
      'Technical audit findings',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific website gap observed during research',
      'Competitor comparison (if researched)',
      'Missed conversion opportunity',
    ],
    prohibitedClaims: [
      'We guarantee X conversions or leads',
      'Your current site is the worst I\'ve seen',
      'You\'re losing ₹X because of your website',
    ],
    enabled: true,
  },
  {
    name: 'Web Applications',
    category: 'TECHNOLOGY' as const,
    description: 'Custom web-based tools, portals, dashboards, and internal applications.',
    idealCustomers: 'Businesses with manual processes, spreadsheet-driven workflows, or needs for a customer portal.',
    positiveSignals: [
      'manual order tracking', 'no customer portal', 'relies on WhatsApp for orders',
      'spreadsheet-based inventory', 'multiple staff manually coordinating',
      'hiring operations staff', 'expanding team needing internal tools',
    ],
    negativeSignals: [
      'already using mature ERP', 'dedicated IT team building internal tools',
    ],
    evidenceRequirements: [
      'Evidence of manual process or workflow gap',
      'Business size and operational complexity',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific operational bottleneck observed',
      'Scaling pain as company grows',
    ],
    prohibitedClaims: [
      'This will save you exactly X hours per week',
      'Your competitors all have portals',
    ],
    enabled: true,
  },
  {
    name: 'Custom CRM',
    category: 'TECHNOLOGY' as const,
    description: 'Tailor-made CRM systems for managing leads, customers, and sales pipelines.',
    idealCustomers: 'B2B businesses, service companies, agencies, or any business managing customer relationships at scale without a proper system.',
    positiveSignals: [
      'no lead capture on website', 'uses WhatsApp for customer management',
      'multiple sales staff', 'mentions "follow-up" issues', 'high customer volume',
      'no booking/enquiry system', 'growing sales team', 'hiring sales staff',
    ],
    negativeSignals: [
      'already on Salesforce', 'already on HubSpot', 'already on Zoho CRM',
      'very small solo operation unlikely to need CRM',
    ],
    evidenceRequirements: [
      'Evidence of customer management gap',
      'Evidence of multiple customers or enquiries',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'No visible lead capture or follow-up workflow',
      'Business growing but managing on WhatsApp',
    ],
    prohibitedClaims: [
      'You are losing leads every day',
      'Your competitors use CRM and you don\'t',
    ],
    enabled: true,
  },
  {
    name: 'Business Automation',
    category: 'TECHNOLOGY' as const,
    description: 'Workflow automation using tools like Zapier, n8n, or custom solutions to connect systems and reduce manual work.',
    idealCustomers: 'Businesses with repetitive manual processes, disconnected tools, or staff doing avoidable data entry.',
    positiveSignals: [
      'multiple disconnected tools', 'manual reporting mentioned', 'hiring admin staff',
      'uses many SaaS tools', 'manual invoicing', 'no system integration',
    ],
    negativeSignals: [
      'already has automation infrastructure', 'IT team building automations',
    ],
    evidenceRequirements: [
      'Observable manual workflow or tool fragmentation',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific repetitive process observed or inferred',
      'Multiple tools that could be connected',
    ],
    prohibitedClaims: [
      'This will eliminate X employees',
      'You are wasting ₹X on manual work',
    ],
    enabled: true,
  },
  {
    name: 'AI Automation',
    category: 'TECHNOLOGY' as const,
    description: 'AI-powered tools for customer support, content generation, data analysis, or intelligent process automation.',
    idealCustomers: 'Forward-thinking businesses looking to apply AI to real operational problems — not AI for AI\'s sake.',
    positiveSignals: [
      'high volume customer enquiries', 'repetitive support tickets', 'content-heavy business',
      'data analysis needs', 'hiring AI or data roles', 'exploring digital transformation',
    ],
    negativeSignals: [
      'explicitly against AI', 'very simple business with no AI use case',
    ],
    evidenceRequirements: [
      'Observable high-volume or repetitive operation that AI could address',
      'Evidence the company is open to technology',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific high-volume process where AI applies',
      'Identified bottleneck matching an AI solution',
    ],
    prohibitedClaims: [
      'AI will replace all your staff',
      'Every business needs AI',
      'Our AI is the best in the market',
    ],
    enabled: true,
  },
  {
    name: 'Cybersecurity',
    category: 'TECHNOLOGY' as const,
    description: 'Security assessments, implementation, and training for businesses handling sensitive data or at risk.',
    idealCustomers: 'Businesses in finance, healthcare, legal, or handling personal data — or any business worried about data breaches.',
    positiveSignals: [
      'handles financial or health data', 'runs e-commerce', 'hiring security staff',
      'recently experienced breach (if public)', 'no HTTPS', 'outdated software detected',
    ],
    negativeSignals: [
      'has dedicated security team', 'already ISO 27001 certified',
    ],
    evidenceRequirements: [
      'Observable security gap (no HTTPS, outdated stack)',
      'Industry that typically handles sensitive data',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific observable security gap',
      'Industry-relevant risk',
    ],
    prohibitedClaims: [
      'You will be hacked if you don\'t act now',
      'Your current setup is insecure',
    ],
    enabled: true,
  },

  // ── GROWTH ─────────────────────────────────────────────────
  {
    name: 'SEO',
    category: 'GROWTH' as const,
    description: 'Search engine optimisation to improve organic visibility for relevant keywords.',
    idealCustomers: 'Businesses that rely on local or organic search for customer discovery.',
    positiveSignals: [
      'no meta description', 'no structured data', 'thin content', 'no blog',
      'no H1 tag', 'competitor ranks higher for obvious keywords',
      'local business with no GMB presence', 'no sitemap',
    ],
    negativeSignals: [
      'already ranking #1 for target terms', 'has active SEO agency relationship',
    ],
    evidenceRequirements: [
      'Observable SEO gaps from website audit',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific observable SEO gap',
      'Competitor comparison for local search',
    ],
    prohibitedClaims: [
      'We guarantee first page ranking',
      'Your site gets zero traffic',
    ],
    enabled: true,
  },
  {
    name: 'Digital Marketing',
    category: 'GROWTH' as const,
    description: 'Paid digital advertising across Google, Meta, and other relevant channels.',
    idealCustomers: 'Businesses looking to grow customer acquisition through paid channels.',
    positiveSignals: [
      'no tracking pixel detected', 'no advertising signals', 'growing business',
      'new product/service launched', 'hiring sales/marketing staff',
    ],
    negativeSignals: [
      'already running sophisticated ad campaigns', 'in-house marketing team',
    ],
    evidenceRequirements: [
      'Evidence the business needs/wants customer acquisition help',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'New launch that would benefit from paid traffic',
      'Growth signal without corresponding marketing infrastructure',
    ],
    prohibitedClaims: [
      'You are leaving money on the table',
      'Your competitors spend ₹X on ads',
    ],
    enabled: true,
  },
  {
    name: 'Social Media',
    category: 'GROWTH' as const,
    description: 'Social media management and content strategy for business growth.',
    idealCustomers: 'Businesses that have social profiles but post inconsistently or lack strategy.',
    positiveSignals: [
      'social profiles found but inactive', 'last post 3+ months ago',
      'consumer-facing business with no social presence', 'weak engagement on posts',
    ],
    negativeSignals: [
      'active social media manager', 'posting daily with high engagement',
    ],
    evidenceRequirements: [
      'Observable social media gap or inactivity',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Inactive profile despite customer-facing nature of business',
    ],
    prohibitedClaims: [
      'You are invisible on social media',
    ],
    enabled: true,
  },
  {
    name: 'Lead Generation',
    category: 'GROWTH' as const,
    description: 'Outbound and inbound lead generation strategies and execution.',
    idealCustomers: 'B2B businesses that need a systematic approach to finding and engaging new clients.',
    positiveSignals: [
      'B2B business', 'no lead capture form', 'no gated content', 'no newsletter',
      'sales team without a defined pipeline',
    ],
    negativeSignals: [
      'consumer brand not suited for outbound', 'already has mature inbound engine',
    ],
    evidenceRequirements: [
      'Evidence of B2B sales need',
      'Observable gap in lead capture or pipeline',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'No visible lead generation infrastructure on website',
    ],
    prohibitedClaims: [],
    enabled: true,
  },

  // ── CREATIVE ───────────────────────────────────────────────
  {
    name: 'Branding',
    category: 'CREATIVE' as const,
    description: 'Brand identity development — logo, colors, typography, positioning, brand guidelines.',
    idealCustomers: 'New businesses, rebranding businesses, or businesses with inconsistent visual identity.',
    positiveSignals: [
      'inconsistent branding across pages', 'no visible brand kit', 'low-quality logo',
      'rebranding signals', 'new business recently launched',
    ],
    negativeSignals: [
      'strong consistent brand with clear guidelines', 'recent brand refresh',
    ],
    evidenceRequirements: [
      'Observable branding inconsistency or weakness',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific observed branding inconsistency',
    ],
    prohibitedClaims: [
      'Your logo is terrible',
      'Your brand looks unprofessional',
    ],
    enabled: true,
  },
  {
    name: 'Design',
    category: 'CREATIVE' as const,
    description: 'UI/UX design, marketing collateral, presentations, and visual communication.',
    idealCustomers: 'Businesses needing design support without an in-house designer.',
    positiveSignals: [
      'poor visual design on website', 'no design assets visible', 'hiring for design roles',
    ],
    negativeSignals: [
      'in-house design team', 'recently produced high-quality design assets',
    ],
    evidenceRequirements: [
      'Observable design gap (ideally from visual evidence)',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific design gap observed',
    ],
    prohibitedClaims: [
      'Your design looks bad',
    ],
    enabled: true,
  },
  {
    name: 'Content',
    category: 'CREATIVE' as const,
    description: 'Content creation — blog posts, case studies, product copy, email sequences.',
    idealCustomers: 'Businesses that need regular content but lack time or internal writers.',
    positiveSignals: [
      'empty or non-existent blog', 'thin product descriptions', 'no case studies',
      'poor or generic website copy',
    ],
    negativeSignals: [
      'active blog with regular high-quality content', 'content team evident',
    ],
    evidenceRequirements: [
      'Observable content gap on website',
    ],
    relatedCapabilityIds: [],
    pitchAngles: [
      'Specific content gap observed',
    ],
    prohibitedClaims: [],
    enabled: true,
  },

  // ── BUSINESS INFRASTRUCTURE ────────────────────────────────
  {
    name: 'Office Automation',
    category: 'BUSINESS_INFRASTRUCTURE' as const,
    description: 'Office productivity — structured cabling, networking, printers, server setup.',
    idealCustomers: 'Businesses setting up new offices, expanding, or with outdated infrastructure.',
    positiveSignals: [
      'new office opening', 'expansion announcement', 'hiring rapidly', 'new location',
    ],
    negativeSignals: [],
    evidenceRequirements: [
      'Evidence of office setup need or expansion',
    ],
    relatedCapabilityIds: [],
    pitchAngles: ['New office or expansion context'],
    prohibitedClaims: [],
    enabled: true,
  },
  {
    name: 'CCTV & Security Systems',
    category: 'BUSINESS_INFRASTRUCTURE' as const,
    description: 'Physical security systems — CCTV, access control, monitoring.',
    idealCustomers: 'Retail businesses, warehouses, offices, educational institutions.',
    positiveSignals: [
      'retail store', 'warehouse', 'multi-location business', 'new office setup',
    ],
    negativeSignals: [],
    evidenceRequirements: [
      'Physical location evidence',
    ],
    relatedCapabilityIds: [],
    pitchAngles: ['Physical premises requiring monitoring'],
    prohibitedClaims: [],
    enabled: true,
  },
  {
    name: 'Furniture',
    category: 'BUSINESS_INFRASTRUCTURE' as const,
    description: 'Commercial furniture supply for offices, clinics, hospitality, education.',
    idealCustomers: 'Businesses setting up or refurbishing physical spaces.',
    positiveSignals: [
      'new office', 'expansion', 'clinic/hospital setup', 'co-working space',
    ],
    negativeSignals: [],
    evidenceRequirements: ['Physical space setup signal'],
    relatedCapabilityIds: [],
    pitchAngles: ['New or expanding physical space'],
    prohibitedClaims: [],
    enabled: true,
  },
  {
    name: 'Printing & Branding Materials',
    category: 'BUSINESS_INFRASTRUCTURE' as const,
    description: 'Business cards, banners, brochures, packaging, and branded materials.',
    idealCustomers: 'Any business needing physical marketing collateral or branded materials.',
    positiveSignals: [
      'new business', 'rebranding', 'event participation', 'new product launch',
    ],
    negativeSignals: [],
    evidenceRequirements: ['New launch or rebranding signal'],
    relatedCapabilityIds: [],
    pitchAngles: ['Rebranding or launch needing print materials'],
    prohibitedClaims: [],
    enabled: true,
  },

  // ── EDUCATION & COMMUNITY ──────────────────────────────────
  {
    name: 'Technical Workshops & Training',
    category: 'EDUCATION_COMMUNITY' as const,
    description: 'Corporate training, technical upskilling, and digital literacy programs.',
    idealCustomers: 'Companies investing in staff digital skills, or educational institutions.',
    positiveSignals: [
      'hiring technical staff', 'mentions training needs', 'growing tech team',
      'educational institution', 'NGO with digital programs',
    ],
    negativeSignals: [],
    evidenceRequirements: ['Evidence of training need or educational context'],
    relatedCapabilityIds: [],
    pitchAngles: ['Staff upskilling as part of a tech initiative'],
    prohibitedClaims: [],
    enabled: true,
  },
  {
    name: 'Student & Founder Programs',
    category: 'EDUCATION_COMMUNITY' as const,
    description: 'Incubation, mentoring, and technology programs for startups and students.',
    idealCustomers: 'Colleges, incubators, startup ecosystems, and educational institutions.',
    positiveSignals: [
      'college/university', 'startup incubator', 'accelerator', 'student entrepreneurship',
    ],
    negativeSignals: [],
    evidenceRequirements: ['Educational or incubation context'],
    relatedCapabilityIds: [],
    pitchAngles: ['Startup or student community program fit'],
    prohibitedClaims: [],
    enabled: true,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user
  const hashedPassword = await bcrypt.hash('brandex-admin-2024', 12);
  await prisma.user.upsert({
    where: { email: 'admin@brandex.in' },
    update: {},
    create: {
      email: 'admin@brandex.in',
      name: 'Brandex Admin',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });
  console.log('✓ Admin user created');

  // Seed capabilities
  let capabilityCount = 0;
  for (const cap of CAPABILITIES) {
    await prisma.capability.upsert({
      where: { name: cap.name },
      update: {
        description: cap.description,
        positiveSignals: cap.positiveSignals,
        negativeSignals: cap.negativeSignals,
        evidenceRequirements: cap.evidenceRequirements,
        pitchAngles: cap.pitchAngles,
        prohibitedClaims: cap.prohibitedClaims,
        enabled: cap.enabled,
      },
      create: {
        name: cap.name,
        category: cap.category,
        description: cap.description,
        idealCustomers: cap.idealCustomers,
        positiveSignals: cap.positiveSignals,
        negativeSignals: cap.negativeSignals,
        evidenceRequirements: cap.evidenceRequirements,
        relatedCapabilityIds: cap.relatedCapabilityIds,
        pitchAngles: cap.pitchAngles,
        prohibitedClaims: cap.prohibitedClaims,
        enabled: cap.enabled,
      },
    });
    capabilityCount++;
  }
  console.log(`✓ ${capabilityCount} capabilities seeded`);

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
