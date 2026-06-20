import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Clinic } from './clinic.entity';
import { User } from '../users/user.entity';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import { Role } from '../common/enums';
import { PaginationQuery, paginate } from '../common/pagination';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic) private readonly clinics: Repository<Clinic>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findAll(query: PaginationQuery) {
    const qb = this.clinics.createQueryBuilder('c').orderBy('c.createdAt', 'DESC');
    if (query.search) {
      qb.where(
        new Brackets((w) =>
          w
            .where('c.name ILIKE :s', { s: `%${query.search}%` })
            .orWhere('c.email ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }
    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const clinic = await this.clinics.findOne({ where: { id } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async create(dto: CreateClinicDto) {
    const clinic = await this.clinics.save(
      this.clinics.create({
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        isActive: true,
        settings: {},
      }),
    );

    // Optionally bootstrap a clinic admin in the same call.
    if (dto.adminEmail && dto.adminPassword && dto.adminName) {
      const exists = await this.users.findOne({
        where: { email: dto.adminEmail.toLowerCase() },
      });
      if (exists) {
        throw new BadRequestException('Admin email already in use');
      }
      await this.users.save(
        this.users.create({
          clinicId: clinic.id,
          name: dto.adminName,
          email: dto.adminEmail.toLowerCase(),
          passwordHash: await bcrypt.hash(dto.adminPassword, 10),
          role: Role.CLINIC_ADMIN,
          isActive: true,
        }),
      );
    }
    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto) {
    const clinic = await this.findOne(id);
    Object.assign(clinic, dto);
    return this.clinics.save(clinic);
  }

  async setActive(id: string, isActive: boolean) {
    const clinic = await this.findOne(id);
    clinic.isActive = isActive;
    return this.clinics.save(clinic);
  }
}
