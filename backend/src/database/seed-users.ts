/* eslint-disable no-console */
/**
 * Creates login users only (no demo clinical data) — for bootstrapping a fresh
 * database. Safe to re-run: it only inserts accounts/clinic that don't exist.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/seed-users.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { Clinic } from '../clinics/clinic.entity';
import { User } from '../users/user.entity';
import { RolePermission } from '../permissions/role-permission.entity';
import { Role } from '../common/enums';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../common/permissions';

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
  entities: [Clinic, User, RolePermission],
  synchronize: false,
});

const PASSWORD = 'Passw0rd!';

async function upsertUser(
  repo: any,
  data: Partial<User> & { email: string },
): Promise<User> {
  let user = await repo.findOne({ where: { email: data.email } });
  if (user) {
    console.log(`  = exists: ${data.email}`);
    return user;
  }
  user = await repo.save(repo.create({ isActive: true, ...data }));
  console.log(`  + added:  ${data.email} (${data.role})`);
  return user;
}

async function run() {
  await ds.initialize();
  console.log('Connected. Adding users...');

  const pw = await bcrypt.hash(PASSWORD, 10);

  // Role permissions baseline (so non-super roles resolve correctly).
  const rpRepo = ds.getRepository(RolePermission);
  for (const role of CONFIGURABLE_ROLES) {
    const existing = await rpRepo.findOne({ where: { role } });
    if (existing) {
      existing.permissions = DEFAULT_ROLE_PERMISSIONS[role];
      await rpRepo.save(existing);
    } else {
      await rpRepo.save(
        rpRepo.create({ role, permissions: DEFAULT_ROLE_PERMISSIONS[role] }),
      );
    }
  }

  const userRepo = ds.getRepository(User);

  // Super admin (not bound to a clinic).
  await upsertUser(userRepo, {
    email: 'super@admin.com',
    name: 'Super Admin',
    role: Role.SUPER_ADMIN,
    clinicId: null,
    passwordHash: pw,
  });

  // A starter clinic for the clinic-bound roles.
  const clinicRepo = ds.getRepository(Clinic);
  let clinic = await clinicRepo.findOne({ where: { name: 'Main Clinic' } });
  if (!clinic) {
    clinic = await clinicRepo.save(
      clinicRepo.create({
        name: 'Main Clinic',
        isActive: true,
        settings: {},
      }),
    );
    console.log('  + clinic: Main Clinic');
  } else {
    console.log('  = clinic exists: Main Clinic');
  }

  await upsertUser(userRepo, {
    email: 'admin@clinic.com',
    name: 'Clinic Admin',
    role: Role.CLINIC_ADMIN,
    clinicId: clinic.id,
    passwordHash: pw,
  });
  await upsertUser(userRepo, {
    email: 'physio@clinic.com',
    name: 'Physiotherapist',
    role: Role.PHYSIOTHERAPIST,
    clinicId: clinic.id,
    passwordHash: pw,
    specialization: 'General Physiotherapy',
  });
  await upsertUser(userRepo, {
    email: 'hr@clinic.com',
    name: 'HR Officer',
    role: Role.HR,
    clinicId: clinic.id,
    passwordHash: pw,
  });
  await upsertUser(userRepo, {
    email: 'frontdesk@clinic.com',
    name: 'Front Desk Officer',
    role: Role.FRONTEND_OFFICER,
    clinicId: clinic.id,
    passwordHash: pw,
  });

  console.log(`\nDone. All users share password: ${PASSWORD}`);
  console.log('Logins:');
  console.log('  super@admin.com       (Super Admin)');
  console.log('  admin@clinic.com      (Clinic Admin)');
  console.log('  physio@clinic.com     (Physiotherapist)');
  console.log('  hr@clinic.com         (HR)');
  console.log('  frontdesk@clinic.com  (Front Desk Officer)');
  await ds.destroy();
}

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
