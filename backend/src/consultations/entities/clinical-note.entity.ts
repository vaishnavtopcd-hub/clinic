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

  // ---- Dynamic template data (optional) ----

  /** The template used, if any. */
  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  /** Template name snapshot (kept so display survives template edits/deletes). */
  @Column({ type: 'varchar', nullable: true })
  templateName?: string | null;

  /** Template structural version this note was created against. */
  @Column({ type: 'int', nullable: true })
  templateVersion?: number | null;

  /**
   * Full template field definitions at the moment this note was created — the
   * point-in-time snapshot. Rendering reads from here, so later edits to the
   * (mutable) template never alter existing records.
   */
  @Column({ type: 'jsonb', nullable: true })
  templateSnapshot?: unknown[] | null;

  /**
   * Entered values, snapshotted with their label & type so the record renders
   * independently of the (mutable) template definition.
   */
  @Column({ type: 'jsonb', nullable: true })
  templateValues?: {
    fieldId: string;
    label: string;
    type: string;
    value: unknown;
  }[] | null;
}
