import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HrReportsService } from './hr-reports.service';
import { HrReportQuery } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('hr/reports')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.HR)
@RequirePermissions('hr.reports.view')
@Controller('hr/reports')
export class HrReportsController {
  constructor(private readonly reports: HrReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() query: HrReportQuery) {
    return this.reports.summary(user, query);
  }
}
