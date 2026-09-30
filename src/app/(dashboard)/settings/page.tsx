import { env } from '@/lib/env';

export const revalidate = 0;

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Engine System Settings</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Environment configuration, AI model routing, and safety parameters
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            ⚙️ Environment & API Status
          </h2>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Configuration Item</th>
                  <th>Value / Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>DeepSeek API Key</td>
                  <td>
                    {env.DEEPSEEK_API_KEY ? (
                      <span className="badge badge-normal">Configured</span>
                    ) : (
                      <span className="badge badge-error">Missing</span>
                    )}
                  </td>
                  <td>Primary intelligence model provider</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>DeepSeek Default Model</td>
                  <td><code>{env.DEEPSEEK_DEFAULT_MODEL}</code></td>
                  <td>Primary model for high-reasoning tasks</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Jev API Base URL</td>
                  <td><code>{env.JEV_BASE_URL}</code></td>
                  <td>Fast decision/gating layer endpoint</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Google Maps API Key</td>
                  <td>
                    {env.GOOGLE_MAPS_API_KEY ? (
                      <span className="badge badge-normal">Configured</span>
                    ) : (
                      <span className="badge badge-warning">Optional / Not Set</span>
                    )}
                  </td>
                  <td>Places API lead discovery</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Jina AI Key</td>
                  <td>
                    {env.JINA_API_KEY ? (
                      <span className="badge badge-normal">Configured</span>
                    ) : (
                      <span className="badge badge-warning">Optional / Not Set</span>
                    )}
                  </td>
                  <td>Fallback scraper for JS-rendered websites</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Monthly AI Budget</td>
                  <td><strong>₹{env.BUDGET_MONTHLY_INR}</strong></td>
                  <td>Hard-stop spending threshold</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            🛡️ Security & Guardrails
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                SSRF Guard Active
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                Blocks private CIDR blocks (10.0.0.0/8, 127.0.0.0/8, 192.168.0.0/16, AWS metadata 169.254.169.254) before any website HTTP request.
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                Prompt Injection Protection
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                All external scraped content is sanitized using strict marker-wrapping and regex pattern strip rules.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
