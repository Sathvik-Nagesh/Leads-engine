import Sidebar from '@/components/layout/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Brandex Prospect Engine',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-container">
        <header className="topbar">
          <div className="topbar-breadcrumbs">
            <span style={{ color: 'var(--text-tertiary)' }}>Brandex</span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Prospecting Engine</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="badge badge-success" style={{ padding: '0.3rem 0.75rem' }}>
              ● Engine Active
            </div>
            <a href="/campaigns/new" className="btn btn-brand" style={{ height: '34px', fontSize: '0.8rem' }}>
              + New Campaign
            </a>
          </div>
        </header>

        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
