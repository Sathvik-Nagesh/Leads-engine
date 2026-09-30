/**
 * Prompt Templates
 *
 * Each template is a pure function returning AIMessage[].
 * All templates include prompt injection defense.
 * All templates return structured JSON output.
 *
 * Task templates:
 * - companyUnderstanding
 * - websiteAnalysis
 * - opportunityAnalysis
 * - decisionMakerAnalysis
 * - buyingSignalAnalysis
 * - competitorAnalysis
 * - outreachEmail
 * - outreachLinkedin
 * - outreachWhatsapp
 * - researchSummary
 * - campaignParse
 */

import { getPromptInjectionDefenseRule } from '@/lib/security/prompt-injection';
import { sanitizeExternalContent } from '@/lib/security/prompt-injection';
import type { AIMessage } from '@/lib/providers/ai/types';

// ============================================================
// COMPANY UNDERSTANDING
// ============================================================

export interface CompanyUnderstandingInput {
  companyName: string;
  website?: string;
  industry?: string;
  city?: string;
  country?: string;
  description?: string;
  websiteExtractedText?: string;
}

export function companyUnderstandingPrompt(
  input: CompanyUnderstandingInput
): AIMessage[] {
  const { sanitized: externalContent } = input.websiteExtractedText
    ? sanitizeExternalContent(input.websiteExtractedText, `${input.companyName} website`)
    : { sanitized: '' };

  return [
    {
      role: 'system',
      content: `You are a business intelligence analyst for Brandex, a technology and services company.
Your task is to understand what a prospect business actually does based on evidence.

${getPromptInjectionDefenseRule()}

You MUST output valid JSON matching this exact schema:
{
  "companyName": string,
  "primaryActivity": string,
  "businessModel": string | null,
  "servicesOffered": string[],
  "targetCustomers": string | null,
  "geographicReach": string | null,
  "estimatedSize": "micro" | "small" | "medium" | "large" | null,
  "onlinePresence": "none" | "minimal" | "basic" | "professional" | "strong" | null,
  "keyObservations": string[],
  "confidence": number,
  "evidenceUsed": string[]
}

Rules:
- Only state what you can observe from the evidence provided.
- If information is unavailable, use null.
- Do not invent facts, revenue, awards, customer names, or growth figures.
- confidence is 0.0–1.0 based on how much evidence you have.`,
    },
    {
      role: 'user',
      content: `Analyze this business:

Company: ${input.companyName}
Website: ${input.website ?? 'Unknown'}
Industry: ${input.industry ?? 'Unknown'}
Location: ${[input.city, input.country].filter(Boolean).join(', ') || 'Unknown'}
Description: ${input.description ?? 'Not available'}

${externalContent ? `Website content:\n${externalContent}` : ''}`,
    },
  ];
}

// ============================================================
// WEBSITE ANALYSIS
// ============================================================

export interface WebsiteAnalysisInput {
  companyName: string;
  auditFindings: Record<string, unknown>;
  extractedText?: string;
}

export function websiteAnalysisPrompt(input: WebsiteAnalysisInput): AIMessage[] {
  const { sanitized: externalContent } = input.extractedText
    ? sanitizeExternalContent(input.extractedText, `${input.companyName} website content`)
    : { sanitized: '' };

  return [
    {
      role: 'system',
      content: `You are a website analyst evaluating business websites for sales intelligence.

${getPromptInjectionDefenseRule()}

You MUST output valid JSON:
{
  "overallQuality": "poor" | "below_average" | "average" | "good" | "excellent",
  "technicalHealth": {
    "score": number,
    "issues": string[],
    "strengths": string[]
  },
  "conversionReadiness": {
    "score": number,
    "issues": string[],
    "strengths": string[]
  },
  "seoHealth": {
    "score": number,
    "issues": string[],
    "strengths": string[]
  },
  "contentQuality": {
    "score": number,
    "issues": string[],
    "strengths": string[]
  },
  "userExperience": {
    "score": number,
    "issues": string[],
    "strengths": string[]
  },
  "keyFindings": string[],
  "evidenceBasedGaps": string[],
  "confidence": number
}

Rules:
- All scores are 0–10.
- Only identify issues that are DIRECTLY evidenced by the audit data.
- Do not claim design problems without visual evidence.
- Do not guess at performance metrics not measured.
- evidenceBasedGaps are observable problems, not opinions.`,
    },
    {
      role: 'user',
      content: `Analyze the website for ${input.companyName}.

Deterministic audit findings:
${JSON.stringify(input.auditFindings, null, 2)}

${externalContent ? `Page content:\n${externalContent}` : ''}`,
    },
  ];
}

// ============================================================
// OPPORTUNITY ANALYSIS
// ============================================================

