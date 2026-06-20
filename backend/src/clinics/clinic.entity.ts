import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('clinics')
export class Clinic extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: true })
  isActive: boolean;

  /** Free-form clinic settings (currency, theme, etc.). */
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;
}
