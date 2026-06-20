import { Column, Entity, Index, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
@Index(['clinicId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  clinicId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  action: string;

  @Column({ nullable: true })
  entity?: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