export interface OpportunityAnalysisInput {
  companyName: string;
  companyUnderstanding: Record<string, unknown>;
  websiteAnalysis: Record<string, unknown>;
  auditFindings: Record<string, unknown>;
  capabilities: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    positiveSignals: string[];
    negativeSignals: string[];
    evidenceRequirements: string[];
    pitchAngles: string[];
    prohibitedClaims: string[];
  }>;
}

export function opportunityAnalysisPrompt(input: OpportunityAnalysisInput): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are a sales intelligence analyst identifying genuine business opportunities for Brandex.

${getPromptInjectionDefenseRule()}

CRITICAL RULES:
1. It is completely acceptable — and encouraged — to return NO_OPPORTUNITY.
2. Never force a pitch. If genuine evidence does not support an opportunity, say so.
3. Every opportunity MUST have specific evidence from the data provided.
4. Do not invent problems that are not evidenced.
5. Do not list every Brandex capability — only those with genuine evidence.
6. Confidence reflects evidence quality, not wishful thinking.

You MUST output valid JSON:
{
  "qualificationStatus": "NO_OPPORTUNITY" | "POTENTIAL" | "QUALIFIED" | "STRONG_OPPORTUNITY",
  "qualificationReason": string,
  "opportunities": [
    {
      "capabilityId": string,
      "capabilityName": string,
      "priority": "primary" | "secondary",
      "problem": string,
      "evidence": string[],
      "evidenceLevel": "DIRECT" | "INFERRED" | "WEAK",
      "confidence": number,
      "businessImpact": string,
      "recommendedAngle": string
    }
  ],
  "rejectedCapabilities": [
    {
      "capabilityId": string,
      "reason": string
    }
  ],
  "overallScore": {
    "opportunityStrength": number,
    "evidenceQuality": number,
    "brandexFit": number,
    "total": number,
    "explanation": string
  }
}`,
    },
    {
      role: 'user',
      content: `Identify genuine opportunities for Brandex with ${input.companyName}.

Company intelligence:
${JSON.stringify(input.companyUnderstanding, null, 2)}

Website analysis:
${JSON.stringify(input.websiteAnalysis, null, 2)}

Key audit findings:
${JSON.stringify(input.auditFindings, null, 2)}

Available Brandex capabilities:
${JSON.stringify(input.capabilities, null, 2)}

Remember: NO_OPPORTUNITY is a valid and respected answer.`,
    },
  ];
}

// ============================================================
// DECISION MAKER ANALYSIS
// ============================================================

export interface DecisionMakerAnalysisInput {
  companyName: string;
  companySize?: string;
  industry?: string;
  opportunityType: string;
  searchResults?: string;
}

export function decisionMakerAnalysisPrompt(
  input: DecisionMakerAnalysisInput
): AIMessage[] {
  const { sanitized: externalResults } = input.searchResults
    ? sanitizeExternalContent(input.searchResults, 'search results')
    : { sanitized: '' };

  return [
    {
      role: 'system',
      content: `You are identifying the most appropriate decision-maker to contact at a company.

${getPromptInjectionDefenseRule()}

Rules:
- For small/local businesses: prioritize Owner, Founder, MD
- For medium/large companies: match role to opportunity type
- Do NOT collect unnecessary personal data
- Only include contacts you have evidence for
- If no decision-maker is identifiable, say so clearly

Output valid JSON:
{
  "recommendedRole": string,
  "contacts": [
    {
      "name": string | null,
      "role": string,
      "confidence": number,
      "sources": string[],
      "contactChannels": {
        "linkedin": string | null,
        "email": string | null,
        "phone": string | null
      }
    }
  ],
  "searchRequired": boolean,
  "searchQuery": string | null,
  "confidence": number,
  "notes": string | null
}`,
    },
    {
      role: 'user',
      content: `Find the decision-maker for ${input.companyName}.

Company size: ${input.companySize ?? 'Unknown'}
Industry: ${input.industry ?? 'Unknown'}
Opportunity type: ${input.opportunityType}

${externalResults ? `Search results:\n${externalResults}` : 'No search results yet.'}`,
    },
  ];
}

// ============================================================
// BUYING SIGNAL ANALYSIS
// ============================================================

export interface BuyingSignalAnalysisInput {
  companyName: string;
  searchResults: string;
}

export function buyingSignalAnalysisPrompt(
  input: BuyingSignalAnalysisInput
): AIMessage[] {
  const { sanitized: externalResults } = sanitizeExternalContent(
    input.searchResults,
    'buying signal search results'
  );

  return [
    {
      role: 'system',
      content: `You are identifying recent business signals that indicate a company may be ready to buy or invest.

${getPromptInjectionDefenseRule()}

