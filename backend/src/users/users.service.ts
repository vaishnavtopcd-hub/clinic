import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto, ListUsersQuery } from './dto';
import { Role } from '../common/enums';
import { AuthUser } from '../common/decorators';
import { paginate } from '../common/pagination';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Resolve which clinic a new/listed user belongs to, enforcing isolation. */
  private resolveClinicId(actor: AuthUser, requested?: string): string | null {
    if (actor.role === Role.SUPER_ADMIN) return requested ?? null;
    // Clinic admins are locked to their own clinic.
    return actor.clinicId;
  }

  async findAll(actor: AuthUser, query: ListUsersQuery) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.clinic', 'clinic')
      .orderBy('u.createdAt', 'DESC');

    if (actor.role !== Role.SUPER_ADMIN) {
      qb.andWhere('u.clinicId = :cid', { cid: actor.clinicId });
    } else if (query.clinicId) {
      qb.andWhere('u.clinicId = :cid', { cid: query.clinicId });
    }

    if (query.role) qb.andWhere('u.role = :role', { role: query.role });

    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.name ILIKE :s', { s: `%${query.search}%` })
            .orWhere('u.email ILIKE :s', { s: `%${query.search}%` })
            .orWhere('u.phone ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthUser, id: string) {
    const user = await this.users.findOne({
      where: { id },
      relations: ['clinic'],
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertSameTenant(actor, user.clinicId);
    return user;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    // RBAC on which roles each actor may create.
    if (actor.role === Role.CLINIC_ADMIN && dto.role !== Role.PHYSIOTHERAPIST) {
      throw new ForbiddenException('Clinic admins can only create physiotherapists');
    }
    if (actor.role === Role.SUPER_ADMIN && dto.role === Role.PHYSIOTHERAPIST) {
      // Super admin typically manages clinic admins; still allow with clinicId.
    }

    const clinicId = this.resolveClinicId(actor, dto.clinicId);
    if (dto.role !== Role.SUPER_ADMIN && !clinicId) {
      throw new BadRequestException('clinicId is required for this role');
    }

    const exists = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) throw new BadRequestException('Email already in use');

    const user = this.users.create({
      clinicId: dto.role === Role.SUPER_ADMIN ? null : clinicId,
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      specialization: dto.specialization,
      isActive: true,
    });
    return this.users.save(user);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.findOne(actor, id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.specialization !== undefined)
      user.specialization = dto.specialization;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.users.save(user);
  }

  async remove(actor: AuthUser, id: string) {
    const user = await this.findOne(actor, id);
    await this.users.softRemove(user);
    return { success: true };
  }

  private assertSameTenant(actor: AuthUser, clinicId: string | null) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (clinicId !== actor.clinicId) {
      throw new ForbiddenException('Cross-clinic access denied');
    }
  }
}
