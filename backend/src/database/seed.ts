/* eslint-disable no-console */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

import { Clinic } from '../clinics/clinic.entity';
import { User } from '../users/user.entity';
import { Patient } from '../patients/patient.entity';
import { Machine } from '../machines/machine.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { ClinicalNote } from '../consultations/entities/clinical-note.entity';
import { MachineUsage } from '../consultations/entities/machine-usage.entity';
import { Payment } from '../consultations/entities/payment.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { RolePermission } from '../permissions/role-permission.entity';
import {
  Gender,
  PaymentMethod,
  PaymentStatus,
  Role,
} from '../common/enums';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../common/permissions';

dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'physio_clinic',
  entities: [
    Clinic,
    User,
    Patient,
    Machine,
    Consultation,
    ClinicalNote,
    MachineUsage,
    Payment,
    AuditLog,
    RolePermission,
  ],
  synchronize: true,
});

async function run() {
  await ds.initialize();
  console.log('Connected. Seeding...');

  const pw = await bcrypt.hash('Passw0rd!', 10);

  // --- Default role permissions (global) ---
  const rpRepo = ds.getRepository(RolePermission);
  for (const role of CONFIGURABLE_ROLES) {
    const exists = await rpRepo.findOne({ where: { role } });
    if (!exists) {
      await rpRepo.save(
        rpRepo.create({ role, permissions: DEFAULT_ROLE_PERMISSIONS[role] }),
      );
    }
  }

  // --- Super admin (no clinic) ---
  const userRepo = ds.getRepository(User);
  await upsertUser(userRepo, {
    email: 'super@admin.com',
    name: 'Super Admin',
    role: Role.SUPER_ADMIN,
    clinicId: null,
    passwordHash: pw,
  });

  // --- Global machine master ---
  const machineRepo = ds.getRepository(Machine);
  const globalMachines = [
    'IFT',
    'Ultrasound',
    'Laser Therapy',
    'TENS',
    'Wax Bath',
    'Traction',
  ];
  for (const name of globalMachines) {
    const exists = await machineRepo.findOne({
      where: { name, clinicId: null as any },
    });
    if (!exists) {
      await machineRepo.save(
        machineRepo.create({ name, clinicId: null, isActive: true }),
      );
    }
  }

  // --- Clinic: Sunrise Physiotherapy ---
  const clinicRepo = ds.getRepository(Clinic);
  let clinic = await clinicRepo.findOne({ where: { name: 'Sunrise Physiotherapy' } });
  if (!clinic) {
    clinic = await clinicRepo.save(
      clinicRepo.create({
        name: 'Sunrise Physiotherapy',
        address: '12 Wellness Road, Pune',
        phone: '+91 90000 11111',
        email: 'contact@sunrise.com',
        isActive: true,
        settings: { currency: 'INR' },
      }),
    );
  }

  const admin = await upsertUser(userRepo, {
    email: 'admin@sunrise.com',
    name: 'Asha Admin',
    role: Role.CLINIC_ADMIN,
    clinicId: clinic.id,
    passwordHash: pw,
    phone: '+91 90000 22222',
  });

  const physio = await upsertUser(userRepo, {
    email: 'physio@sunrise.com',
    name: 'Dr. Ravi Kumar',
    role: Role.PHYSIOTHERAPIST,
    clinicId: clinic.id,
    passwordHash: pw,
    phone: '+91 90000 33333',
    specialization: 'Sports & Orthopaedic',
  });

  await upsertUser(userRepo, {
    email: 'physio2@sunrise.com',
    name: 'Dr. Meera Nair',
    role: Role.PHYSIOTHERAPIST,
    clinicId: clinic.id,
    passwordHash: pw,
    specialization: 'Neuro Rehab',
  });

  // --- Patients ---
  const patientRepo = ds.getRepository(Patient);
  const patientSeeds = [
    { fullName: 'Rahul Sharma', phone: '+91 98111 00001', age: 34, gender: Gender.MALE },
    { fullName: 'Priya Patel', phone: '+91 98111 00002', age: 28, gender: Gender.FEMALE },
    { fullName: 'Imran Khan', phone: '+91 98111 00003', age: 45, gender: Gender.MALE },
  ];
  const patients: Patient[] = [];
  let seq = await patientRepo.count({ where: { clinicId: clinic.id }, withDeleted: true });
  for (const p of patientSeeds) {
    let patient = await patientRepo.findOne({
      where: { clinicId: clinic.id, phone: p.phone },
    });
    if (!patient) {
      seq += 1;
      patient = await patientRepo.save(
        patientRepo.create({
          ...p,
          clinicId: clinic.id,
          patientCode: `PAT-${String(seq).padStart(6, '0')}`,
          address: 'Pune, Maharashtra',
        }),
      );
    }
    patients.push(patient);
  }

  // --- A couple of consultations (with notes, machines, payments) ---
  const consultationRepo = ds.getRepository(Consultation);
  const existingConsults = await consultationRepo.count({
    where: { clinicId: clinic.id },
  });
  if (existingConsults === 0) {
    const ift = await machineRepo.findOne({ where: { name: 'IFT' } });
    const us = await machineRepo.findOne({ where: { name: 'Ultrasound' } });

    await createConsultation(ds, {
      clinic,
      patient: patients[0],
      physio,
      chiefComplaint: 'Lower back pain for 2 weeks',
      diagnosis: 'Lumbar strain',
      treatmentPlan: 'IFT + core strengthening, 6 sessions',
      painScale: 6,
      machines: [
        { machine: ift!, durationMinutes: 15 },
        { machine: us!, durationMinutes: 10 },
      ],
      fee: 500,
      status: PaymentStatus.PAID,
    });

    await createConsultation(ds, {
      clinic,
      patient: patients[1],
      physio,
      chiefComplaint: 'Right shoulder stiffness',
      diagnosis: 'Frozen shoulder (early)',
      treatmentPlan: 'Ultrasound + mobilisation',
      painScale: 4,
      machines: [{ machine: us!, durationMinutes: 12 }],
      fee: 600,
      status: PaymentStatus.DUE,
    });
  }

  console.log('\nSeed complete. Logins (password: Passw0rd!):');
  console.log('  super@admin.com    (Super Admin)');
  console.log('  admin@sunrise.com  (Clinic Admin)');
  console.log('  physio@sunrise.com (Physiotherapist)');
  await ds.destroy();
}

