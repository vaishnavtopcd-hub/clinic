import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { AuthUser } from '../common/decorators';
import { PaginationQuery, paginate } from '../common/pagination';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
  ) {}

  async findAll(clinicId: string, query: PaginationQuery) {
    const qb = this.patients
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .orderBy('p.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('p.fullName ILIKE :s', { s: `%${query.search}%` })
            .orWhere('p.phone ILIKE :s', { s: `%${query.search}%` })
            .orWhere('p.patientCode ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(clinicId: string, id: string) {
    const patient = await this.patients.findOne({ where: { id, clinicId } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(clinicId: string, dto: CreatePatientDto) {
    // Duplicate-prevention: phone unique within clinic.
    const existing = await this.patients.findOne({
      where: { clinicId, phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(
        `A patient with phone ${dto.phone} already exists (${existing.patientCode})`,
      );
    }

    const patientCode = await this.nextPatientCode(clinicId);
    const patient = this.patients.create({
      ...dto,
      clinicId,
      patientCode,
    });
    return this.patients.save(patient);
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto) {
    const patient = await this.findOne(clinicId, id);
    if (dto.phone && dto.phone !== patient.phone) {
      const dup = await this.patients.findOne({
        where: { clinicId, phone: dto.phone },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException('Another patient already uses this phone');
      }
    }
    Object.assign(patient, dto);
    return this.patients.save(patient);
  }

  async remove(clinicId: string, id: string) {
    const patient = await this.findOne(clinicId, id);
    await this.patients.softRemove(patient);
    return { success: true };
  }

  /** Sequential per-clinic patient code, e.g. PAT-000042. */
  private async nextPatientCode(clinicId: string): Promise<string> {
    const count = await this.patients.count({
      where: { clinicId },
      withDeleted: true,
    });
    return `PAT-${String(count + 1).padStart(6, '0')}`;
  }
}
