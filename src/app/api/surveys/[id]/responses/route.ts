import { NextResponse } from 'next/server';
import { getResponses, getSurvey, mutateStore } from '@/lib/store';
import { isCommitment } from '@/lib/types';
import { isEncryptedResponse } from '@/lib/response-validation';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!(await getSurvey(id))) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  return NextResponse.json(await getResponses(id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = await request.json().catch(() => null) as { commitment?: unknown; ciphertext?: unknown } | null;
  const survey = await getSurvey(id);
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  if (!isCommitment(input?.commitment) || !isEncryptedResponse(input?.ciphertext, survey.publicKey)) {
    return NextResponse.json({ error: 'Invalid encrypted response' }, { status: 400 });
  }
  await mutateStore((db) => {
    const responses = db.responses[id] ??= [];
    // A public commitment can attract a bogus upload before the real one.
    // Keep distinct candidates; the creator only counts ciphertext that
    // decrypts to the answer and salt matching the on-chain commitment.
    if (!responses.some((item) => item.commitment === input!.commitment && item.ciphertext === input!.ciphertext)) {
      responses.push({ commitment: input!.commitment as string, ciphertext: input!.ciphertext as string });
    }
  });
  return NextResponse.json({ received: true }, { status: 201 });
}
