import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Clinic } from '../../clinics/clinic.entity';
import { Employee } from './employee.entity';
import { LeaveType, LeaveStatus } from '../../common/enums';

@Entity('hr_leave_requests')
export class LeaveRequest extends BaseEntity {
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

  @Column({ type: 'enum', enum: LeaveType, default: LeaveType.CASUAL })
  type: LeaveType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  /** User id of the reviewer (approver/rejecter). */
  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ nullable: true })
  reviewNote?: string;
}
