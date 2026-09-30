import { cp, mkdir, rm, stat } from 'node:fs/promises';

// Validate both compiled directories before replacing the public copy.
await Promise.all(['keys', 'zkir'].map((name) => stat(`managed/hushheron/${name}`)));
await rm('public/managed/hushheron', { recursive: true, force: true });
await mkdir('public/managed', { recursive: true });
await cp('managed/hushheron/keys', 'public/managed/hushheron/keys', { recursive: true, force: true });
await cp('managed/hushheron/zkir', 'public/managed/hushheron/zkir', { recursive: true, force: true });
