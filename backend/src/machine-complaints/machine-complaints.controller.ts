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
import { MachineComplaintsService } from './machine-complaints.service';
import {
  CreateMachineComplaintDto,
  ListMachineComplaintsQuery,
  UpdateMachineComplaintDto,
} from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

// Machine complaint / inspection tracking belongs to the Clinic Admin
// (Super Admin may oversee across clinics).
@ApiTags('machine-complaints')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
@Controller('machine-complaints')
export class MachineComplaintsController {
  constructor(private readonly service: MachineComplaintsService) {}

  @RequirePermissions('machine-complaints.view')
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMachineComplaintsQuery,
  ) {
    return this.service.findAll(user, query);
  }

  @RequirePermissions('machine-complaints.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @RequirePermissions('machine-complaints.manage')
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMachineComplaintDto,
  ) {
    return this.service.create(user, dto);
  }

  @RequirePermissions('machine-complaints.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMachineComplaintDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @RequirePermissions('machine-complaints.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
