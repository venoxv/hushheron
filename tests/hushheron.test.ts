import { describe, expect, it } from 'vitest';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits, type Ledger } from '../managed/hushheron/contract/index.js';

type PrivateState = { secret: Uint8Array };
const COIN = '0'.repeat(64);
const ADDRESS = RT.sampleContractAddress();
const key = (value: number) => { const result = new Uint8Array(32); result[31] = value; return result; };

const witnesses = {
  localSecret: ({ privateState }: RT.WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] =>
    [privateState, privateState.secret],
  eligibilityPath: ({ privateState, ledger: current }: RT.WitnessContext<Ledger, PrivateState>, commitment: Uint8Array) => {
    const path = current.eligibilityTree.findPathForLeaf(commitment);
    if (!path) throw new Error('Credential not found');
    return [privateState, path] as [PrivateState, typeof path];
  },
};

function setup() {
  const creator = key(7);
  const contract = new Contract(witnesses);
  const constructor = contract.initialState(
    RT.createConstructorContext({ secret: creator }, COIN),
    pureCircuits.creatorCommitment(creator),
  );
  const context = RT.createCircuitContext(ADDRESS, COIN, constructor.currentContractState, { secret: creator });
  return { creator, contract, context };
}

describe('HushHeron Compact contract', () => {
  it('approves a private credential, accepts one in-range answer, and exposes only its commitment', () => {
    const { contract, context } = setup();
    const participant = key(11);
    const approved = contract.impureCircuits.approveParticipant(context, pureCircuits.eligibilityCommitment(participant));
    const participantContext = { ...approved.context, currentPrivateState: { secret: participant } };
    const salt = key(19);
    const submitted = contract.impureCircuits.submitAnswer(participantContext, 4n, salt);
    const publicState = ledger(submitted.context.currentQueryContext.state);

    expect(publicState.eligibleCount).toBe(1n);
    expect(publicState.responseCount).toBe(1n);
    expect(publicState.answerCommitments.lookup(0n)).toEqual(pureCircuits.answerCommitment(4n, salt));
    expect(publicState.answerCommitments.lookup(0n)).not.toEqual(salt);
    expect(publicState.usedNullifiers.member(pureCircuits.responseNullifier(participant))).toBe(true);
    expect(publicState.usedNullifiers.member(pureCircuits.eligibilityCommitment(participant))).toBe(false);
    expect(submitted.proofData.publicTranscript.length).toBeGreaterThan(0);
  });

  it('rejects an unapproved credential and a duplicate submission', () => {
    const { contract, context } = setup();
    const participant = key(12);
    const stranger = { ...context, currentPrivateState: { secret: participant } };
    expect(() => contract.impureCircuits.submitAnswer(stranger, 3n, key(20))).toThrow();

    const approved = contract.impureCircuits.approveParticipant(context, pureCircuits.eligibilityCommitment(participant));
    const participantContext = { ...approved.context, currentPrivateState: { secret: participant } };
    const submitted = contract.impureCircuits.submitAnswer(participantContext, 3n, key(20));
    expect(() => contract.impureCircuits.submitAnswer(submitted.context, 2n, key(21))).toThrow('Already submitted');
  });

  it('enforces answer bounds and creator-only approval/closing', () => {
    const { contract, context } = setup();
    const participant = key(13);
    const commitment = pureCircuits.eligibilityCommitment(participant);
    const stranger = { ...context, currentPrivateState: { secret: participant } };
    expect(() => contract.impureCircuits.approveParticipant(stranger, commitment)).toThrow('Creator approval required');

    const approved = contract.impureCircuits.approveParticipant(context, commitment);
    const participantContext = { ...approved.context, currentPrivateState: { secret: participant } };
    expect(() => contract.impureCircuits.submitAnswer(participantContext, 0n, key(22))).toThrow('Answer is below range');
    expect(() => contract.impureCircuits.submitAnswer(participantContext, 6n, key(22))).toThrow('Answer is above range');
    expect(() => contract.impureCircuits.closeSurvey(participantContext)).toThrow('Creator approval required');

    const closed = contract.impureCircuits.closeSurvey(approved.context);
    expect(ledger(closed.context.currentQueryContext.state).isClosed).toBe(true);
    expect(() => contract.impureCircuits.submitAnswer({ ...closed.context, currentPrivateState: { secret: participant } }, 4n, key(23))).toThrow('Survey is closed');
  });
});
