import { notFound } from 'next/navigation';
import { getSurvey } from '@/lib/store';
import { Participation } from './participation';

export const runtime = 'nodejs';

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) notFound();
  return <Participation survey={survey} />;
}
