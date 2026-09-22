import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export function readLocalEnvironment(): Record<string, string | undefined> {
  const fileConfig = existsSync('.env')
    ? parseEnv(readFileSync('.env', 'utf8'))
    : {};
  return { ...fileConfig, ...process.env };
}
