import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Role } from '../common/enums';
import { Clinic } from '../clinics/clinic.entity';

@Entity('users')
@Index(['email'], { unique: true, where: '"deletedAt" IS NULL' })
@Index(['username'], {
  unique: true,
  where: '"deletedAt" IS NULL AND "username" IS NOT NULL',
})
export class User extends BaseEntity {
  /** Null for SUPER_ADMIN (not bound to a single clinic). */
  @Column({ type: 'uuid', nullable: true })
  clinicId: string | null;

  @ManyToOne(() => Clinic, { nullable: true })
  @JoinColumn({ name: 'clinicId' })
  clinic?: Clinic;

  @Column()
  name: string;

  @Column()
  email: string;

  /** Optional unique login alias (login still uses email). */
  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  phone?: string;

  /** Optional free-text department/team label. */
  @Column({ nullable: true })
  department?: string;

  /** Optional postal/contact address. */
  @Column({ type: 'text', nullable: true })
  address?: string;

  /** Optional profile photo stored as a base64 data URL. */
  @Column({ type: 'text', nullable: true })
  photoUrl?: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  /** Physiotherapist specialization (optional). */
  @Column({ nullable: true })
  specialization?: string;

  @Column({ default: true })
  isActive: boolean;
}
