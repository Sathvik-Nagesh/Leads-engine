'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    title: 'Core Engine',
    items: [
      { href: '/overview',    label: 'Overview',     icon: '⚡' },
      { href: '/campaigns',   label: 'Campaigns',    icon: '🎯' },
      { href: '/prospects',   label: 'Prospects',    icon: '🔥' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/companies',   label: 'Companies',    icon: '🏢' },
      { href: '/leads',       label: 'Leads',        icon: '📋' },
      { href: '/research',    label: 'Research',     icon: '🔬' },
    ],
  },
  {
    title: 'Outreach & Queue',
    items: [
      { href: '/outreach',    label: 'Outreach',     icon: '📨' },
      { href: '/approvals',   label: 'Approvals',    icon: '✅' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { href: '/capabilities',label: 'Capabilities', icon: '⚡' },
      { href: '/sources',     label: 'Sources',      icon: '🌐' },
      { href: '/analytics',   label: 'Analytics',    icon: '📊' },
      { href: '/settings',    label: 'Settings',     icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">B</div>
        <div>
          <div className="brand-title">Brandex</div>
          <div className="brand-subtitle">Prospect Engine</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-content">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Budget Widget */}
      <div className="sidebar-footer">
        <div className="budget-widget">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AI Budget
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹1,200/mo
            </span>
          </div>
          <div className="progress-bar" style={{ marginBottom: '0.4rem' }}>
            <div
              className="progress-fill"
              style={{
                width: '15%',
                background: 'var(--status-success)',
              }}
            />
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>State: <strong style={{ color: 'var(--status-success)' }}>NORMAL</strong></span>
            <Link href="/analytics" style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }}>
              Details →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
