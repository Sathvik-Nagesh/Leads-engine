import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campaigns | Brandex Prospect Engine',
};

export default function CampaignsPage() {
  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-description">
            Define targets and discover businesses at scale.
          </p>
        </div>
        <a href="/campaigns/new" className="btn btn-primary">+ New Campaign</a>
      </div>

      <div style={{ marginBottom: 'var(--space-8)' }}>
        <CampaignList />
      </div>
    </div>
  );
}

function CampaignList() {
  return (
    <div className="empty-state">
      <div className="empty-state-title">No campaigns yet</div>
      <div className="empty-state-description">
        Create your first campaign to start discovering prospects. Use natural language or configure advanced settings.
      </div>
      <a href="/campaigns/new" className="btn btn-primary">Create Campaign</a>
    </div>
  );
}
