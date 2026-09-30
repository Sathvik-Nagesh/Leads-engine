import { prisma } from '@/lib/db/prisma';

export const revalidate = 0;

export default async function ProspectsPage() {
  const opportunities = await prisma.opportunity.findMany({
    take: 50,
    orderBy: { totalScore: 'desc' },
    include: {
      company: true,
      capability: true,
      evidence: true,
      outreach: true,
    },
  }).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Prospect Opportunities</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            High-confidence matches backed by verified audit findings
          </p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>◎</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No Opportunities Identified Yet</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 'var(--space-2) auto' }}>
            Run campaign discovery or import leads to evaluate business websites against Brandex capabilities.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {opportunities.map((opp) => (
            <div key={opp.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{opp.company.primaryName}</h3>
                    <span className={`badge badge-${opp.status.toLowerCase()}`}>
                      {opp.status}
                    </span>
                    {opp.capability && (
                      <span className="badge badge-tech">
                        {opp.capability.name}
                      </span>
                    )}
                  </div>
                  {opp.company.primaryWebsite && (
                    <a
                      href={opp.company.primaryWebsite}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-brand-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)', display: 'inline-block' }}
                    >
                      {opp.company.primaryWebsite} ↗
                    </a>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-brand-light)' }}>
                    {opp.totalScore.toFixed(0)}/100
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-subtle)' }}>
                    Opportunity Score
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>{opp.problem}</p>
              </div>

              {opp.evidence.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', background: 'var(--color-bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-subtle)', marginBottom: 'var(--space-1)' }}>
                    EVIDENCE BACKING:
                  </div>
                  <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', paddingLeft: 'var(--space-4)' }}>
                    {opp.evidence.map((ev) => (
                      <li key={ev.id}>{ev.claim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
