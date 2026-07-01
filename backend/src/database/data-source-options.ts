import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds TypeORM connection options from env.
 *
 * Connection source (in priority order):
 *   1. DATABASE_URL — a full `postgresql://user:pass@host:port/db` string.
 *   2. Discrete DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME vars.
 *
 * Toggles:
 *   - DB_SSL=true         → connect over TLS (rejectUnauthorized:false; needed
 *                           by most managed/remote Postgres like RDS).
 *   - DB_SYNCHRONIZE      → auto-create/alter schema. Defaults to true (the app
 *                           has no migrations yet). SET THIS TO false against a
 *                           populated production database to avoid schema drift.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const url = config.get<string>('DATABASE_URL');
  const synchronize =
    config.get<string>('DB_SYNCHRONIZE', 'true').toLowerCase() !== 'false';
  const ssl =
    config.get<string>('DB_SSL', 'false').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined;

  const common = {
    type: 'postgres' as const,
    autoLoadEntities: true,
    synchronize,
    ssl,
    logging: false,
  };

  if (url) {
    return { ...common, url };
  }

  return {
    ...common,
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'physio_clinic'),
  };
}
