import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Clinic } from '../clinics/clinic.entity';
import { Machine } from '../machines/machine.entity';
import { User } from '../users/user.entity';
import { ComplaintSeverity, ComplaintStatus } from '../common/enums';

/** A reported fault/issue on a machine, tracked through inspection to resolution. */
@Entity('machine_complaints')
@Index(['clinicId', 'status'])
export class MachineComplaint extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  @Column({ type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine?: Machine;

  /** Snapshot of the machine name at report time (history-safe). */
  @Column()
  machineName: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ComplaintSeverity,
    default: ComplaintSeverity.MEDIUM,
  })
  severity: ComplaintSeverity;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.OPEN,
  })
  status: ComplaintStatus;

  @Column({ type: 'uuid', nullable: true })
  reportedById?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reportedById' })
  reportedBy?: User;

  // ---- Inspection / resolution trail ----

  @Column({ type: 'uuid', nullable: true })
  inspectedById?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'inspectedById' })
  inspectedBy?: User;

  @Column({ type: 'text', nullable: true })
  inspectionNotes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  inspectedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;
}
