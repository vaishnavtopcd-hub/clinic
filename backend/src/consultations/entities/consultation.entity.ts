import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Clinic } from '../../clinics/clinic.entity';
import { Patient } from '../../patients/patient.entity';
import { User } from '../../users/user.entity';
import { ClinicalNote } from './clinical-note.entity';
import { MachineUsage } from './machine-usage.entity';
import { Payment } from './payment.entity';

@Entity('consultations')
@Index(['clinicId', 'consultationDate'])
export class Consultation extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient?: Patient;

  @Column({ type: 'uuid' })
  physiotherapistId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'physiotherapistId' })
  physiotherapist?: User;

  @Column({ type: 'timestamptz' })
  consultationDate: Date;

  @Column({ nullable: true })
  chiefComplaint?: string;

  @Column({ nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan?: string;

  /** General consultation notes (clinical detail lives in ClinicalNote). */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToOne(() => ClinicalNote, (n) => n.consultation, { cascade: true })
  clinicalNote?: ClinicalNote;

  @OneToMany(() => MachineUsage, (m) => m.consultation, { cascade: true })
  machineUsages?: MachineUsage[];

  @OneToOne(() => Payment, (p) => p.consultation, { cascade: true })
  payment?: Payment;
}
