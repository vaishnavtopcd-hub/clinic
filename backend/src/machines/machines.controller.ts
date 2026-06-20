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
import { MachinesService } from './machines.service';
import { CreateMachineDto, UpdateMachineDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { PaginationQuery } from '../common/pagination';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('machines')
@ApiBearerAuth()
@Controller('machines')
export class MachinesController {
  constructor(private readonly machines: MachinesService) {}

  // Any authenticated clinic user can list machines (needed for consultations).
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    return this.machines.findAll(user, query);
  }

  @Get('active')
  listActive(@CurrentUser() user: AuthUser) {
    return this.machines.listActive(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.machines.findOne(user, id);
  }

  // Only admins manage the machine master.
  @Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
  @RequirePermissions('machines.manage')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMachineDto) {
    return this.machines.create(user, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
  @RequirePermissions('machines.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMachineDto,
  ) {
    return this.machines.update(user, id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
  @RequirePermissions('machines.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.machines.remove(user, id);
  }
}
