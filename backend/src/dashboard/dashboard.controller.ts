import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.PHYSIOTHERAPIST)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @RequirePermissions('dashboard.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user.clinicId!);
  }

  @RequirePermissions('payments.view')
  @Get('payments')
  payments(@CurrentUser() user: AuthUser) {
    return this.dashboard.paymentDashboard(user.clinicId!);
  }
}
