import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const revalidate = 0;

export default async function OutreachPage() {
  const outreaches = await prisma.outreach.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      opportunity: { include: { company: true, capability: true } },
      contact: true,
    },
  }).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Outreach Engine</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Generated email, LinkedIn, and WhatsApp personalized draft queue
          </p>
        </div>
        <Link href="/approvals" className="btn btn-primary">
          View Approval Queue →
        </Link>
      </div>

      {outreaches.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>⟶</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No Outreach Drafted</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 'var(--space-2) auto' }}>
            Outreach drafts are generated when verified opportunities pass research gates.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {outreaches.map((outreach) => (
            <div key={outreach.id} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className="badge badge-normal">{outreach.channel}</span>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
                      {outreach.opportunity?.company.primaryName || 'Company'}
                    </h3>
                    {outreach.opportunity?.capability && (
                      <span className="badge badge-tech">{outreach.opportunity.capability.name}</span>
                    )}
                  </div>
                  {outreach.subject && (
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
                      Subject: {outreach.subject}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${outreach.status.toLowerCase()}`}>
                  {outreach.status}
                </span>
              </div>

              <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                {outreach.approvedVersion || outreach.editedVersion || outreach.aiDraft}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
