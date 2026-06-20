import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Consultation } from './consultation.entity';
import { Machine } from '../../machines/machine.entity';

@Entity('machine_usages')
export class MachineUsage extends BaseEntity {
  @Column({ type: 'uuid' })
  consultationId: string;

  @ManyToOne(() => Consultation, (c) => c.machineUsages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation?: Consultation;

  @Column({ type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machineId' })
  machine?: Machine;

  /** Snapshot of the machine name at time of use (history integrity). */
  @Column()
  machineName: string;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ nullable: true })
  notes?: string;
}
