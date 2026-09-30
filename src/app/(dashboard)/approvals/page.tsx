import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = {
  title: 'Approvals Queue | Brandex Prospect Engine',
};

export const revalidate = 0;

async function getPendingApprovals() {
  try {
    return await prisma.outreach.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'asc' },
      include: {
        company: {
          select: { primaryName: true, city: true, industry: true, id: true, primaryWebsite: true },
        },
        contact: {
          select: { name: true, role: true, email: true },
        },
        opportunity: {
          select: {
            totalScore: true,
            problem: true,
            capability: { select: { name: true } },
          },
        },
      },
    });
  } catch {
    return [];
  }
}

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: '✉️ Email',
  LINKEDIN: '💼 LinkedIn',
  WHATSAPP: '💬 WhatsApp',
  CALL: '📞 Phone Call',
};

export default async function ApprovalsPage() {
  const pending = await getPendingApprovals();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Human Approval Queue
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Review, edit, or approve AI-generated outreach drafts before sending to prospects
          </p>
        </div>

        <div className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
          ⏳ {pending.length} Messages Awaiting Approval
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Approval Queue Clear</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0.5rem auto' }}>
            No pending outreach messages. All generated drafts have been reviewed or sent.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pending.map((outreach) => (
            <div key={outreach.id} className="card" style={{ borderLeft: '4px solid var(--brand-primary)' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{CHANNEL_ICONS[outreach.channel] ?? outreach.channel}</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {outreach.company.primaryName}
                    </h3>
                    {outreach.opportunity?.capability && (
                      <span className="badge badge-tech">{outreach.opportunity.capability.name}</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
                    {[outreach.company.industry, outreach.company.city].filter(Boolean).join(' • ')}
                    {outreach.contact && (
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        👤 Target: <strong>{outreach.contact.name}</strong> ({outreach.contact.role || 'Decision Maker'})
                      </span>
                    )}
                  </div>
                </div>

                {outreach.opportunity?.totalScore && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-success)' }}>
                      {Math.round(outreach.opportunity.totalScore)}/100
                    </span>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Score</div>
                  </div>
                )}
              </div>

              {/* Subject Line if Email */}
              {outreach.subject && (
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, marginRight: '0.5rem' }}>Subject:</span>
                  {outreach.subject}
                </div>
              )}

              {/* Message Body Box */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-primary)',
                marginBottom: '1.25rem',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-sans)',
              }}>
                {outreach.editedVersion || outreach.aiDraft}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <form action={`/api/outreach/${outreach.id}/approve`} method="POST">
                  <button type="submit" className="btn btn-brand">
                    ✓ Approve & Send Message
                  </button>
                </form>
                <a href={`/approvals/${outreach.id}/edit`} className="btn btn-secondary">
                  ✏️ Edit Draft
                </a>
                <form action={`/api/outreach/${outreach.id}/reject`} method="POST">
                  <button type="submit" className="btn btn-secondary" style={{ color: 'var(--status-error)' }}>
                    ✕ Reject Message
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
