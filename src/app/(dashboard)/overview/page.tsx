import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { budgetEngine } from '@/lib/budget/budget-engine';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Overview | Brandex Prospect Engine',
  description: 'Daily prospects, pipeline funnel, and AI budget usage.',
};

export const revalidate = 0;

async function getOverviewData() {
  const [
    budgetStats,
    leadCounts,
    recentCompanies,
    pendingApprovals,
    totalOpportunities,
  ] = await Promise.allSettled([
    budgetEngine.getMonthlyStats(),
    prisma.lead.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.company.findMany({
      take: 6,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        primaryName: true,
        primaryWebsite: true,
        city: true,
        industry: true,
        currentStatus: true,
        updatedAt: true,
        opportunities: {
          take: 1,
          orderBy: { totalScore: 'desc' },
          select: {
            totalScore: true,
            status: true,
            problem: true,
            capability: { select: { name: true } },
          },
        },
      },
    }),
    prisma.outreach.count({ where: { status: 'DRAFT' } }),
    prisma.opportunity.count(),
  ]);

  const budget = budgetStats.status === 'fulfilled' ? budgetStats.value : null;
  const counts = leadCounts.status === 'fulfilled' ? leadCounts.value : [];
  const companies = recentCompanies.status === 'fulfilled' ? recentCompanies.value : [];
  const approvalsCount = pendingApprovals.status === 'fulfilled' ? pendingApprovals.value : 0;
  const oppCount = totalOpportunities.status === 'fulfilled' ? totalOpportunities.value : 0;

  // Build funnel counts
  const funnel: Record<string, number> = {};
  let totalLeads = 0;
  for (const row of counts) {
    funnel[row.status] = row._count.status;
    totalLeads += row._count.status;
  }

  return { budget, funnel, totalLeads, oppCount, approvalsCount, companies };
}

const FUNNEL_STAGES = [
  { key: 'DISCOVERED',     label: 'Discovered',   color: '#a1a1aa' },
  { key: 'VALIDATED',      label: 'Validated',    color: '#60a5fa' },
  { key: 'RESEARCHING',    label: 'Researching',  color: '#3b82f6' },
  { key: 'QUALIFIED',      label: 'Qualified',    color: '#10b981' },
  { key: 'OUTREACH_READY', label: 'Ready',        color: '#10b981' },
  { key: 'APPROVED',       label: 'Approved',     color: '#f59e0b' },
  { key: 'SENT',           label: 'Sent',         color: '#f59e0b' },
  { key: 'REPLIED',        label: 'Replied',      color: '#06b6d4' },
  { key: 'POSITIVE_REPLY', label: 'Positive',     color: '#10b981' },
  { key: 'MEETING',        label: 'Meeting',      color: '#10b981' },
  { key: 'WON',            label: 'Won',          color: '#10b981' },
];

export default async function OverviewPage() {
  const { budget, funnel, totalLeads, oppCount, approvalsCount, companies } = await getOverviewData();

  const budgetPct = budget
    ? Math.min(100, (budget.spentINR / budget.budgetINR) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Prospecting Command Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Daily intelligence, verified opportunity matching, and human outreach approvals
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/sources" className="btn btn-secondary">
            + Import Leads
          </Link>
          <Link href="/campaigns/new" className="btn btn-brand">
            + New Campaign
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-kpi">
        <div className="kpi-card">
          <div className="kpi-label">Total Ingested Leads</div>
          <div className="kpi-value">{totalLeads}</div>
          <div className="kpi-subtext">Cleaned & Deduplicated</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Opportunities Identified</div>
          <div className="kpi-value" style={{ color: 'var(--brand-primary)' }}>{oppCount}</div>
          <div className="kpi-subtext">Evidence-backed matches</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Pending Approval Queue</div>
          <div className="kpi-value" style={{ color: approvalsCount > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
            {approvalsCount}
          </div>
          <div className="kpi-subtext">Awaiting human review</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">AI Budget Spent</div>
          <div className="kpi-value" style={{ fontSize: '1.5rem', color: budget?.spentINR && budget.spentINR >= 1050 ? 'var(--status-warning)' : 'var(--status-success)' }}>
            ₹{budget ? budget.spentINR.toFixed(0) : 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>/ ₹{budget?.budgetINR ?? 1200}</span>
          </div>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="progress-fill" style={{ width: `${budgetPct}%`, background: 'var(--status-success)' }} />
          </div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <span className="card-title">Live Lead Pipeline Funnel</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Stage Breakdown</span>
        </div>

        <div className="funnel-container">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.key} className="funnel-step">
              <div className="funnel-count" style={{ color: stage.color }}>
                {funnel[stage.key] ?? 0}
              </div>
              <div className="funnel-label">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Today's Priority Prospects */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔥 Today&apos;s Priority Prospects</span>
            <Link href="/prospects" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
              View All Prospects →
            </Link>
          </div>

          {companies.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Prospects Yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', maxWidth: '360px', margin: '0.5rem auto 1.25rem' }}>
                Import a lead list or create a campaign to populate verified target opportunities.
              </p>
              <Link href="/sources" className="btn btn-primary">
                Import CSV Leads
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {companies.map((co) => {
                const opp = co.opportunities[0];
                return (
                  <div
                    key={co.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {co.primaryName}
                        </h4>
                        {opp?.capability && (
                          <span className="badge badge-tech">
                            {opp.capability.name}
                          </span>
                        )}
                        <span className="badge badge-muted">
                          {co.currentStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        {[co.industry, co.city].filter(Boolean).join(' • ') || 'Location pending'}
                        {co.primaryWebsite && (
                          <a href={co.primaryWebsite} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', marginLeft: '0.5rem' }}>
                            {co.primaryWebsite} ↗
                          </a>
                        )}
                      </div>

                      {opp?.problem && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.6rem', lineHeight: 1.4 }}>
                          {opp.problem}
                        </p>
                      )}
                    </div>

                    {opp && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '1.35rem',
                          fontWeight: 800,
                          color: opp.totalScore >= 70 ? 'var(--status-success)' : 'var(--status-warning)',
                          lineHeight: 1,
                        }}>
                          {Math.round(opp.totalScore)}
                        </div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                          Score
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Actions & System Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link href="/campaigns/new" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                🎯 Create Campaign with Prompt
              </Link>
              <Link href="/sources" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                📄 Import CSV Lead File
              </Link>
              <Link href="/approvals" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                ✅ Review Outreach Approvals
              </Link>
              <Link href="/capabilities" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                ⚡ View Brandex Capabilities
              </Link>
            </div>
          </div>

          {/* Engine Status Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Engine Health</span>
              <span className="badge badge-success">Online</span>
            </div>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Primary AI</span>
                <strong style={{ color: 'var(--text-primary)' }}>DeepSeek V3</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Gating Layer</span>
                <strong style={{ color: 'var(--text-primary)' }}>Jev Router</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>SSRF Guard</span>
                <strong style={{ color: 'var(--status-success)' }}>Active (CIDR blocked)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Auditor</span>
                <strong style={{ color: 'var(--status-success)' }}>60+ Checks</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
