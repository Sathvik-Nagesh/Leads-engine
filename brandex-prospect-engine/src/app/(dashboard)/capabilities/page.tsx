import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = {
  title: 'Capability Library | Brandex Prospect Engine',
};

export const revalidate = 0;

const CATEGORY_LABELS: Record<string, string> = {
  TECHNOLOGY: '⚙️ Technology',
  GROWTH: '📈 Growth & Marketing',
  CREATIVE: '🎨 Creative & Design',
  BUSINESS_INFRASTRUCTURE: '🏛️ Business Infrastructure',
  EDUCATION_COMMUNITY: '🎓 Education & Community',
};

async function getCapabilities() {
  try {
    return await prisma.capability.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  } catch {
    return [];
  }
}

export default async function CapabilitiesPage() {
  const capabilities = await getCapabilities();

  const grouped = capabilities.reduce<Record<string, typeof capabilities>>((acc, cap) => {
    const cat = cap.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cap);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Brandex Capability Library
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            20 pre-seeded service capabilities used by AI to match website audit evidence to target pitch angles
          </p>
        </div>
      </div>

      {capabilities.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Capabilities Seeded</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0.5rem auto 1.25rem' }}>
            Run <code style={{ background: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: 4 }}>npm run db:seed</code> to populate the capability library.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(grouped).map(([category, caps]) => (
            <div key={category}>
              <h2 style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
              }}>
                {CATEGORY_LABELS[category] ?? category} ({caps.length})
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}>
                {caps.map((cap) => (
                  <div
                    key={cap.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: cap.enabled ? 1 : 0.4,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cap.name}
                        </h3>
                        <span className="badge badge-tech">
                          {cap.category.toLowerCase()}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                        {cap.description}
                      </p>
                    </div>

                    <div>
                      {cap.positiveSignals.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                            Detection Signals:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {cap.positiveSignals.slice(0, 3).map((sig, idx) => (
                              <span key={idx} className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                                ✓ {sig}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <span>Target: {cap.idealCustomers || 'SMB / Enterprise'}</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
