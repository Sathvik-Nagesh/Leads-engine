import { prisma } from '@/lib/db/prisma';
import { budgetEngine } from '@/lib/budget/budget-engine';

export const revalidate = 0;

export default async function AnalyticsPage() {
  const [stats, usageLogs, campaignCount, companyCount, oppCount, outreachCount] = await Promise.all([
    budgetEngine.getMonthlyStats(),
    prisma.aIUsageLog.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
    }).catch(() => []),
    prisma.campaign.count().catch(() => 0),
    prisma.company.count().catch(() => 0),
    prisma.opportunity.count().catch(() => 0),
    prisma.outreach.count().catch(() => 0),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Engine Analytics & Budget</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Real-time metrics, cost per lead tracking, and monthly AI expenditure
        </p>
      </div>

      <div className="metrics-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="metric-card">
          <div className="metric-label">Monthly AI Budget Spent</div>
          <div className="metric-value" style={{ color: stats.spentINR >= 1050 ? 'var(--color-warning)' : 'var(--color-brand-light)' }}>
            ₹{stats.spentINR.toFixed(2)}
          </div>
          <div className="metric-change">Out of ₹{stats.budgetINR} limit ({stats.state} state)</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total AI Requests</div>
          <div className="metric-value">{stats.requestCount}</div>
          <div className="metric-change">Calls this month</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Companies Tracked</div>
          <div className="metric-value">{companyCount}</div>
          <div className="metric-change">Unique entities</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Opportunities Generated</div>
          <div className="metric-value">{oppCount}</div>
          <div className="metric-change">Verified matches</div>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          🤖 Recent AI API Usage Log
        </h2>

        {usageLogs.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            No AI API requests recorded yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Provider / Model</th>
                  <th>Task Type</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Cost (INR)</th>
                  <th>Budget State</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--text-xs)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-normal">{log.provider}</span> {log.model}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>
                      {log.requestType}
                    </td>
                    <td>{log.inputTokens}</td>
                    <td>{log.outputTokens}</td>
                    <td style={{ fontWeight: 600 }}>₹{log.estimatedCostINR.toFixed(4)}</td>
                    <td>
                      <span className="badge badge-normal">{log.budgetStateAtRequest}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
