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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, ListEmployeesQuery, UpdateEmployeeDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('hr/employees')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @RequirePermissions('hr.employees.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListEmployeesQuery) {
    return this.employees.findAll(user, query);
  }

  @RequirePermissions('hr.employees.view')
  @Get('active')
  listActive(
    @CurrentUser() user: AuthUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.employees.listActive(user, clinicId);
  }

  // Physiotherapist accounts that can still be linked to a new staff record.
  @RequirePermissions('hr.employees.manage')
  @Get('physiotherapists')
  listPhysiotherapists(
    @CurrentUser() user: AuthUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.employees.listLinkablePhysiotherapists(user, clinicId);
  }

  @RequirePermissions('hr.employees.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employees.findOne(user, id);
  }

  @RequirePermissions('hr.employees.manage')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user, dto);
  }

  @RequirePermissions('hr.employees.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(user, id, dto);
  }

  @RequirePermissions('hr.employees.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employees.remove(user, id);
  }
}