async function upsertUser(
  repo: any,
  data: Partial<User> & { email: string },
): Promise<User> {
  let user = await repo.findOne({ where: { email: data.email } });
  if (!user) {
    user = await repo.save(repo.create({ isActive: true, ...data }));
  }
  return user;
}

async function createConsultation(
  ds: DataSource,
  opts: {
    clinic: Clinic;
    patient: Patient;
    physio: User;
    chiefComplaint: string;
    diagnosis: string;
    treatmentPlan: string;
    painScale: number;
    machines: { machine: Machine; durationMinutes: number }[];
    fee: number;
    status: PaymentStatus;
  },
) {
  await ds.transaction(async (em) => {
    const consultation = await em.save(
      em.create(Consultation, {
        clinicId: opts.clinic.id,
        patientId: opts.patient.id,
        physiotherapistId: opts.physio.id,
        consultationDate: new Date(),
        chiefComplaint: opts.chiefComplaint,
        diagnosis: opts.diagnosis,
        treatmentPlan: opts.treatmentPlan,
      }),
    );
    await em.save(
      em.create(ClinicalNote, {
        consultationId: consultation.id,
        assessment: 'Tenderness on palpation',
        findings: 'Reduced ROM',
        painScale: opts.painScale,
        rangeOfMotion: 'Flexion limited',
        exerciseAdvice: 'Gentle stretching twice daily',
        therapistNotes: 'Review after 3 sessions',
      }),
    );
    for (const m of opts.machines) {
      await em.save(
        em.create(MachineUsage, {
          consultationId: consultation.id,
          machineId: m.machine.id,
          machineName: m.machine.name,
          durationMinutes: m.durationMinutes,
        }),
      );
    }
    const isPaid = opts.status === PaymentStatus.PAID;
    await em.save(
      em.create(Payment, {
        clinicId: opts.clinic.id,
        consultationId: consultation.id,
        patientId: opts.patient.id,
        consultationFee: opts.fee,
        amountPaid: isPaid ? opts.fee : 0,
        method: PaymentMethod.CASH,
        status: opts.status,
        paidAt: isPaid ? new Date() : null,
      }),
    );
  });
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
