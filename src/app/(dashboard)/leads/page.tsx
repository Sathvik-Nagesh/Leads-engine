import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const revalidate = 0;

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { company: true },
  }).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Raw Leads & Ingestion</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            All ingested leads prior to normalization, deduplication, and opportunity scoring
          </p>
        </div>
        <Link href="/sources" className="btn btn-primary">
          + Import Leads
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>⊟</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No Leads Ingested</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 'var(--space-2) auto' }}>
            Import CSV lists or connect lead discovery sources to populate raw leads.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Source</th>
                <th>Domain / Website</th>
                <th>Phone / Email</th>
                <th>Duplicate?</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {lead.companyName}
                  </td>
                  <td>
                    <span className="badge badge-normal">{lead.source}</span>
                  </td>
                  <td>{lead.normalizedDomain || lead.website || '—'}</td>
                  <td>{lead.normalizedPhone || lead.normalizedEmail || '—'}</td>
                  <td>
                    {lead.isDuplicate ? (
                      <span className="badge badge-error">Duplicate</span>
                    ) : (
                      <span className="badge badge-normal">Unique</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-normal">{lead.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