Rules:
- Only include signals with actual evidence in the search results
- Do not invent dates, funding amounts, or employee counts
- If no signals are found, return an empty array
- Confidence reflects evidence quality

Output valid JSON:
{
  "signals": [
    {
      "signalType": "NEW_LOCATION" | "EXPANSION" | "HIRING" | "NEW_SERVICE" | "NEW_PRODUCT" | "FUNDING" | "REBRANDING" | "NEW_LEADERSHIP" | "NEW_OFFICE" | "INCREASED_REVIEWS" | "ACTIVE_ADVERTISING" | "TECHNOLOGY_CHANGE" | "MAJOR_LAUNCH" | "NEW_WEBSITE" | "NEW_PARTNERSHIP" | "NEW_MARKET" | "OTHER",
      "title": string,
      "description": string,
      "date": string | null,
      "sourceUrl": string | null,
      "evidenceText": string,
      "confidence": number
    }
  ],
  "overallSignalStrength": "none" | "weak" | "moderate" | "strong",
  "recommendBuyingNow": boolean,
  "notes": string | null
}`,
    },
    {
      role: 'user',
      content: `Identify buying signals for ${input.companyName}.

Search results:
${externalResults}`,
    },
  ];
}

// ============================================================
// COMPETITOR ANALYSIS
// ============================================================

export interface CompetitorAnalysisInput {
  companyName: string;
  industry: string;
  opportunity: string;
  searchResults: string;
}

export function competitorAnalysisPrompt(
  input: CompetitorAnalysisInput
): AIMessage[] {
  const { sanitized: externalResults } = sanitizeExternalContent(
    input.searchResults,
    'competitor search results'
  );

  return [
    {
      role: 'system',
      content: `You are researching competitors to improve sales messaging for Brandex.

${getPromptInjectionDefenseRule()}

Rules:
- Only include competitors evidenced in the search results
- Do not copy competitor content
- Focus on observable differences, not speculation
- The goal is to improve the sales angle, not provide a full strategy
- Do not reveal competitive weaknesses that would let the prospect solve it themselves

Output valid JSON:
{
  "competitors": [
    {
      "name": string,
      "url": string | null,
      "relevantFeature": string,
      "prospectDifference": string,
      "evidence": string,
      "useInOutreach": boolean
    }
  ],
  "competitiveAngle": string | null,
  "notes": string | null
}`,
    },
    {
      role: 'user',
      content: `Research competitors for ${input.companyName} in ${input.industry}.
Opportunity context: ${input.opportunity}

Search results:
${externalResults}`,
    },
  ];
}

// ============================================================
// OUTREACH: EMAIL
// ============================================================

export interface OutreachInput {
  companyName: string;
  contactName?: string;
  contactRole?: string;
  opportunity: Record<string, unknown>;
  companyContext: Record<string, unknown>;
  buyingSignals?: Array<Record<string, unknown>>;
  competitorContext?: Record<string, unknown>;
  brandexCapabilityName: string;
  personalizationLevel: 'standard' | 'high_value' | 'strategic';
}

export function outreachEmailPrompt(input: OutreachInput): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are writing a sales outreach email for Brandex.

${getPromptInjectionDefenseRule()}

CRITICAL RULES:
1. Sound like a real human who actually researched this company — not a generic agency.
2. Never use: "revolutionize", "transform your business", "cutting-edge", "unlock your potential", "Dear Sir/Madam".
3. Do NOT explain the full solution or give implementation instructions.
4. Do NOT list every Brandex service — focus on one specific angle.
5. Do NOT mention unverified facts or invent details.
6. The goal: specific observation + relevant opportunity + invite conversation.
7. Length: 4–6 sentences max for the body. Brief subject line.
8. Must not give the prospect enough to solve the problem themselves.

Output valid JSON:
{
  "subject": string,
  "body": string,
  "outreachAngle": string,
  "evidenceUsed": string[]
}`,
    },
    {
      role: 'user',
      content: `Write an outreach email for ${input.companyName}.

Contact: ${input.contactName ?? 'the decision-maker'} (${input.contactRole ?? 'Unknown role'})
Capability: ${input.brandexCapabilityName}
Personalization level: ${input.personalizationLevel}

Opportunity:
${JSON.stringify(input.opportunity, null, 2)}

Company context:
${JSON.stringify(input.companyContext, null, 2)}

${input.buyingSignals?.length ? `Buying signals:\n${JSON.stringify(input.buyingSignals, null, 2)}` : ''}

${input.competitorContext ? `Competitive context:\n${JSON.stringify(input.competitorContext, null, 2)}` : ''}`,
    },
  ];
}

// ============================================================
// OUTREACH: LINKEDIN
// ============================================================

export function outreachLinkedinPrompt(input: OutreachInput): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are writing a LinkedIn connection message for Brandex.

