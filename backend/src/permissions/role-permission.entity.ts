import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Role } from '../common/enums';

/**
 * Global permission set for a role (one row per role).
 * Applies to every clinic (global-only model).
 */
@Entity('role_permissions')
@Unique(['role'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
