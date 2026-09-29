'use client';

import { createContext, useContext, useState } from 'react';
import type { WalletSession } from '@/lib/midnight-client';
import { shortAddress } from '@/lib/types';

type WalletOption = { id: string; name: string };
type WalletContextValue = {
  session: WalletSession | null;
  busy: boolean;
  error: string;
  options: WalletOption[];
  open: () => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<WalletOption[]>([]);

  async function connect(id: string) {
    setBusy(true); setError('');
    try {
      const { WalletSession } = await import('@/lib/midnight-client');
      setSession(await WalletSession.connect(id));
      setOptions([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wallet connection failed');
    } finally { setBusy(false); }
  }

  async function open() {
    setError('');
    const { detectWallets } = await import('@/lib/midnight-client');
    const found = detectWallets();
    if (!found.length) { setError('Install and unlock Lace or another Midnight wallet, then try again.'); return; }
    if (found.length === 1) { await connect(found[0].id); return; }
    setOptions(found);
  }

  return <WalletContext.Provider value={{ session, busy, error, options, open, connect, disconnect: () => { setSession(null); setOptions([]); setError(''); } }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('WalletProvider is missing');
  return context;
}

export function WalletButton() {
  const wallet = useWallet();
  return <div style={{ position: 'relative' }}>
    {wallet.session ? <button className="pill" onClick={wallet.disconnect} title="Disconnect wallet"><span className="dot" />{shortAddress(wallet.session.address)} <span className="muted">×</span></button> :
      <button className="button outline" onClick={wallet.open} disabled={wallet.busy}>{wallet.busy ? 'Connecting…' : 'Connect wallet'}</button>}
    {wallet.options.length > 0 && <div className="card" style={{ position: 'absolute', zIndex: 20, right: 0, top: 50, width: 190, padding: 8, boxShadow: '0 15px 30px #213a4722' }}>
      {wallet.options.map((option) => <button className="button ghost" style={{ width: '100%', justifyContent: 'start' }} key={option.id} onClick={() => wallet.connect(option.id)}>{option.name}</button>)}
    </div>}
    {wallet.error && <div className="error" role="alert" style={{ position: 'absolute', zIndex: 20, right: 0, top: 50, width: 260 }}>{wallet.error}</div>}
  </div>;
}
