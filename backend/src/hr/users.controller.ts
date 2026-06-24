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
import { HrUsersService } from './users.service';
import { CreateUserDto, ListHrUsersQuery, UpdateUserDto } from './users.dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

// Staff-account management belongs to the HR role (and Super Admin).
// Clinic Admins run clinic operations, not user/role administration.
@ApiTags('hr/staff')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR)
@Controller('hr/staff')
export class HrUsersController {
  constructor(private readonly users: HrUsersService) {}

  @RequirePermissions('hr.staff.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListHrUsersQuery) {
    return this.users.findAll(user, query);
  }

  @RequirePermissions('hr.staff.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.findOne(user, id);
  }

  /** Performance & activity metrics for a staff member. */
  @RequirePermissions('hr.staff.view')
  @Get(':id/performance')
  performance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.performance(user, id);
  }

  @RequirePermissions('hr.staff.manage')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @RequirePermissions('hr.staff.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }

  @RequirePermissions('hr.staff.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.remove(user, id);
  }
}
