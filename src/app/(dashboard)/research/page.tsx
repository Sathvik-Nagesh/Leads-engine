import { prisma } from '@/lib/db/prisma';

export const revalidate = 0;

export default async function ResearchPage() {
  const audits = await prisma.websiteAudit.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { company: true },
  }).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Website Audits & Research</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Deterministic 60+ point website inspections and AI website analysis logs
          </p>
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>⊗</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No Research Conducted Yet</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 'var(--space-2) auto' }}>
            Website audits run automatically as leads progress through the research stage.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {audits.map((audit) => (
            <div key={audit.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{audit.company.primaryName}</h3>
                  <a
                    href={audit.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--color-brand-light)', fontSize: 'var(--text-xs)' }}
                  >
                    {audit.url} ↗
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <span className={`badge ${audit.httpsEnabled ? 'badge-normal' : 'badge-error'}`}>
                    {audit.httpsEnabled ? 'HTTPS Valid' : 'No HTTPS'}
                  </span>
                  <span className={`badge ${audit.hasMobileViewport ? 'badge-normal' : 'badge-warning'}`}>
                    {audit.hasMobileViewport ? 'Mobile Ready' : 'No Mobile Viewport'}
                  </span>
                  {audit.cms && <span className="badge badge-tech">{audit.cms}</span>}
                  {audit.framework && <span className="badge badge-tech">{audit.framework}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <div>
                  <strong>H1 Heading:</strong> {audit.hasH1 ? audit.h1Text || 'Present' : '❌ Missing'}
                </div>
                <div>
                  <strong>Meta Description:</strong> {audit.hasMetaDescription ? 'Present' : '❌ Missing'}
                </div>
                <div>
                  <strong>Contact Form:</strong> {audit.hasContactForm ? 'Found' : 'None'}
                </div>
                <div>
                  <strong>Analytics:</strong> {audit.hasAnalytics ? audit.analyticsType || 'Yes' : 'None detected'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
