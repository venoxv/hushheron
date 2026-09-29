'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet, WalletButton } from '@/components/wallet-provider';
import { importSurveyBackup } from '@/lib/crypto-client';
import { shortAddress } from '@/lib/types';

export default function Settings() {
  const wallet = useWallet();
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function restore() {
    setMessage(''); setError('');
    try { setMessage(`Survey keys restored for ${importSurveyBackup(backup)}. Return to the dashboard to open its creator view.`); setBackup(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not restore backup'); }
  }
  return <><div className="page-heading"><div><div className="eyebrow">Settings</div><h1 className="serif">Your private space.</h1><p className="muted">Manage your wallet connection and survey keys.</p></div></div><div className="detail-grid"><div className="detail-card card"><div className="eyebrow">Midnight wallet</div><h2 className="serif">{wallet.session ? 'Connected on Preprod' : 'Not connected'}</h2><p className="muted">{wallet.session ? shortAddress(wallet.session.address) : 'Connect Lace or another compatible Midnight wallet to publish, approve, or answer.'}</p><WalletButton /><p className="muted" style={{ fontSize: 12, marginTop: 23 }}>Disconnect clears the app’s wallet session. Your browser wallet controls authorization and proving.</p></div><div className="detail-card card"><div className="eyebrow">Key recovery</div><h2 className="serif">Restore a survey.</h2><p className="muted">Paste a private backup copied from the creator view. Anyone holding it can approve credentials and decrypt answers.</p><div className="field"><label htmlFor="backup">Private backup JSON</label><textarea id="backup" rows={4} value={backup} onChange={(event) => setBackup(event.target.value)} placeholder="Paste backup here" /></div>{error && <div className="error" style={{ marginTop: 13 }}>{error}</div>}{message && <div className="success" style={{ marginTop: 13 }}>{message}</div>}<button className="button" style={{ marginTop: 15 }} disabled={!backup.trim()} onClick={restore}>Restore keys</button></div></div><div className="notice" style={{ marginTop: 22 }}>This browser stores credential and survey secrets locally. Clearing site data removes them unless you have exported a creator backup. <Link className="text-link" href="/app">Browse surveys ↗</Link></div></>;
}
