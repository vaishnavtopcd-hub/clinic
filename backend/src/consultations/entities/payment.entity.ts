import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { PaymentMethod, PaymentStatus } from '../../common/enums';
import { Consultation } from './consultation.entity';
import { Patient } from '../../patients/patient.entity';

@Entity('payments')
@Index(['clinicId', 'status'])
export class Payment extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @Column({ type: 'uuid' })
  consultationId: string;

  @OneToOne(() => Consultation, (c) => c.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultationId' })
  consultation?: Consultation;

  /** Denormalised for fast per-patient payment summaries. */
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient?: Patient;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  consultationFee: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.DUE })
  status: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;
}
