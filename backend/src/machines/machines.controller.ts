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

  // Any clinic user with view access can list machines (needed for consultations).
  @RequirePermissions('machines.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    return this.machines.findAll(user, query);
  }

  @RequirePermissions('machines.view')
  @Get('active')
  listActive(
    @CurrentUser() user: AuthUser,
    @Query('excludeComplained') excludeComplained?: string,
  ) {
    return this.machines.listActive(user, excludeComplained === 'true');
  }

  @RequirePermissions('machines.view')
  @Get(':id/usage')
  usage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.machines.usageSummary(user, id, dateFrom, dateTo);
  }

  @RequirePermissions('machines.view')
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
