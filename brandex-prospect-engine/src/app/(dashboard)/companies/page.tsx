import { prisma } from '@/lib/db/prisma';

export const revalidate = 0;

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { leads: true, websiteAudits: true, opportunities: true, contacts: true },
      },
    },
  }).catch(() => []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Discovered Companies</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Deduplicated company entities tracked across all lead sources
          </p>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>⊞</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No Companies Discovered</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 'var(--space-2) auto' }}>
            Companies are automatically created and deduplicated when leads are imported or discovered.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Domain / Website</th>
                <th>City / Location</th>
                <th>Industry</th>
                <th>Audits</th>
                <th>Opps</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {company.primaryName}
                  </td>
                  <td>
                    {company.canonicalDomain || company.primaryWebsite || '—'}
                  </td>
                  <td>
                    {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td>{company.industry || '—'}</td>
                  <td>{company._count.websiteAudits}</td>
                  <td>{company._count.opportunities}</td>
                  <td>
                    <span className="badge badge-normal">
                      {company.currentStatus}
                    </span>
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
