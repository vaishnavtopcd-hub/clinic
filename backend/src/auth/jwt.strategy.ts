import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthUser } from '../common/decorators';
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
    });
  }

  /** Validates the token subject still exists and is active. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account inactive or not found');
    }
    // Resolve effective permissions and attach them to req.user for guards.
    const permissions = await this.permissions.resolveForUser(user);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      name: user.name,
      permissions,
    };
  }
}
