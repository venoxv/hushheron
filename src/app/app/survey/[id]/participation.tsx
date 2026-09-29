'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useWallet } from '@/components/wallet-provider';
import { encryptAnswer, hasSurveyKey, secretFor } from '@/lib/crypto-client';
import { randomSecret, type EligibilityRequest, type Survey } from '@/lib/types';

type Pending = { commitment: string; ciphertext: string };

export function Participation({ survey }: { survey: Survey }) {
  const wallet = useWallet();
  const [credential, setCredential] = useState('');
  const [eligible, setEligible] = useState(false);
  const [requested, setRequested] = useState(false);
  const [closed, setClosed] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  const [pendingUpload, setPendingUpload] = useState<Pending | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const creator = useSyncExternalStore(() => () => {}, () => hasSurveyKey(survey.id), () => false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const secret = secretFor(survey.id, 'participant');
        const midnight = await import('@/lib/midnight-client');
        const pending = localStorage.getItem(`hushheron:pending:${survey.id}`);
        if (pending && active) {
          try { setPendingUpload(JSON.parse(pending) as Pending); } catch { /* invalid local draft */ }
        }
        const commitment = midnight.commitmentFor(secret);
        void fetch(`/api/surveys/${survey.id}/requests`)
          .then(async (response) => response.ok ? await response.json() as EligibilityRequest[] : [])
          .then((requests) => { if (active) setRequested(requests.some((item) => item.commitment === commitment)); })
          .catch(() => { /* approval state remains available from Preprod */ });
        const [isApproved, state] = await Promise.all([
          midnight.isEligible(survey.contractAddress, commitment),
          midnight.readSurveyState(survey.contractAddress),
        ]);
        if (active) { setCredential(commitment); setEligible(isApproved); setClosed(state.isClosed); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Could not read survey state'); }
    })();
    return () => { active = false; };
  }, [survey.id, survey.contractAddress]);

  async function refreshEligibility() {
    setBusy(true); setError('');
    try {
      const { isEligible, readSurveyState } = await import('@/lib/midnight-client');
      const [approved, state] = await Promise.all([isEligible(survey.contractAddress, credential), readSurveyState(survey.contractAddress)]);
      setEligible(approved); setClosed(state.isClosed);
      if (!approved) setStatus('Your request is still waiting for creator approval.');
      else setStatus('You are approved to respond.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not check approval'); }
    finally { setBusy(false); }
  }

  async function requestEligibility() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/surveys/${survey.id}/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ commitment: credential }) });
      if (!response.ok) throw new Error('Could not send your request');
      setRequested(true); setStatus('Request sent. Share your approval code with the creator through a trusted channel, then return to check approval.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
    finally { setBusy(false); }
  }

  async function copyApprovalCode() {
    await navigator.clipboard.writeText(credential);
    setStatus('Approval code copied. Send it to the creator through your existing trusted channel.');
  }

  async function uploadResponse(pending: Pending) {
    const response = await fetch(`/api/surveys/${survey.id}/responses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pending) });
    if (!response.ok) throw new Error('Verified on Midnight, but the encrypted answer did not sync. Use “Finish syncing” below.');
    localStorage.removeItem(`hushheron:pending:${survey.id}`);
    setPendingUpload(null);
    setSuccess(true);
  }

  async function finishSync() {
    if (!pendingUpload) return;
    setBusy(true); setError('');
    try {
      const { hasSubmitted } = await import('@/lib/midnight-client');
      const confirmed = await hasSubmitted(survey.contractAddress, secretFor(survey.id, 'participant'));
      if (!confirmed) throw new Error('The chain has not confirmed this response yet. Check again shortly.');
      await uploadResponse(pendingUpload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not finish syncing'); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!wallet.session) { await wallet.open(); return; }
    if (!eligible || !answer) return;
    setBusy(true); setError(''); setStatus('Preparing your private proof…');
    let pending: Pending | null = null;
    try {
      const midnight = await import('@/lib/midnight-client');
      const secret = secretFor(survey.id, 'participant');
      if (await midnight.hasSubmitted(survey.contractAddress, secret)) throw new Error('This credential has already submitted a response.');
      const salt = randomSecret();
      pending = { commitment: midnight.answerCommitmentFor(answer, salt), ciphertext: await encryptAnswer(survey.publicKey, answer, salt) };
      localStorage.setItem(`hushheron:pending:${survey.id}`, JSON.stringify(pending));
      setPendingUpload(pending);
      setStatus('Your wallet is proving eligibility and submitting on Midnight…');
      const finalizedId = await wallet.session.submit(survey.contractAddress, secret, answer, salt);
      setTxId(finalizedId);
      setStatus('Midnight confirmed your response. Syncing the encrypted answer…');
      await uploadResponse(pending);
    } catch (cause) {
      if (pending) {
        try {
          const { hasSubmitted } = await import('@/lib/midnight-client');
          if (await hasSubmitted(survey.contractAddress, secretFor(survey.id, 'participant'))) {
            await uploadResponse(pending);
            return;
          }
        } catch { /* keep the original error */ }
      }
      setError(cause instanceof Error ? cause.message : 'Submission failed');
    } finally { setBusy(false); }
  }

  if (success) return <div className="detail-grid"><div className="detail-card card"><div className="eyebrow">Response complete</div><div style={{ fontSize: 56, color: 'var(--sea)', margin: '20px 0' }}>✓</div><h1 className="serif" style={{ fontSize: 49, margin: 0 }}>Anonymous response verified.</h1><p className="muted">Midnight confirmed one eligible response. Your answer is encrypted in the survey directory, and no wallet address was attached to it.</p><div style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 24 }}><Link className="button" href="/app">Back to surveys</Link><button className="text-link" onClick={() => setShowDetails(!showDetails)}>View transaction details</button></div>{showDetails && <div className="code-box" style={{ marginTop: 20 }}>{txId || 'Confirmed on Midnight Preprod'}<br />{survey.contractAddress}</div>}</div></div>;

  return <>
    <div className="page-heading"><div><div className="eyebrow">Private survey</div><h1 className="serif">{survey.title}</h1><p className="muted">{survey.description || 'A little honesty can change a lot.'}</p></div>{creator && <Link className="button outline" href={`/app/survey/${survey.id}/results`}>Creator results ↗</Link>}</div>
    <div className="detail-grid"><div className="detail-card card"><span className="pill"><span className="dot" /> {closed ? 'Closed' : 'Accepting responses'}</span><h2 className="serif" style={{ marginTop: 25 }}>{survey.question}</h2><p className="muted">Choose a number from 1 to 5. Your individual answer stays off the public ledger.</p>
      <div className="choice-grid" role="group" aria-label="Your answer from 1 to 5">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={`choice ${answer === value ? 'selected' : ''}`} aria-pressed={answer === value} onClick={() => setAnswer(value)} disabled={closed}>{value}</button>)}</div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, margin: '9px 0 25px' }} className="muted"><span>Not at all</span><span>Very much</span></div>
      {!closed && !eligible && <div className="notice" style={{ marginBottom: 20 }}><strong>First, request access.</strong><br />Your browser creates a private credential. Share its approval code through a trusted channel so the creator can verify you and approve one code for you. Never share the secret itself.</div>}
      {error && <div className="error" role="alert" style={{ marginBottom: 15 }}>{error}</div>}
      {status && <div className="success" role="status" style={{ marginBottom: 15 }}>{status}</div>}
      {pendingUpload && <button className="button outline" disabled={busy} onClick={finishSync} style={{ marginBottom: 12 }}>Finish syncing verified answer</button>}
      {closed ? <p className="muted">This survey is closed.</p> : !eligible ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="button" onClick={requestEligibility} disabled={!credential || busy}>{requested ? 'Request sent' : 'Request access ↗'}</button><button className="button outline" onClick={copyApprovalCode} disabled={!credential}>Copy approval code</button><button className="button outline" onClick={refreshEligibility} disabled={!credential || busy}>Check approval</button></div> : <button className="button" disabled={busy || !answer} onClick={submit}>{busy ? 'Verifying privately…' : wallet.session ? 'Verify and submit ↗' : 'Connect wallet to submit'}</button>}
    </div><div className="detail-card card"><div className="eyebrow">What stays private</div><h2 className="serif">Your voice, without your name.</h2><p>Your credential secret and eligibility path stay with you and your wallet’s proving setup. The answer is encrypted before it reaches the survey directory.</p><div className="rule" /><p><strong>Midnight verifies</strong> that the credential was approved and has not already responded.</p><p className="muted" style={{ fontSize: 12 }}>The creator can decrypt anonymous answers to compute the aggregate. Timing and wallet fee activity can still affect anonymity.</p><button className="text-link" onClick={() => setShowDetails(!showDetails)}>View technical details {showDetails ? '↑' : '↓'}</button>{showDetails && <div className="code-box" style={{ marginTop: 12 }}>Contract: {survey.contractAddress}<br />Credential commitment: {credential || 'Loading…'}</div>}</div></div>
  </>;
}
