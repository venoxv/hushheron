'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useWallet } from '@/components/wallet-provider';
import { decryptAnswer, exportSurveyBackup, hasSurveyKey, secretFor } from '@/lib/crypto-client';
import { unhex, type EncryptedResponse, type EligibilityRequest, type Survey } from '@/lib/types';
import type { PublicSurveyState } from '@/lib/midnight-client';

export function Results({ survey }: { survey: Survey }) {
  const wallet = useWallet();
  const [state, setState] = useState<PublicSurveyState | null>(null);
  const [requests, setRequests] = useState<EligibilityRequest[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const creator = useSyncExternalStore(() => () => {}, () => hasSurveyKey(survey.id), () => false);
  const [showDetails, setShowDetails] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const midnight = await import('@/lib/midnight-client');
      setError('');
      const [chain, requestResponse, answerResponse] = await Promise.all([
        midnight.readSurveyState(survey.contractAddress),
        fetch(`/api/surveys/${survey.id}/requests`),
        fetch(`/api/surveys/${survey.id}/responses`),
      ]);
      if (!requestResponse.ok || !answerResponse.ok) throw new Error('Could not load survey data');
      const requested = await requestResponse.json() as EligibilityRequest[];
      const encrypted = await answerResponse.json() as EncryptedResponse[];
      setState(chain); setRequests(requested);
      if (hasSurveyKey(survey.id)) {
        const verified = new Set(chain.answerCommitments);
        const values: number[] = [];
        for (const item of encrypted) {
          if (!verified.has(item.commitment)) continue;
          try {
            const decrypted = await decryptAnswer(survey.id, item.ciphertext);
            if (midnight.answerCommitmentFor(decrypted.answer, decrypted.salt) === item.commitment) {
              values.push(decrypted.answer);
              verified.delete(item.commitment);
            }
          } catch { /* ignore ciphertext that cannot be authenticated */ }
        }
        setAnswers(values);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load results'); }
    finally { setLoading(false); }
  }, [survey.contractAddress, survey.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function approve(commitment: string) {
    if (!wallet.session) { await wallet.open(); return; }
    if (!creator) return;
    setBusy(commitment); setError(''); setNotice('Approving this credential on Midnight…');
    try {
      await wallet.session.approve(survey.contractAddress, secretFor(survey.id, 'creator'), unhex(commitment));
      setNotice('Credential approved. The participant can now submit once.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Approval failed'); }
    finally { setBusy(''); }
  }

  async function closeSurvey() {
    if (!wallet.session) { await wallet.open(); return; }
    if (!creator) return;
    setBusy('close'); setError(''); setNotice('Closing survey on Midnight…');
    try {
      await wallet.session.close(survey.contractAddress, secretFor(survey.id, 'creator'));
      setNotice('Survey closed. No new responses can be submitted.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not close survey'); }
    finally { setBusy(''); }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/app/survey/${survey.id}`);
      setError(''); setNotice('Survey link copied.');
    } catch { setNotice(''); setError('Could not copy the survey link. Allow clipboard access and try again.'); }
  }

  async function copyBackup() {
    try {
      await navigator.clipboard.writeText(exportSurveyBackup(survey.id));
      setError(''); setNotice('Private survey backup copied. Store it safely.');
    } catch { setNotice(''); setError('Could not copy the private backup. Allow clipboard access and try again.'); }
  }

  const approved = new Set(state?.approved ?? []);
  const pending = requests.filter((item) => !approved.has(item.commitment));
  const counts = [1, 2, 3, 4, 5].map((value) => answers.filter((answer) => answer === value).length);
  const average = answers.length ? (answers.reduce((sum, value) => sum + value, 0) / answers.length).toFixed(1) : '—';

  return <>
    <div className="page-heading"><div><div className="eyebrow">Survey results</div><h1 className="serif">{survey.title}</h1><p className="muted">{survey.question}</p></div><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}><button className="button outline" onClick={copyShare}>Share survey ↗</button><button className="button" disabled={loading} onClick={refresh}>Refresh results</button></div></div>
    {error && <div className="error" role="alert" style={{ marginBottom: 20 }}>{error}</div>}
    {notice && <div className="success" role="status" style={{ marginBottom: 20 }}>{notice}</div>}
    <div className="stats"><div className="stat card"><div className="eyebrow">Verified responses</div><strong>{state ? state.responseCount : '—'}</strong></div><div className="stat card"><div className="eyebrow">Approved credentials</div><strong>{state ? state.eligibleCount : '—'}</strong></div><div className="stat card"><div className="eyebrow">Status</div><strong style={{ fontSize: 29, paddingTop: 10 }}>{state ? state.isClosed ? 'Closed' : 'Open' : '—'}</strong></div></div>
    <div className="detail-grid"><div className="detail-card card"><div className="eyebrow">Aggregate results</div><h2 className="serif">The signal, together.</h2>
      {creator ? <><p className="muted">{answers.length} encrypted {answers.length === 1 ? 'answer' : 'answers'} matched on-chain response commitments. Only those answers count below.</p><div className="card" style={{ padding: 19, margin: '21px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="eyebrow">Average answer</span><span className="serif" style={{ fontSize: 48 }}>{average}<span style={{ fontSize: 15 }}> / 5</span></span></div>{counts.map((count, index) => <div className="bar-row" key={index}><strong>{index + 1}</strong><div className="bar"><span style={{ width: answers.length ? `${count / answers.length * 100}%` : '0%' }} /></div><span>{count}</span></div>)}{state && answers.length < state.responseCount && <div className="notice" style={{ marginTop: 22 }}>Some finalized responses have not synced their encrypted answers. The aggregate includes only responses whose decrypted commitment matches the chain.</div>}</> : <div className="notice">Answer distribution is available only in the creator’s browser with its private decryption key. The verified response count is public.</div>}
    </div><div className="form-stack"><div className="detail-card card"><div className="eyebrow">Share this space</div><h2 className="serif">Invite honest answers.</h2><p className="muted">Share the link. Each participant can request a private credential for approval.</p><Link className="text-link" href={`/app/survey/${survey.id}`}>Open participant view ↗</Link></div>
      {creator && <div className="detail-card card"><div className="eyebrow">Creator controls</div><h2 className="serif">{pending.length} waiting for approval</h2><p className="muted">Verify the requester through a trusted channel and match the full approval code below. Approve one code per person.</p><div className="form-stack">{pending.length ? pending.map((request) => <div className="card" style={{ padding: 14 }} key={request.commitment}><div className="code-box">{request.commitment}</div><button className="text-link" disabled={!!busy || !!state?.isClosed} onClick={() => approve(request.commitment)} style={{ marginTop: 9 }}>{busy === request.commitment ? 'Approving…' : wallet.session ? 'Approve credential ↗' : 'Connect wallet to approve'}</button></div>) : <p className="muted">No pending requests.</p>}</div><div className="rule" style={{ margin: '23px 0' }} /><button className="button outline" onClick={copyBackup}>Copy private backup</button>{!state?.isClosed && <button className="button ghost" disabled={!!busy} onClick={closeSurvey} style={{ marginTop: 9, display: 'block' }}>{busy === 'close' ? 'Closing…' : 'Close survey'}</button>}</div>}
    </div></div>
    <div style={{ marginTop: 26 }}><button className="text-link" onClick={() => setShowDetails(!showDetails)}>View transaction details {showDetails ? '↑' : '↓'}</button>{showDetails && <div className="code-box" style={{ marginTop: 11 }}>Midnight Preprod contract: {survey.contractAddress}<br />Response commitments: {state?.answerCommitments.length ?? '—'}</div>}</div>
  </>;
}
