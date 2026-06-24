import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../users/user.entity';
import { AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { PermissionsService } from '../permissions/permissions.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  clinicId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly permissions: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
      passReqToCallback: true,
    });
  }

  /** Validates the token subject still exists and is active. */
  async validate(req: Request, payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account inactive or not found');
    }
    // Resolve effective permissions and attach them to req.user for guards.
    const permissions = await this.permissions.resolveForUser(user);

    // Global clinic selector: a Super Admin (who has no clinic of their own)
    // may scope their session to one clinic via the X-Clinic-Id header. This
    // makes every clinic-scoped query behave as if they belonged to it
    // (read-only — write routes remain closed to Super Admin).
    let clinicId = user.clinicId;
    if (user.role === Role.SUPER_ADMIN) {
      const header = req.headers['x-clinic-id'];
      const selected = Array.isArray(header) ? header[0] : header;
      if (selected) clinicId = selected;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId,
      name: user.name,
      permissions,
    };
  }
}
