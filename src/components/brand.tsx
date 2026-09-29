import Image from 'next/image';
import Link from 'next/link';

export function Brand() {
  return <Link className="brand" href="/" aria-label="HushHeron home">
    <Image className="brand-logo" src="/logo_hushheron.png" alt="" width={42} height={42} unoptimized />
    <span>hushheron<span style={{ color: 'var(--sea)' }}>.</span></span>
  </Link>;
}
