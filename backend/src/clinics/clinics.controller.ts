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
import { ClinicsService } from './clinics.service';
import { CreateClinicDto, UpdateClinicDto, UpdateClinicThemeDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQuery } from '../common/pagination';
import { AuditService } from '../audit/audit.service';

@ApiTags('clinics')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('clinics')
export class ClinicsController {
  constructor(
    private readonly clinics: ClinicsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.clinics.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinics.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateClinicDto, @CurrentUser() user: AuthUser) {
    const clinic = await this.clinics.create(dto);
    await this.audit.log({
      clinicId: clinic.id,
      userId: user.id,
      action: 'CLINIC_CREATED',
      entity: 'Clinic',
      entityId: clinic.id,
    });
    return clinic;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinics.update(id, dto);
  }

  // --- Branding / theme (Super Admin only, enforced by the class @Roles) ---
  @Patch(':id/theme')
  async setTheme(
    @Param('id') id: string,
    @Body() dto: UpdateClinicThemeDto,
    @CurrentUser() user: AuthUser,
  ) {
    const clinic = await this.clinics.setTheme(id, {
      primaryColor: dto.primaryColor,
      logoUrl: dto.logoUrl,
    });
    await this.audit.log({
      clinicId: id,
      userId: user.id,
      action: 'CLINIC_THEME_UPDATED',
      entity: 'Clinic',
      entityId: id,
    });
    return clinic;
  }

  @Delete(':id/theme')
  async resetTheme(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const clinic = await this.clinics.resetTheme(id);
    await this.audit.log({
      clinicId: id,
      userId: user.id,
      action: 'CLINIC_THEME_RESET',
      entity: 'Clinic',
      entityId: id,
    });
    return clinic;
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.clinics.setActive(id, true);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.audit.log({
      clinicId: id,
      userId: user.id,
      action: 'CLINIC_DEACTIVATED',
      entity: 'Clinic',
      entityId: id,
    });
    return this.clinics.setActive(id, false);
  }
}
