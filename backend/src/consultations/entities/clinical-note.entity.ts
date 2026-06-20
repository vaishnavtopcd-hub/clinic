import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Consultation } from './consultation.entity';

@Entity('clinical_notes')
export class ClinicalNote extends BaseEntity {
  @Column({ type: 'uuid' })
  consultationId: string;

  @OneToOne(() => Consultation, (c) => c.clinicalNote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultationId' })
  consultation?: Consultation;

  @Column({ type: 'text', nullable: true })
  assessment?: string;

  @Column({ type: 'text', nullable: true })
  findings?: string;

  /** Pain scale 0-10. */
  @Column({ type: 'int', nullable: true })
  painScale?: number;

  @Column({ nullable: true })
  rangeOfMotion?: string;

  @Column({ type: 'text', nullable: true })
  exerciseAdvice?: string;

  @Column({ type: 'text', nullable: true })
  therapistNotes?: string;
}
