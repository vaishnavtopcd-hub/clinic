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
import { AttendanceService } from './attendance.service';
import {
  ListAttendanceQuery,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('hr/attendance')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR, Role.CLINIC_ADMIN)
@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @RequirePermissions('hr.attendance.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListAttendanceQuery) {
    return this.attendance.findAll(user, query);
  }

  @RequirePermissions('hr.attendance.manage')
  @Post()
  mark(@CurrentUser() user: AuthUser, @Body() dto: MarkAttendanceDto) {
    return this.attendance.mark(user, dto);
  }

  @RequirePermissions('hr.attendance.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendance.update(user, id, dto);
  }

  @RequirePermissions('hr.attendance.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.attendance.remove(user, id);
  }
}
