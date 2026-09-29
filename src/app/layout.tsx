import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HushHeron — Verified feedback, privately',
  description: 'Create surveys with private responses and verifiable participation on Midnight.',
  icons: { icon: '/logo_hushheron.png', apple: '/logo_hushheron.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
