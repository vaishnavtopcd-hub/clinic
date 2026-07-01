import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NoteTemplatesService } from './note-templates.service';
import { CreateNoteTemplateDto, UpdateNoteTemplateDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';
import { AuditService } from '../audit/audit.service';

/**
 * Clinical-note template management.
 *
 * - Managing (create/update/duplicate/activate/delete) is restricted to the
 *   Clinic Admin via @Roles — Super Admin is intentionally excluded.
 * - Reading is open to Physios (to use templates) and Super Admin (oversight).
 * - Every query is clinic-scoped in the service, so clinics never see each
 *   other's templates.
 */
@ApiTags('note-templates')
@ApiBearerAuth()
@Controller('note-templates')
export class NoteTemplatesController {
  constructor(
    private readonly templates: NoteTemplatesService,
    private readonly audit: AuditService,
  ) {}

  @Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.view')
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.templates.findAll(user, includeInactive !== 'false');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.CLINIC_ADMIN,
    Role.PHYSIOTHERAPIST,
    Role.FRONTEND_OFFICER,
  )
  @RequirePermissions('note-templates.view')
  @Get('active')
  findActive(@CurrentUser() user: AuthUser) {
    return this.templates.findActive(user);
  }

  @Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.PHYSIOTHERAPIST)
  @RequirePermissions('note-templates.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templates.findOne(user, id);
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateNoteTemplateDto,
  ) {
    const t = await this.templates.create(user, dto);
    await this.audit.log({
      clinicId: t.clinicId,
      userId: user.id,
      action: 'NOTE_TEMPLATE_CREATED',
      entity: 'ClinicalNoteTemplate',
      entityId: t.id,
    });
    return t;
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNoteTemplateDto,
  ) {
    return this.templates.update(user, id, dto);
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templates.duplicate(user, id);
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Patch(':id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templates.setActive(user, id, true);
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templates.setActive(user, id, false);
  }

  @Roles(Role.CLINIC_ADMIN)
  @RequirePermissions('note-templates.manage')
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.templates.remove(user, id);
    await this.audit.log({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'NOTE_TEMPLATE_DELETED',
      entity: 'ClinicalNoteTemplate',
      entityId: id,
    });
    return result;
  }
}
