'use client';

import { createContext, useContext, useRef, useState } from 'react';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { WalletSession } from '@/lib/midnight-client';
import { shortAddress } from '@/lib/types';

type WalletOption = { id: string; name: string };
type WalletContextValue = {
  session: WalletSession | null;
  busy: boolean;
  open: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function walletRegistry(): Record<string, InitialAPI> {
  return (window as typeof window & { midnight?: Record<string, InitialAPI> }).midnight ?? {};
}

function detectWallets(): WalletOption[] {
  return Object.entries(walletRegistry())
    .filter(([, api]) => api && typeof api.connect === 'function' && /^4\./.test(api.apiVersion ?? ''))
    .map(([id, api]) => ({ id, name: api.name || id }));
}

function walletMessage(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : 'Wallet connection failed';
  if (/request failed/i.test(message)) return 'The wallet did not complete the request. Unlock it, check its Preprod connection, and try again.';
  return message;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const connecting = useRef(false);

  async function connect(id: string) {
    if (connecting.current) return;
    connecting.current = true;
    setBusy(true); setError('');
    try {
      const initial = walletRegistry()[id];
      if (!initial || !/^4\./.test(initial.apiVersion ?? '')) throw new Error('A compatible Midnight wallet was not found');
      // Ask the extension within the original click gesture. Importing the
      // contract bundle first can cause a cold wallet popup to be rejected.
      const api = await initial.connect('preprod');
      const { WalletSession } = await import('@/lib/midnight-client');
      setSession(await WalletSession.fromConnected(api));
      setOptions([]);
      setPickerOpen(false);
    } catch (cause) {
      setError(walletMessage(cause));
    } finally { connecting.current = false; setBusy(false); }
  }

  async function open() {
    if (connecting.current) return;
    setError('');
    try {
      const found = detectWallets();
      if (!found.length) { setError('Install and unlock Lace or another compatible Midnight wallet, then try again.'); return; }
      if (found.length === 1) { await connect(found[0].id); return; }
      setOptions(found);
      setPickerOpen(true);
    } catch (cause) { setError(walletMessage(cause)); }
  }

  function disconnect() {
    setSession(null);
    setPickerOpen(false);
    setOptions([]);
    setError('');
  }

  return <WalletContext.Provider value={{ session, busy, open, disconnect }}>
    {children}
    {pickerOpen && <div className="wallet-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPickerOpen(false); }}>
      <div className="wallet-dialog card" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title">
        <div className="wallet-dialog-heading"><div><div className="eyebrow">Midnight Preprod</div><h2 className="serif" id="wallet-dialog-title">Choose a wallet</h2></div><button className="wallet-dialog-close" type="button" aria-label="Close wallet selection" disabled={busy} onClick={() => setPickerOpen(false)}>×</button></div>
        <div className="wallet-options">{options.map((option) => <button className="button outline" key={option.id} disabled={busy} onClick={() => connect(option.id)}>{option.name} ↗</button>)}</div>
        <p className="muted">Your wallet handles approval and proof generation.</p>
      </div>
    </div>}
    {error && <div className="wallet-toast error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss wallet message" onClick={() => setError('')}>×</button></div>}
  </WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('WalletProvider is missing');
  return context;
}

export function WalletButton() {
  const wallet = useWallet();
  return wallet.session
    ? <button className="pill" onClick={wallet.disconnect} title="Disconnect wallet"><span className="dot" />{shortAddress(wallet.session.address)} <span className="muted">×</span></button>
    : <button className="button outline" onClick={wallet.open} disabled={wallet.busy}>{wallet.busy ? 'Connecting…' : 'Connect wallet'}</button>;
}
