import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Clinic } from '../clinics/clinic.entity';

@Entity('machines')
export class Machine extends BaseEntity {
  /**
   * Null = global master machine (managed by Super Admin, visible to all clinics).
   * Set  = clinic-specific machine (managed by Clinic Admin).
   */
  @Column({ type: 'uuid', nullable: true })
  clinicId: string | null;

  @ManyToOne(() => Clinic, { nullable: true })
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;
}
