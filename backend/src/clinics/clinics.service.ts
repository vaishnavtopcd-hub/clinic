import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Clinic } from './clinic.entity';
import { User } from '../users/user.entity';
import { CreateClinicDto, UpdateClinicDto } from './dto';
import { Role } from '../common/enums';
import { PaginationQuery, paginate, applyDateRange } from '../common/pagination';

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
    applyDateRange(qb, 'c.createdAt', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    // Attach each clinic's admin(s) so the UI can show / manage assignment.
    const adminsByClinic = await this.adminsForClinics(data.map((c) => c.id));
    const withAdmins = data.map((c) => ({
      ...c,
      admins: adminsByClinic.get(c.id) ?? [],
    }));
    return paginate(withAdmins, total, query.page, query.limit);
  }

  /** Map of clinicId -> its Clinic Admin accounts (id/name/email/status). */
  private async adminsForClinics(clinicIds: string[]) {
    const map = new Map<
      string,
      { id: string; name: string; email: string; isActive: boolean }[]
    >();
    if (clinicIds.length === 0) return map;
    const admins = await this.users.find({
      where: { role: Role.CLINIC_ADMIN, clinicId: In(clinicIds) },
      order: { createdAt: 'ASC' },
    });
    for (const a of admins) {
      const list = map.get(a.clinicId!) ?? [];
      list.push({
        id: a.id,
        name: a.name,
        email: a.email,
        isActive: a.isActive,
      });
      map.set(a.clinicId!, list);
    }
    return map;
  }

  async findOne(id: string) {
    const clinic = await this.clinics.findOne({ where: { id } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async create(dto: CreateClinicDto) {
    // Bootstrap admin is optional, but if requested all fields are required.
    const wantsAdmin = !!(dto.adminName || dto.adminEmail || dto.adminPassword);
    if (wantsAdmin) {
      if (!dto.adminName || !dto.adminEmail || !dto.adminPassword) {
        throw new BadRequestException(
          'Clinic admin requires name, email and password together',
        );
      }
      const exists = await this.users.findOne({
        where: { email: dto.adminEmail.toLowerCase() },
      });
      if (exists) {
        throw new BadRequestException('Admin email already in use');
      }
    }

    // Create the clinic and its first admin atomically so a failed admin
    // never leaves an orphan clinic behind.
    return this.clinics.manager.transaction(async (em) => {
      const clinic = await em.save(
        em.create(Clinic, {
          name: dto.name,
          address: dto.address,
          phone: dto.phone,
          email: dto.email,
          isActive: true,
          settings: {},
        }),
      );

      if (wantsAdmin) {
        await em.save(
          em.create(User, {
            clinicId: clinic.id,
            name: dto.adminName,
            email: dto.adminEmail!.toLowerCase(),
            passwordHash: await bcrypt.hash(dto.adminPassword!, 10),
            role: Role.CLINIC_ADMIN,
            isActive: true,
          }),
        );
      }
      return clinic;
    });
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
