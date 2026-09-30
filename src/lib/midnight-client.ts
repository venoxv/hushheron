import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { dappConnectorProvingProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProofProvider, type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { fromHex, toHex, type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Binding, Proof, SignatureEnabled, Transaction, type FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { Configuration, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { firstValueFrom } from 'rxjs';
import * as HushHeron from '../../managed/hushheron/contract/index.js';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { hex } from './types';

type PrivateState = { secret: Uint8Array };
type Circuits = 'approveParticipant' | 'submitAnswer' | 'closeSurvey';
type Providers = MidnightProviders<Circuits, 'hushheronState', PrivateState>;
type ShieldedAddresses = Awaited<ReturnType<ConnectedAPI['getShieldedAddresses']>>;

const INDEXER = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';

export type PublicSurveyState = {
  eligibleCount: number;
  responseCount: number;
  isClosed: boolean;
  approved: string[];
  answerCommitments: string[];
};

function witnesses() {
  return {
    localSecret: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
      [privateState, privateState.secret],
    eligibilityPath: (
      { privateState, ledger }: { privateState: PrivateState; ledger: HushHeron.Ledger },
      commitment: Uint8Array,
    ) => {
      const path = ledger.eligibilityTree.findPathForLeaf(commitment);
      if (!path) throw new Error('Your credential has not been approved yet');
      return [privateState, path] as const;
    },
  };
}

const compiled = CompiledContract.make('hushheron', HushHeron.Contract).pipe(
  CompiledContract.withWitnesses(witnesses()),
  CompiledContract.withCompiledFileAssets('managed/hushheron'),
);

export const commitmentFor = (secret: Uint8Array): string => hex(HushHeron.pureCircuits.eligibilityCommitment(secret));
export const nullifierFor = (secret: Uint8Array): string => hex(HushHeron.pureCircuits.responseNullifier(secret));
export const answerCommitmentFor = (answer: number, salt: Uint8Array): string =>
  hex(HushHeron.pureCircuits.answerCommitment(BigInt(answer), salt));

const publicProvider = () => {
  setNetworkId('preprod');
  return indexerPublicDataProvider(INDEXER, INDEXER_WS);
};

export async function readSurveyState(address: string): Promise<PublicSurveyState> {
  const state = await firstValueFrom(publicProvider().contractStateObservable(address as ContractAddress, { type: 'latest' }));
  const ledger = HushHeron.ledger(state.data);
  return {
    eligibleCount: Number(ledger.eligibleCount),
    responseCount: Number(ledger.responseCount),
    isClosed: ledger.isClosed,
    approved: Array.from(ledger.approvedCommitments, hex),
    answerCommitments: Array.from(ledger.answerCommitments, ([, value]) => hex(value)),
  };
}

export async function isEligible(address: string, commitment: string): Promise<boolean> {
  const state = await firstValueFrom(publicProvider().contractStateObservable(address as ContractAddress, { type: 'latest' }));
  const ledger = HushHeron.ledger(state.data);
  return ledger.approvedCommitments.member(fromHex(commitment)) &&
    !!ledger.eligibilityTree.findPathForLeaf(fromHex(commitment));
}

export async function hasSubmitted(address: string, secret: Uint8Array): Promise<boolean> {
  const state = await firstValueFrom(publicProvider().contractStateObservable(address as ContractAddress, { type: 'latest' }));
  return HushHeron.ledger(state.data).usedNullifiers.member(fromHex(nullifierFor(secret)));
}

export class WalletSession {
  private providersPromise: Promise<Providers> | null = null;

  private constructor(
    readonly api: ConnectedAPI,
    readonly address: string,
    private readonly config: Configuration,
    private readonly addresses: ShieldedAddresses,
  ) {}

  static fromVerified(api: ConnectedAPI, config: Configuration, addresses: ShieldedAddresses): WalletSession {
    setNetworkId('preprod');
    if (config.networkId !== 'preprod') {
      throw new Error('Switch your wallet to Midnight Preprod and reconnect');
    }
    return new WalletSession(api, addresses.shieldedAddress, config, addresses);
  }

  private async makeProviders(): Promise<Providers> {
    const zkConfigProvider = new FetchZkConfigProvider<Circuits>(
      new URL('/managed/hushheron/', window.location.origin).toString(), fetch.bind(window),
    );
    try {
      await zkConfigProvider.getVerifierKeys(['approveParticipant', 'submitAnswer', 'closeSurvey']);
    } catch (cause) {
      throw new Error('The app could not load its compiled Midnight verifier keys. Check /managed/hushheron/keys/ on this host.', { cause });
    }
    let proofProvider: Providers['proofProvider'];
    try {
      proofProvider = createProofProvider(await dappConnectorProvingProvider(this.api, zkConfigProvider));
    } catch (cause) {
      throw new Error('The wallet could not initialize its Midnight proving provider. Check its proof-server setup and try again.', { cause });
    }
    const providers: Providers = {
      privateStateProvider: inMemoryPrivateStateProvider<'hushheronState', PrivateState>(),
      publicDataProvider: indexerPublicDataProvider(this.config.indexerUri, this.config.indexerWsUri),
      zkConfigProvider,
      proofProvider,
      walletProvider: {
        getCoinPublicKey: () => this.addresses.shieldedCoinPublicKey,
        getEncryptionPublicKey: () => this.addresses.shieldedEncryptionPublicKey,
        balanceTx: async (tx) => {
          const balanced = await this.api.balanceUnsealedTransaction(toHex(tx.serialize()));
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(balanced.tx)) as FinalizedTransaction;
        },
      },
      midnightProvider: {
        submitTx: async (tx) => {
          await this.api.submitTransaction(toHex(tx.serialize()));
          return tx.identifiers()[0];
        },
      },
    };
    return providers;
  }

  private getProviders(): Promise<Providers> {
    if (!this.providersPromise) {
      this.providersPromise = this.makeProviders().catch((cause) => {
        this.providersPromise = null;
        throw cause;
      });
    }
    return this.providersPromise;
  }

  async deploy(creatorSecret: Uint8Array): Promise<string> {
    const contract = await deployContract(await this.getProviders(), {
      compiledContract: compiled,
      args: [HushHeron.pureCircuits.creatorCommitment(creatorSecret)],
      privateStateId: 'hushheronState',
      initialPrivateState: { secret: creatorSecret },
    });
    return contract.deployTxData.public.contractAddress;
  }

  private async join(address: string, secret: Uint8Array) {
    return findDeployedContract(await this.getProviders(), {
      contractAddress: address as ContractAddress,
      compiledContract: compiled,
      privateStateId: 'hushheronState',
      initialPrivateState: { secret },
    });
  }

  async approve(address: string, creatorSecret: Uint8Array, commitment: Uint8Array): Promise<string> {
    const contract = await this.join(address, creatorSecret);
    const result = await contract.callTx.approveParticipant(commitment);
    return result.public.txId;
  }

  async submit(address: string, participantSecret: Uint8Array, answer: number, salt: Uint8Array): Promise<string> {
    const contract = await this.join(address, participantSecret);
    const result = await contract.callTx.submitAnswer(BigInt(answer), salt);
    return result.public.txId;
  }

  async close(address: string, creatorSecret: Uint8Array): Promise<string> {
    const contract = await this.join(address, creatorSecret);
    const result = await contract.callTx.closeSurvey();
    return result.public.txId;
  }
}
