import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ClinicalNoteTemplate, TemplateField } from './note-template.entity';
import { CreateNoteTemplateDto, UpdateNoteTemplateDto, TemplateFieldDto } from './dto';
import { AuthUser } from '../common/decorators';
import { resolveClinicId, listClinicId } from '../hr/clinic-scope';

@Injectable()
export class NoteTemplatesService {
  constructor(
    @InjectRepository(ClinicalNoteTemplate)
    private readonly repo: Repository<ClinicalNoteTemplate>,
  ) {}

  /** Give every field a stable id and a concrete order/required value. */
  private normalizeFields(fields?: TemplateFieldDto[]): TemplateField[] {
    return (fields ?? []).map((f, i) => ({
      id: f.id || randomUUID(),
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      defaultValue: f.defaultValue,
      required: f.required ?? false,
      order: f.order ?? i,
      options: f.options,
      validation: f.validation,
    }));
  }

  /** All templates for the actor's clinic (admin view). */
  async findAll(actor: AuthUser, includeInactive = true) {
    const clinicId = listClinicId(actor);
    const where = clinicId ? { clinicId } : {};
    const list = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    return includeInactive ? list : list.filter((t) => t.isActive);
  }

  /** Active templates only — what physios pick during documentation. */
  async findActive(actor: AuthUser) {
    const clinicId = listClinicId(actor);
    return this.repo.find({
      where: clinicId ? { clinicId, isActive: true } : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /** Single template, scoped to the actor's clinic for isolation. */
  async findOne(actor: AuthUser, id: string) {
    const clinicId = listClinicId(actor);
    const template = await this.repo.findOne({
      where: clinicId ? { id, clinicId } : { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(actor: AuthUser, dto: CreateNoteTemplateDto) {
    const clinicId = resolveClinicId(actor);
    const template = this.repo.create({
      clinicId,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      version: 1,
      fields: this.normalizeFields(dto.fields),
    });
    return this.repo.save(template);
  }

  async update(actor: AuthUser, id: string, dto: UpdateNoteTemplateDto) {
    const template = await this.findOne(actor, id);
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    if (dto.fields !== undefined) {
      const next = this.normalizeFields(dto.fields);
      // Only bump the version when the structure actually changes, so existing
      // consultations that snapshotted an earlier version remain untouched and
      // new consultations pick up the new structure.
      if (JSON.stringify(next) !== JSON.stringify(template.fields)) {
        template.version = (template.version ?? 1) + 1;
      }
      template.fields = next;
    }
    return this.repo.save(template);
  }

  /** Clone a template (fresh ids) within the same clinic. */
  async duplicate(actor: AuthUser, id: string) {
    const source = await this.findOne(actor, id);
    const copy = this.repo.create({
      clinicId: source.clinicId,
      name: `${source.name} (Copy)`,
      description: source.description,
      isActive: source.isActive,
      version: 1,
      // New field ids so edits to the copy never collide with the original.
      fields: source.fields.map((f) => ({ ...f, id: randomUUID() })),
    });
    return this.repo.save(copy);
  }

  async setActive(actor: AuthUser, id: string, isActive: boolean) {
    const template = await this.findOne(actor, id);
    template.isActive = isActive;
    return this.repo.save(template);
  }

  async remove(actor: AuthUser, id: string) {
    const template = await this.findOne(actor, id);
    await this.repo.softRemove(template);
    return { success: true };
  }
}
