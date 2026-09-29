import { NextResponse } from 'next/server';
import { listSurveys, mutateStore } from '@/lib/store';
import type { Survey } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await listSurveys());
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as Partial<Survey> | null;
  if (!input || !/^[a-f0-9-]{36}$/i.test(input.id ?? '') ||
      typeof input.contractAddress !== 'string' || input.contractAddress.length < 20 ||
      typeof input.title !== 'string' || !input.title.trim() || input.title.length > 80 ||
      typeof input.question !== 'string' || !input.question.trim() || input.question.length > 180 ||
      typeof input.description !== 'string' || input.description.length > 280 ||
      !input.publicKey || input.publicKey.kty !== 'RSA' || input.publicKey.alg !== 'RSA-OAEP-256') {
    return NextResponse.json({ error: 'Invalid survey details' }, { status: 400 });
  }
  const survey: Survey = {
    id: input.id!, title: input.title.trim(), question: input.question.trim(),
    description: input.description.trim(), contractAddress: input.contractAddress,
    publicKey: input.publicKey, createdAt: new Date().toISOString(),
  };
  try {
    await mutateStore((db) => {
      if (db.surveys.some((item) => item.id === survey.id)) throw new Error('Survey already exists');
      db.surveys.unshift(survey);
    });
    return NextResponse.json(survey, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Survey already exists' }, { status: 409 });
  }
}
