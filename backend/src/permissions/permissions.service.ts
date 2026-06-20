import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { Role } from '../common/enums';
import {
  ALL_PERMISSION_KEYS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from '../common/permissions';
import { AuthUser } from '../common/decorators';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly repo: Repository<RolePermission>,
  ) {}

  catalog() {
    return {
      groups: PERMISSION_CATALOG,
      configurableRoles: CONFIGURABLE_ROLES,
    };
  }

  /** Current matrix: every configurable role with its granted permission keys. */
  async getMatrix(): Promise<Record<string, string[]>> {
    const rows = await this.repo.find();
    const byRole = new Map(rows.map((r) => [r.role, r.permissions]));
    const matrix: Record<string, string[]> = {};
    for (const role of CONFIGURABLE_ROLES) {
      matrix[role] = byRole.get(role) ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    }
    return matrix;
  }

  async setRolePermissions(role: Role, keys: string[]) {
    if (!CONFIGURABLE_ROLES.includes(role)) {
      throw new BadRequestException(`Role ${role} is not configurable`);
    }
    const invalid = keys.filter((k) => !ALL_PERMISSION_KEYS.includes(k));
    if (invalid.length) {
      throw new BadRequestException(`Unknown permissions: ${invalid.join(', ')}`);
    }
    // De-duplicate.
    const permissions = [...new Set(keys)];
    let row = await this.repo.findOne({ where: { role } });
    if (row) {
      row.permissions = permissions;
    } else {
      row = this.repo.create({ role, permissions });
    }
    await this.repo.save(row);
    return { role, permissions };
  }

  /** Resolve the effective permission keys for a user. */
  async resolveForUser(user: { role: Role }): Promise<string[]> {
    // Super admin implicitly has every permission.
    if (user.role === Role.SUPER_ADMIN) return [...ALL_PERMISSION_KEYS];
    const row = await this.repo.findOne({ where: { role: user.role } });
    return row?.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];
  }
}
