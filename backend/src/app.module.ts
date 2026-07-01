import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { buildTypeOrmOptions } from './database/data-source-options';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards';
import { PermissionsGuard } from './permissions/permissions.guard';

import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ClinicsModule } from './clinics/clinics.module';
import { PatientsModule } from './patients/patients.module';
import { MachinesModule } from './machines/machines.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { PermissionsModule } from './permissions/permissions.module';
import { HrModule } from './hr/hr.module';
import { MachineComplaintsModule } from './machine-complaints/machine-complaints.module';
import { NoteTemplatesModule } from './note-templates/note-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    AuditModule,
    AuthModule,
    ClinicsModule,
    PatientsModule,
    MachinesModule,
    ConsultationsModule,
    DashboardModule,
    ReportsModule,
    PermissionsModule,
    HrModule,
    MachineComplaintsModule,
    NoteTemplatesModule,
  ],
  providers: [
    // Global auth: every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC: enforces @Roles() metadata.
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global fine-grained permissions: enforces @RequirePermissions() metadata.
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
