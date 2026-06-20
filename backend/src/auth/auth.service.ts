import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Clinic } from '../clinics/clinic.entity';
import { LoginDto, ChangePasswordDto } from './dto';
import { AuthUser } from '../common/decorators';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Clinic) private readonly clinics: Repository<Clinic>,
    private readonly jwt: JwtService,
    private readonly permissions: PermissionsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    // Block login if the clinic itself was deactivated.
    if (user.clinicId) {
      const clinic = await this.clinics.findOne({
        where: { id: user.clinicId },
      });
      if (!clinic || !clinic.isActive) {
        throw new UnauthorizedException('Clinic is deactivated');
      }
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['clinic'],
    });
    if (!user) throw new UnauthorizedException();
    const permissions = await this.permissions.resolveForUser(user);
    return this.serialize(user, permissions);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(user);
    return { success: true };
  }

  private async buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    };
    const permissions = await this.permissions.resolveForUser(user);
    return {
      accessToken: this.jwt.sign(payload),
      user: this.serialize(user, permissions),
    };
  }

  private serialize(user: User, permissions: string[] = []) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      clinicId: user.clinicId,
      specialization: user.specialization,
      permissions,
      clinic: user.clinic
        ? { id: user.clinic.id, name: user.clinic.name }
        : null,
    };
  }
}
