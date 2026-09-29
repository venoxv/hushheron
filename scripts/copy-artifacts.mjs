import { cp, mkdir } from 'node:fs/promises';

await mkdir('public/managed', { recursive: true });
await cp('managed/hushheron/keys', 'public/managed/hushheron/keys', { recursive: true, force: true });
await cp('managed/hushheron/zkir', 'public/managed/hushheron/zkir', { recursive: true, force: true });
