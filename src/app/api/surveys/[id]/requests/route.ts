import { NextResponse } from 'next/server';
import { getRequests, getSurvey, mutateStore } from '@/lib/store';
import { isCommitment } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!(await getSurvey(id))) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  return NextResponse.json(await getRequests(id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { commitment?: unknown } | null;
  if (!(await getSurvey(id))) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  if (!isCommitment(input?.commitment)) return NextResponse.json({ error: 'Invalid commitment' }, { status: 400 });
  await mutateStore((db) => {
    const requests = db.requests[id] ??= [];
    if (!requests.some((item) => item.commitment === input!.commitment)) {
      requests.push({ commitment: input!.commitment as string });
    }
  });
  return NextResponse.json({ received: true }, { status: 201 });
}
