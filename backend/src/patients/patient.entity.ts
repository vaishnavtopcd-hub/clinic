import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Gender } from '../common/enums';
import { Clinic } from '../clinics/clinic.entity';

@Entity('patients')
// Phone must be unique *within* a clinic (duplicate-prevention rule).
@Index(['clinicId', 'phone'], { unique: true, where: '"deletedAt" IS NULL' })
export class Patient extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  /** Human-friendly sequential code, e.g. PAT-000123. */
  @Column()
  patientCode: string;

  @Column()
  fullName: string;

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column({ type: 'date', nullable: true })
  dob?: string;

  @Column({ nullable: true })
  bloodGroup?: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  altPhone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  emergencyContact?: string;
}
