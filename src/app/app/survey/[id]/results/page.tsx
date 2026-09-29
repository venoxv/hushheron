import { notFound } from 'next/navigation';
import { getSurvey } from '@/lib/store';
import { Results } from './results';

export const runtime = 'nodejs';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) notFound();
  return <Results survey={survey} />;
}
