import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Clinic } from '../../clinics/clinic.entity';
import { Employee } from './employee.entity';
import { PayrollStatus } from '../../common/enums';

@Entity('hr_payroll')
// One payroll record per employee per period (month).
@Index(['employeeId', 'periodMonth'], { unique: true, where: '"deletedAt" IS NULL' })
export class Payroll extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;

  /** Payroll period as 'YYYY-MM'. */
  @Column()
  periodMonth: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  baseSalary: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  allowances: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  deductions: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  netPay: number;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.UNPAID })
  status: PayrollStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ nullable: true })
  notes?: string;
}
