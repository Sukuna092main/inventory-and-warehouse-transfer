import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { readLocalEnvironment } from '../config/local-environment';
import { authDatabaseOptions } from './database-options';

// Run CLI commands from services/auth-service, as with pnpm start:dev.
export default new DataSource(
  authDatabaseOptions(validateEnvironment(readLocalEnvironment())),
);
