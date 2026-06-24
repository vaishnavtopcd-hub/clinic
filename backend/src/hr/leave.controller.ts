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
import { LeaveService } from './leave.service';
import { CreateLeaveDto, ListLeaveQuery, ReviewLeaveDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('hr/leave')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR)
@Controller('hr/leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @RequirePermissions('hr.leave.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListLeaveQuery) {
    return this.leave.findAll(user, query);
  }

  @RequirePermissions('hr.leave.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leave.findOne(user, id);
  }

  @RequirePermissions('hr.leave.manage')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaveDto) {
    return this.leave.create(user, dto);
  }

  @RequirePermissions('hr.leave.manage')
  @Patch(':id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leave.review(user, id, dto);
  }

  @RequirePermissions('hr.leave.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leave.remove(user, id);
  }
}
