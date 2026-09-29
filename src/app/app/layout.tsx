import { AppShell } from '@/components/app-shell';
import { WalletProvider } from '@/components/wallet-provider';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WalletProvider><AppShell>{children}</AppShell></WalletProvider>;
}
