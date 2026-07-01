import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { NoteFieldType } from '../common/enums';

/** A selectable option for choice-style fields (dropdown, radio, multi-select). */
export interface TemplateFieldOption {
  label: string;
  value: string;
}

/** Per-field validation rules (all optional, applied by type in the renderer). */
export interface TemplateFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * A single configurable field in a template. Stored as JSON, so adding new
 * properties or field types never requires a schema migration.
 */
export interface TemplateField {
  /** Stable id used as the key for saved values. */
  id: string;
  type: NoteFieldType;
  label: string;
  placeholder?: string;
  defaultValue?: unknown;
  required: boolean;
  /** Display order (ascending). */
  order: number;
  /** Options for choice-style fields. */
  options?: TemplateFieldOption[];
  validation?: TemplateFieldValidation;
}

/**
 * A reusable clinical-note template owned by a single clinic. Physios pick an
 * active template during documentation; its `fields` drive a dynamic form.
 */
@Entity('clinical_note_templates')
@Index(['clinicId', 'isActive'])
export class ClinicalNoteTemplate extends BaseEntity {
  @Column({ type: 'uuid' })
  clinicId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Structural version, incremented each time the fields are edited. Each
   * consultation snapshots the version it was created against, so older records
   * stay pinned to the structure they used.
   */
  @Column({ type: 'int', default: 1 })
  version: number;

  /** Ordered list of configurable fields. */
  @Column({ type: 'jsonb', default: [] })
  fields: TemplateField[];
}
