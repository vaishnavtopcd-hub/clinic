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
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQuery } from '../common/pagination';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('patients')
@ApiBearerAuth()
@Roles(Role.CLINIC_ADMIN, Role.PHYSIOTHERAPIST)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @RequirePermissions('patients.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    return this.patients.findAll(user.clinicId!, query);
  }

  @RequirePermissions('patients.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.findOne(user.clinicId!, id);
  }

  @RequirePermissions('patients.create')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(user.clinicId!, dto);
  }

  @RequirePermissions('patients.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(user.clinicId!, id, dto);
  }

  @RequirePermissions('patients.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.remove(user.clinicId!, id);
  }
}
