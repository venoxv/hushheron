import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  eligibilityPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
                  commitment_0: Uint8Array): [PS, { leaf: Uint8Array,
                                                    path: { sibling: { field: bigint
                                                                     },
                                                            goes_left: boolean
                                                          }[]
                                                  }];
}

export type ImpureCircuits<PS> = {
  approveParticipant(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitAnswer(context: __compactRuntime.CircuitContext<PS>,
               answer_0: bigint,
               salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeSurvey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  approveParticipant(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitAnswer(context: __compactRuntime.CircuitContext<PS>,
               answer_0: bigint,
               salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeSurvey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  creatorCommitment(secret_0: Uint8Array): Uint8Array;
  eligibilityCommitment(secret_0: Uint8Array): Uint8Array;
  responseNullifier(secret_0: Uint8Array): Uint8Array;
  answerCommitment(answer_0: bigint, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  creatorCommitment(context: __compactRuntime.CircuitContext<PS>,
                    secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  eligibilityCommitment(context: __compactRuntime.CircuitContext<PS>,
                        secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  responseNullifier(context: __compactRuntime.CircuitContext<PS>,
                    secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  answerCommitment(context: __compactRuntime.CircuitContext<PS>,
                   answer_0: bigint,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  approveParticipant(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitAnswer(context: __compactRuntime.CircuitContext<PS>,
               answer_0: bigint,
               salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  closeSurvey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly creatorKey: Uint8Array;
  eligibilityTree: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  approvedCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  answerCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly eligibleCount: bigint;
  readonly responseCount: bigint;
  readonly isClosed: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               key_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
