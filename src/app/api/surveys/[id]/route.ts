import { NextResponse } from 'next/server';
import { getSurvey } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const survey = await getSurvey(id);
  return survey ? NextResponse.json(survey) : NextResponse.json({ error: 'Survey not found' }, { status: 404 });
}
