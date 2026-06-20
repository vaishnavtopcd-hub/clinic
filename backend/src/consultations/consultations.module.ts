import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation } from './entities/consultation.entity';
import { ClinicalNote } from './entities/clinical-note.entity';
import { MachineUsage } from './entities/machine-usage.entity';
import { Payment } from './entities/payment.entity';
import { Machine } from '../machines/machine.entity';
import { Patient } from '../patients/patient.entity';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultation,
      ClinicalNote,
      MachineUsage,
      Payment,
      Machine,
      Patient,
    ]),
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