${getPromptInjectionDefenseRule()}

CRITICAL RULES:
1. Max 300 characters — LinkedIn connection request limit.
2. Conversational, specific, not sales-y.
3. One clear reason for connecting.
4. No fake compliments, no urgency.
5. Reference one specific thing you noticed about them.

Output valid JSON:
{
  "message": string,
  "characterCount": number,
  "outreachAngle": string
}`,
    },
    {
      role: 'user',
      content: `Write a LinkedIn connection message for ${input.contactName ?? 'the decision-maker'} at ${input.companyName}.

Opportunity: ${JSON.stringify(input.opportunity, null, 2)}
Company context: ${JSON.stringify(input.companyContext, null, 2)}`,
    },
  ];
}

// ============================================================
// OUTREACH: WHATSAPP
// ============================================================

export function outreachWhatsappPrompt(input: OutreachInput): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are writing a WhatsApp message for Brandex outreach.

${getPromptInjectionDefenseRule()}

CRITICAL RULES:
1. Max 160 characters for first message — must fit without scrolling.
2. Very casual, direct, human.
3. State who you are and one specific reason.
4. End with a soft question, not a hard pitch.
5. No links in first message.

Output valid JSON:
{
  "message": string,
  "characterCount": number,
  "followUpSuggestion": string | null
}`,
    },
    {
      role: 'user',
      content: `Write a WhatsApp first message to ${input.contactName ?? 'the owner'} at ${input.companyName}.

Opportunity: ${JSON.stringify(input.opportunity, null, 2)}`,
    },
  ];
}

// ============================================================
// RESEARCH SUMMARY
// ============================================================

export interface ResearchSummaryInput {
  companyName: string;
  companyUnderstanding: Record<string, unknown>;
  websiteAnalysis: Record<string, unknown>;
  opportunities: Array<Record<string, unknown>>;
  decisionMaker?: Record<string, unknown>;
  buyingSignals?: Array<Record<string, unknown>>;
  previousVersion?: string;
}

export function researchSummaryPrompt(input: ResearchSummaryInput): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are creating a human-readable research brief for a salesperson at Brandex.

${getPromptInjectionDefenseRule()}

The brief should answer:
- Who is this company and what do they do?
- Why is this a good prospect (or why not)?
- What should we say to them?
- Who should we contact?
- Why now?

Format as clean markdown. Be direct. Skip fluff.
Maximum 400 words.
Include a "WHY THIS LEAD" summary box at the top (max 3 bullet points).

Also output the raw analysis as JSON after the markdown:
{"changesSince": string | null}`,
    },
    {
      role: 'user',
      content: `Create research brief for ${input.companyName}.

Company: ${JSON.stringify(input.companyUnderstanding, null, 2)}
Website: ${JSON.stringify(input.websiteAnalysis, null, 2)}
Opportunities: ${JSON.stringify(input.opportunities, null, 2)}
Decision maker: ${JSON.stringify(input.decisionMaker ?? null, null, 2)}
Signals: ${JSON.stringify(input.buyingSignals ?? [], null, 2)}
${input.previousVersion ? `Previous brief:\n${input.previousVersion}` : ''}`,
    },
  ];
}

// ============================================================
// CAMPAIGN PARSE (natural language → structured config)
// ============================================================

export function campaignParsePrompt(naturalLanguage: string): AIMessage[] {
  const { sanitized } = sanitizeExternalContent(naturalLanguage, 'user campaign description');

  return [
    {
      role: 'system',
      content: `You are parsing a natural language campaign description into a structured campaign configuration.

${getPromptInjectionDefenseRule()}

Output valid JSON matching this schema exactly:
{
  "name": string,
  "description": string,
  "industries": string[],
  "subIndustries": string[],
  "locations": [
    {
      "country": string | null,
      "state": string | null,
      "city": string | null,
      "radius": number | null
    }
  ],
  "companyTypes": string[],
  "employeeMin": number | null,
  "employeeMax": number | null,
  "keywords": string[],
  "excludedKeywords": string[],
  "requireWebsite": boolean,
  "targetRoles": string[],
  "prioritizedCapabilities": string[],
  "minOpportunityScore": number | null,
  "maxLeads": number | null,
  "researchDepth": "SHALLOW" | "STANDARD" | "DEEP",
  "competitorResearchMode": "OFF" | "SMART" | "ALWAYS",
  "buyingSignalMode": "OFF" | "BASIC" | "DEEP",
  "outreachMode": "STANDARD" | "HIGH_VALUE" | "STRATEGIC",
  "budgetLimitINR": number | null,
  "confidence": number,
  "clarificationsNeeded": string[]
}`,
    },
    {
      role: 'user',
      content: `Parse this campaign request:\n${sanitized}`,
    },
  ];
}
