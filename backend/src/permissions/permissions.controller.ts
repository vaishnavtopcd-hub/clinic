import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { SetPermissionsDto } from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { AuditService } from '../audit/audit.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  /** Permission catalog — available to any signed-in user (used to label the UI). */
  @Get('catalog')
  catalog() {
    return this.permissions.catalog();
  }

  /** Current role → permissions matrix. Super Admin only. */
  @Roles(Role.SUPER_ADMIN)
  @Get('matrix')
  matrix() {
    return this.permissions.getMatrix();
  }

  /** Replace the permission set for a role. Super Admin only. */
  @Roles(Role.SUPER_ADMIN)
  @Put(':role')
  async setRole(
    @Param('role') role: Role,
    @Body() dto: SetPermissionsDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.permissions.setRolePermissions(
      role,
      dto.permissions,
    );
    await this.audit.log({
      clinicId: null,
      userId: user.id,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entity: 'RolePermission',
      entityId: null,
      meta: { role, count: result.permissions.length },
    });
    return result;
  }
}
