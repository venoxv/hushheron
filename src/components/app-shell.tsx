'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from './wallet-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">h</span> hushheron<span style={{ color: 'var(--sea)' }}>.</span></Link>
      <div className="side-menu"><span className="eyebrow" style={{ padding: '0 14px 9px' }}>Workspace</span>
        <Link className={pathname === '/app' ? 'active' : ''} href="/app">⌂ &nbsp; Overview</Link>
        <Link className={pathname.startsWith('/app/create') ? 'active' : ''} href="/app/create">＋ &nbsp; Create survey</Link>
        <Link className={pathname.startsWith('/app/settings') ? 'active' : ''} href="/app/settings">⚙ &nbsp; Settings</Link>
      </div><div className="side-foot muted">Built on Midnight Preprod.<br />Proof, with room for privacy.</div>
    </aside>
    <div className="app-main"><header className="app-topbar"><div className="breadcrumb">HushHeron / {pathname === '/app' ? 'Overview' : pathname.includes('create') ? 'Create survey' : pathname.includes('results') ? 'Results' : pathname.includes('settings') ? 'Settings' : 'Survey'}</div><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className="eyebrow" style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span className="dot" /> Preprod</span><WalletButton /></div></header><main className="app-page">{children}</main><nav className="mobile-nav" aria-label="Workspace"><Link href="/app">Overview</Link><Link href="/app/create">Create</Link><Link href="/app/settings">Settings</Link></nav></div>
  </div>;
}
