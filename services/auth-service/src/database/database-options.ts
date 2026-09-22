import type { DataSourceOptions } from 'typeorm';
import type { validateEnvironment } from '../config/environment';
import { User } from '../users/entities/user.entity';
import { UserPermission } from '../users/entities/user-permission.entity';
import { UserAuditLog } from '../users/entities/user-audit-log.entity';
import { CreateAuthTables1790035200000 } from './migrations/1790035200000-CreateAuthTables';

type DatabaseConfig = Omit<ReturnType<typeof validateEnvironment>, 'PORT'>;

export function authDatabaseOptions(config: DatabaseConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    username: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    schema: 'public',
    entities: [User, UserPermission, UserAuditLog],
    migrations: [CreateAuthTables1790035200000],
    migrationsTableName: 'auth_migrations',
    migrationsTransactionMode: 'all',
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    installExtensions: false,
    connectTimeoutMS: 5000,
  };
}
