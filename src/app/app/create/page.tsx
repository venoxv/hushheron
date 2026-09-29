'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWallet } from '@/components/wallet-provider';
import { createSurveyKeys, exportSurveyBackup, secretFor } from '@/lib/crypto-client';
import type { Survey } from '@/lib/types';

export default function CreateSurvey() {
  const wallet = useWallet();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState<Survey | null>(null);
  const [pending, setPending] = useState<Survey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('hushheron:pending-survey');
        if (!saved) return;
        const survey = JSON.parse(saved) as Survey;
        if (!survey.id || !survey.contractAddress || !survey.title || !survey.question) return;
        setPending(survey);
        setTitle(survey.title);
        setQuestion(survey.question);
        setDescription(survey.description);
        setStep(2);
      } catch { /* ignore a damaged local draft */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function register(survey: Survey) {
    try {
      const response = await fetch('/api/surveys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(survey) });
      if (!response.ok) {
        const existing = await fetch(`/api/surveys/${survey.id}`);
        if (!existing.ok || (await existing.json() as Survey).contractAddress !== survey.contractAddress) {
          throw new Error('The contract deployed, but its survey listing could not be saved. Retry here; your deployed address is kept in this browser.');
        }
      }
      localStorage.removeItem('hushheron:pending-survey');
      setPublished(survey); setPending(null);
    } catch (cause) {
      if (cause instanceof Error && cause.message.startsWith('The contract deployed')) throw cause;
      throw new Error('The contract deployed, but its survey listing could not be saved. Retry here; your deployed address is kept in this browser.', { cause });
    }
  }

  async function publish() {
    if (!pending && !wallet.session) { await wallet.open(); return; }
    setBusy(true); setError('');
    try {
      if (pending) { await register(pending); return; }
      const id = crypto.randomUUID();
      const creatorSecret = secretFor(id, 'creator');
      const publicKey = await createSurveyKeys(id);
      const contractAddress = await wallet.session!.deploy(creatorSecret);
      const survey = { id, title: title.trim(), question: question.trim(), description: description.trim(), contractAddress, publicKey, createdAt: new Date().toISOString() };
      localStorage.setItem('hushheron:pending-survey', JSON.stringify(survey));
      setPending(survey);
      await register(survey);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish survey'); }
    finally { setBusy(false); }
  }

  async function copyBackup() {
    if (!published) return;
    await navigator.clipboard.writeText(exportSurveyBackup(published.id));
    setCopied(true);
  }

  if (published) return <div className="detail-grid"><div className="detail-card card"><div className="eyebrow">Published on Preprod</div><h1 className="serif" style={{ fontSize: 48, margin: '14px 0' }}>Your space is open.</h1><p className="muted">Share the survey, then approve participant requests from the results page. Keep your key backup safe so you can decrypt the aggregate later.</p><div className="code-box" style={{ margin: '22px 0' }}>{typeof window !== 'undefined' ? `${location.origin}/app/survey/${published.id}` : published.id}</div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link className="button" href={`/app/survey/${published.id}/results`}>Open creator view ↗</Link><button className="button outline" onClick={copyBackup}>{copied ? 'Backup copied' : 'Copy private backup'}</button></div></div><div className="detail-card card"><div className="eyebrow">On-chain contract</div><h2 className="serif">Verified from the start.</h2><div className="code-box">{published.contractAddress}</div><p className="muted">This address is public. Your creator secret and decryption key stay in this browser until you export them.</p></div></div>;

  return <>
    <div className="page-heading"><div><div className="eyebrow">Create a survey</div><h1 className="serif">Make room for truth.</h1><p className="muted">One focused question. Private answers. Verifiable participation.</p></div></div>
    <div className="progress" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((value) => <span key={value} className={value <= step ? 'done' : ''} />)}</div>
    <div className="detail-grid"><div className="detail-card card">
      {step === 0 && <div className="form-stack"><div><div className="eyebrow">01 / The conversation</div><h2 className="serif">What would you like to ask?</h2></div><div className="field"><label htmlFor="title">Survey name</label><input id="title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. A better team experience" /></div><div className="field"><label htmlFor="question">Your question</label><textarea id="question" maxLength={180} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="How supported do you feel in your work?" /><small>Participants answer on a private 1–5 scale.</small></div><div className="field"><label htmlFor="description">Short context (optional)</label><textarea id="description" maxLength={280} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A little context helps people answer honestly." /></div><div><button className="button" disabled={!title.trim() || !question.trim()} onClick={() => setStep(1)}>Continue ↗</button></div></div>}
      {step === 1 && <div className="form-stack"><div><div className="eyebrow">02 / Eligibility</div><h2 className="serif">You choose who can answer.</h2></div><div className="notice">Participants generate a private credential and request approval. Check each requester through a trusted channel, then match their approval code before approving. Approve only one code per person.</div><div className="card" style={{ padding: 20 }}><span className="pill"><span className="dot" /> Creator approval</span><p className="muted" style={{ marginBottom: 0 }}>Each approved credential can submit one verified response. The contract does not know who owns it.</p></div><div style={{ display: 'flex', gap: 9 }}><button className="button outline" onClick={() => setStep(0)}>Back</button><button className="button" onClick={() => setStep(2)}>Review ↗</button></div></div>}
      {step === 2 && <div className="form-stack"><div><div className="eyebrow">03 / Publish</div><h2 className="serif">Ready to listen?</h2></div><div className="card" style={{ padding: 20 }}><div className="eyebrow">{title}</div><p style={{ fontFamily: 'Georgia, serif', fontSize: 25, margin: '15px 0' }}>{question}</p><p className="muted" style={{ margin: 0 }}>{description || 'A private 1–5 scale survey'}</p></div><div className="notice">{pending ? 'Your contract is already deployed. Finish adding it to the survey directory; this will not deploy it twice.' : 'Publishing deploys a Compact contract to Midnight Preprod. Your wallet will ask you to approve the transaction and may take a few minutes to prove it.'}</div>{error && <div className="error" role="alert">{error}</div>}<div style={{ display: 'flex', gap: 9 }}><button className="button outline" disabled={busy || !!pending} onClick={() => setStep(1)}>Back</button><button className="button" disabled={busy} onClick={publish}>{busy ? 'Publishing on Preprod…' : pending ? 'Finish publishing ↗' : wallet.session ? 'Publish survey ↗' : 'Connect wallet to publish'}</button></div></div>}
    </div><div className="detail-card card"><div className="eyebrow">Privacy at a glance</div><h2 className="serif">A clear boundary.</h2><div className="rule" /><p><strong>Visible:</strong> verified response count, credential commitments, one-use nullifiers.</p><p><strong>Private:</strong> who owns each credential and the answer behind each response commitment.</p><p className="muted" style={{ fontSize: 12 }}>The creator can decrypt anonymous answers in this browser to form aggregate results. Keep the key backup private.</p></div></div>
  </>;
}
