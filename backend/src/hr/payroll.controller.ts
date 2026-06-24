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
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, ListPayrollQuery, UpdatePayrollDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('hr/payroll')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR)
@Controller('hr/payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @RequirePermissions('hr.payroll.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPayrollQuery) {
    return this.payroll.findAll(user, query);
  }

  @RequirePermissions('hr.payroll.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.findOne(user, id);
  }

  @RequirePermissions('hr.payroll.manage')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollDto) {
    return this.payroll.create(user, dto);
  }

  @RequirePermissions('hr.payroll.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDto,
  ) {
    return this.payroll.update(user, id, dto);
  }

  @RequirePermissions('hr.payroll.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.remove(user, id);
  }
}
