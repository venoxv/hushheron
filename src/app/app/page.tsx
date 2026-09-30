'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Survey } from '@/lib/types';
import { hasSurveyKey } from '@/lib/crypto-client';
import type { PublicSurveyState } from '@/lib/midnight-client';

export default function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingChain, setCheckingChain] = useState(true);
  const [chainStates, setChainStates] = useState<Record<string, PublicSurveyState | null>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/surveys');
        if (!response.ok) throw new Error('Could not load surveys');
        const listed = await response.json() as Survey[];
        if (!active) return;
        setSurveys(listed);
        setLoading(false);
        if (listed.length) {
          const { readSurveyState } = await import('@/lib/midnight-client');
          const states = await Promise.all(listed.map(async (survey) => {
            try { return [survey.id, await readSurveyState(survey.contractAddress)] as const; }
            catch { return [survey.id, null] as const; }
          }));
          if (active) setChainStates(Object.fromEntries(states));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load surveys');
      } finally {
        if (active) { setLoading(false); setCheckingChain(false); }
      }
    })();
    return () => { active = false; };
  }, []);
  const mine = surveys.filter((survey) => hasSurveyKey(survey.id)).length;
  const unknownState = surveys.some((survey) => !chainStates[survey.id]);
  const openCount = surveys.filter((survey) => chainStates[survey.id] && !chainStates[survey.id]!.isClosed).length;
  const openLabel = loading || checkingChain ? '—' : unknownState ? openCount ? `${openCount}+` : '—' : String(openCount);
  return <>
    <div className="page-heading"><div><div className="eyebrow">Your space</div><h1 className="serif">Good to hear from you.</h1><p className="muted">Find a conversation to join, or start one of your own.</p></div><Link className="button" href="/app/create">Create survey ↗</Link></div>
    <div className="stats"><div className="stat card"><div className="eyebrow">Open conversations</div><strong title={unknownState && !checkingChain ? 'At least this many; some chain statuses are unavailable' : undefined}>{openLabel}</strong></div><div className="stat card"><div className="eyebrow">Created here</div><strong>{loading ? '—' : mine}</strong></div><div className="stat card"><div className="eyebrow">Network</div><strong style={{ fontSize: 27, paddingTop: 11 }}>Preprod <span className="dot" /></strong></div></div>
    <div className="section-heading" style={{ marginBottom: 18 }}><div><div className="eyebrow">Discover</div><h2 className="serif" style={{ fontSize: 33 }}>Available surveys</h2></div></div>
    {error && <div className="error" role="alert">{error}</div>}
    {loading ? <div className="empty">Loading surveys…</div> : surveys.length ? <div className="survey-grid">
      {surveys.map((survey) => <Link className="survey-card card" href={`/app/survey/${survey.id}`} key={survey.id}>
        <div><span className="pill"><span className="dot" /> Anonymous response</span><h3 className="serif">{survey.title}</h3><p className="muted">{survey.question}</p></div>
        <div className="survey-card-bottom"><span>{checkingChain ? 'Checking Preprod…' : chainStates[survey.id] ? chainStates[survey.id]!.isClosed ? 'Closed' : `${chainStates[survey.id]!.responseCount} verified responses` : 'Chain status unavailable'}</span><span>{hasSurveyKey(survey.id) ? 'Creator view available ↗' : 'Open survey ↗'}</span></div>
      </Link>)}
    </div> : <div className="empty"><span className="eyebrow">No surveys yet</span><h2 className="serif">Start the first conversation.</h2><p className="muted">Create a question, approve participants, and gather verified answers.</p><Link className="button" href="/app/create">Create survey ↗</Link></div>}
  </>;
}
