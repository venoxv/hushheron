'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Survey } from '@/lib/types';
import { hasSurveyKey } from '@/lib/crypto-client';

export default function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/surveys').then(async (response) => {
      if (!response.ok) throw new Error('Could not load surveys');
      setSurveys(await response.json() as Survey[]);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load surveys'))
      .finally(() => setLoading(false));
  }, []);
  const mine = surveys.filter((survey) => hasSurveyKey(survey.id)).length;
  return <>
    <div className="page-heading"><div><div className="eyebrow">Your space</div><h1 className="serif">Good to hear from you.</h1><p className="muted">Find a conversation to join, or start one of your own.</p></div><Link className="button" href="/app/create">Create survey ↗</Link></div>
    <div className="stats"><div className="stat card"><div className="eyebrow">Open conversations</div><strong>{loading ? '—' : surveys.length}</strong></div><div className="stat card"><div className="eyebrow">Created here</div><strong>{loading ? '—' : mine}</strong></div><div className="stat card"><div className="eyebrow">Network</div><strong style={{ fontSize: 27, paddingTop: 11 }}>Preprod <span className="dot" /></strong></div></div>
    <div className="section-heading" style={{ marginBottom: 18 }}><div><div className="eyebrow">Discover</div><h2 className="serif" style={{ fontSize: 33 }}>Available surveys</h2></div></div>
    {error && <div className="error" role="alert">{error}</div>}
    {loading ? <div className="empty">Loading surveys…</div> : surveys.length ? <div className="survey-grid">
      {surveys.map((survey) => <Link className="survey-card card" href={`/app/survey/${survey.id}`} key={survey.id}>
        <div><span className="pill"><span className="dot" /> Anonymous response</span><h3 className="serif">{survey.title}</h3><p className="muted">{survey.question}</p></div>
        <div className="survey-card-bottom"><span>{hasSurveyKey(survey.id) ? 'Created by you' : 'Ready to join'}</span><span>Open survey ↗</span></div>
      </Link>)}
    </div> : <div className="empty"><span className="eyebrow">No surveys yet</span><h2 className="serif">Start the first conversation.</h2><p className="muted">Create a question, approve participants, and gather verified answers.</p><Link className="button" href="/app/create">Create survey ↗</Link></div>}
  </>;
}
