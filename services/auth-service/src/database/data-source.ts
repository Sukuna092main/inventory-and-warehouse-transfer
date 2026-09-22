import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { authDatabaseOptions } from './database-options';

// Run CLI commands from services/auth-service, as with pnpm start:dev.
const fileConfig = existsSync('.env')
  ? parseEnv(readFileSync('.env', 'utf8'))
  : {};

export default new DataSource(
  authDatabaseOptions(validateEnvironment({ ...fileConfig, ...process.env })),
);
