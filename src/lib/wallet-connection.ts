import type { Configuration, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { WalletSession } from './midnight-client';

export type ShieldedAddresses = Awaited<ReturnType<ConnectedAPI['getShieldedAddresses']>>;

/** Keep connection cheap; load contract code only for an on-chain action. */
export class WalletConnection {
  private contractSessionPromise: Promise<WalletSession> | null = null;

  private constructor(
    readonly api: ConnectedAPI,
    readonly address: string,
    private readonly config: Configuration,
    private readonly addresses: ShieldedAddresses,
  ) {}

  static async fromConnected(api: ConnectedAPI): Promise<WalletConnection> {
    // These calls are sequential because extensions may request permissions.
    const config = await api.getConfiguration();
    if (config.networkId !== 'preprod') {
      throw new Error('Switch your wallet to Midnight Preprod and reconnect');
    }
    const addresses = await api.getShieldedAddresses();
    if (!addresses.shieldedCoinPublicKey || !addresses.shieldedEncryptionPublicKey) {
      throw new Error('The wallet did not provide the shielded keys needed for Midnight transactions');
    }
    return new WalletConnection(api, addresses.shieldedAddress, config, addresses);
  }

  private contractSession(): Promise<WalletSession> {
    if (!this.contractSessionPromise) {
      this.contractSessionPromise = import('./midnight-client')
        .then(({ WalletSession }) => WalletSession.fromVerified(this.api, this.config, this.addresses))
        .catch((cause) => {
          this.contractSessionPromise = null;
          throw cause;
        });
    }
    return this.contractSessionPromise;
  }

  async deploy(creatorSecret: Uint8Array): Promise<string> {
    return (await this.contractSession()).deploy(creatorSecret);
  }

  async approve(address: string, creatorSecret: Uint8Array, commitment: Uint8Array): Promise<string> {
    return (await this.contractSession()).approve(address, creatorSecret, commitment);
  }

  async submit(address: string, participantSecret: Uint8Array, answer: number, salt: Uint8Array): Promise<string> {
    return (await this.contractSession()).submit(address, participantSecret, answer, salt);
  }

  async close(address: string, creatorSecret: Uint8Array): Promise<string> {
    return (await this.contractSession()).close(address, creatorSecret);
  }
}
