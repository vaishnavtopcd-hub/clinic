import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportRangeQuery } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN)
@RequirePermissions('reports.view')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('daily-patients')
  dailyPatients(@CurrentUser() user: AuthUser, @Query() q: ReportRangeQuery) {
    return this.reports.dailyPatients(user.clinicId!, q);
  }

  @Get('daily-consultations')
  dailyConsultations(
    @CurrentUser() user: AuthUser,
    @Query() q: ReportRangeQuery,
  ) {
    return this.reports.dailyConsultations(user.clinicId!, q);
  }

  @Get('daily-collection')
  dailyCollection(@CurrentUser() user: AuthUser, @Query() q: ReportRangeQuery) {
    return this.reports.dailyCollection(user.clinicId!, q);
  }

  @Get('pending-payments')
  pendingPayments(@CurrentUser() user: AuthUser, @Query() q: ReportRangeQuery) {
    return this.reports.pendingPayments(user.clinicId!, q);
  }

  @Get('machine-usage')
  machineUsage(@CurrentUser() user: AuthUser, @Query() q: ReportRangeQuery) {
    return this.reports.machineUsage(user.clinicId!, q);
  }

  @Get('physiotherapist-activity')
  physiotherapistActivity(
    @CurrentUser() user: AuthUser,
    @Query() q: ReportRangeQuery,
  ) {
    return this.reports.physiotherapistActivity(user.clinicId!, q);
  }
}
