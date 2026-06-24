import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Clinic } from '../../clinics/clinic.entity';
import { User } from '../../users/user.entity';
import { EmploymentType, EmployeeStatus } from '../../common/enums';

@Entity('hr_employees')
@Index(['clinicId', 'employeeCode'], { unique: true, where: '"deletedAt" IS NULL' })
// One HR staff profile per physiotherapist user.
@Index(['clinicId', 'userId'], {
  unique: true,
  where: '"deletedAt" IS NULL AND "userId" IS NOT NULL',
})
export class Employee extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  /** The physiotherapist user this HR profile belongs to. */
  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  /** Human-friendly sequential code, e.g. EMP-000123. */
  @Column()
  employeeCode: string;

  /** Snapshot of the staff member's name (sourced from the linked user). */
  @Column()
  fullName: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  designation?: string;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({ type: 'date', nullable: true })
  dateOfJoining?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  baseSalary: number;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ nullable: true })
  address?: string;
}
