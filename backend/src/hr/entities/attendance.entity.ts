import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Clinic } from '../../clinics/clinic.entity';
import { Employee } from './employee.entity';
import { AttendanceStatus } from '../../common/enums';

@Entity('hr_attendance')
// One attendance record per employee per day.
@Index(['employeeId', 'date'], { unique: true, where: '"deletedAt" IS NULL' })
export class Attendance extends BaseEntity {
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

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'time', nullable: true })
  checkIn?: string;

  @Column({ type: 'time', nullable: true })
  checkOut?: string;

  @Column({ nullable: true })
  notes?: string;
}
