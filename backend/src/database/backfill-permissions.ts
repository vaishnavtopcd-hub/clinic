/**
 * One-off, non-destructive backfill: ensures existing role_permissions rows
 * gain any newly-added catalog permissions they should have by default
 * (e.g. note-templates.*). Existing custom grants are preserved — we only
 * ADD missing default keys, never remove.
 *
 * Run with:  npx ts-node -r tsconfig-paths/register src/database/backfill-permissions.ts
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { RolePermission } from '../permissions/role-permission.entity';
import { CONFIGURABLE_ROLES, DEFAULT_ROLE_PERMISSIONS } from '../common/permissions';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const dbSsl =
  process.env.DB_SSL?.toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : undefined;

const ds = new DataSource({
  type: 'postgres',
  ...(dbUrl
    ? { url: dbUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'physio_clinic',
      }),
  ssl: dbSsl,
  entities: [RolePermission],
  synchronize: false,
});

async function run() {
  await ds.initialize();
  const repo = ds.getRepository(RolePermission);

  for (const role of CONFIGURABLE_ROLES) {
    const row = await repo.findOne({ where: { role } });
    if (!row) {
      // No stored row → defaults already apply at runtime, nothing to do.
      console.log(`${role}: no stored row (uses defaults)`);
      continue;
    }
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    const missing = defaults.filter((k) => !row.permissions.includes(k));
    if (missing.length === 0) {
      console.log(`${role}: already up to date`);
      continue;
    }
    row.permissions = [...new Set([...row.permissions, ...missing])];
    await repo.save(row);
    console.log(`${role}: added ${missing.join(', ')}`);
  }

  await ds.destroy();
  console.log('Backfill complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
