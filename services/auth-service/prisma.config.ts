import { defineConfig } from 'prisma/config';
import { readLocalEnvironment } from './src/config/local-environment';
import { validateEnvironment } from './src/config/environment';
import { prismaDatabaseUrl } from './src/database/prisma/connection-options';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: prismaDatabaseUrl(validateEnvironment(readLocalEnvironment())),
  },
});
