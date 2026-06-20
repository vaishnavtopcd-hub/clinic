import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/patient.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { Payment } from '../consultations/entities/payment.entity';
import { MachineUsage } from '../consultations/entities/machine-usage.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Consultation, Payment, MachineUsage]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
