'use client';

import { useState } from 'react';

interface ParsedConfig {
  name: string;
  description: string;
  industries: string[];
  locations: Array<{ city?: string; state?: string; country?: string }>;
  maxLeads?: number;
  researchDepth: string;
  keywords: string[];
  clarificationsNeeded: string[];
  confidence: number;
  [key: string]: unknown;
}

const PROMPT_EXAMPLES = [
  'Find 100 interior design firms in Mumbai and Pune with no booking link or outdated websites. Target MD or Owner.',
  'Discover 50 SaaS startups in Bangalore with hiring activity or missing contact forms on their website.',
  'Find 200 dental clinics in Delhi NCR with no WhatsApp integration or missing mobile viewport.',
];

export default function NewCampaignPage() {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedConfig, setParsedConfig] = useState<ParsedConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function parseNaturalLanguage() {
    if (!input.trim() || input.trim().length < 10) {
      setError('Please describe your campaign in at least 10 characters.');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/campaigns/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to parse campaign');
      }

      const data = await res.json();
      setParsedConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setParsing(false);
    }
  }

  async function saveCampaign() {
    if (!parsedConfig) return;
    setSaving(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsedConfig.name,
          description: parsedConfig.description,
          naturalLanguageInput: input,
          config: parsedConfig,
          maxLeadCount: parsedConfig.maxLeads,
        }),
      });

      if (!res.ok) throw new Error('Failed to save campaign');

      const campaign = await res.json();
      window.location.href = `/campaigns/${campaign.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Create New Campaign
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Describe your prospecting goal in natural language. DeepSeek will parse it into a structured configuration.
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          🤖 AI Campaign Prompt
        </h3>

        {/* Prompt Suggestions */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Template Suggestions (Click to use):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {PROMPT_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(ex)}
                style={{
                  textAlign: 'left',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ✦ {ex}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="form-textarea"
          style={{
            minHeight: '140px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            padding: '1rem',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            marginBottom: '1rem',
          }}
          placeholder="E.g. Find 200 software agencies in Mumbai with no HTTPS or broken forms. Target the Founder or Director."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={parsing}
        />

        {error && (
          <div style={{
            background: 'var(--status-error-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--status-error)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            ❌ {error}
          </div>
        )}

        {!parsedConfig && (
          <button
            className="btn btn-brand"
            onClick={parseNaturalLanguage}
            disabled={parsing || !input.trim()}
            style={{ width: '100%', height: '42px' }}
          >
            {parsing ? '⟳ DeepSeek Parsing Campaign Intent...' : '✦ Parse Campaign Config with DeepSeek'}
          </button>
        )}

        {parsedConfig && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ✓ Generated Configuration
              </h4>
              <span className="badge badge-success">
                {Math.round(parsedConfig.confidence * 100)}% Intent Confidence
              </span>
            </div>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Campaign Name</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{parsedConfig.name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Max Lead Limit</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{parsedConfig.maxLeads ?? 'Unlimited'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Industries</span>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{parsedConfig.industries.join(', ') || 'Auto-detect'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Target Locations</span>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {parsedConfig.locations.map((l) => [l.city, l.state, l.country].filter(Boolean).join(', ')).join('; ') || 'India'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-brand"
                onClick={saveCampaign}
                disabled={saving}
                style={{ height: '40px' }}
              >
                {saving ? '⟳ Saving...' : '🚀 Launch & Save Campaign'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setParsedConfig(null); setError(null); }}
                disabled={saving}
                style={{ height: '40px' }}
              >
                Re-parse Input
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
