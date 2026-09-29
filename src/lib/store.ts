import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EncryptedResponse, EligibilityRequest, Survey } from './types';

type Database = {
  surveys: Survey[];
  requests: Record<string, EligibilityRequest[]>;
  responses: Record<string, EncryptedResponse[]>;
};

const directory = process.env.HUSHHERON_DATA_DIR || path.join(process.cwd(), 'data');
const file = path.join(directory, 'hushheron.json');
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Database> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { surveys: [], requests: {}, responses: {} };
    }
    throw error;
  }
}

async function write(db: Database): Promise<void> {
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(db), { mode: 0o600 });
  await rename(temporary, file);
}

export async function listSurveys(): Promise<Survey[]> {
  return (await read()).surveys;
}

export async function getSurvey(id: string): Promise<Survey | undefined> {
  return (await read()).surveys.find((survey) => survey.id === id);
}

export async function getRequests(id: string): Promise<EligibilityRequest[]> {
  return (await read()).requests[id] ?? [];
}

export async function getResponses(id: string): Promise<EncryptedResponse[]> {
  return (await read()).responses[id] ?? [];
}

export function mutateStore<T>(mutation: (db: Database) => T): Promise<T> {
  const next = queue.then(async () => {
    const db = await read();
    const result = mutation(db);
    await write(db);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}
