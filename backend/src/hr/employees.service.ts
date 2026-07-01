import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, In, IsNull, Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { User } from '../users/user.entity';
import { CreateEmployeeDto, ListEmployeesQuery, UpdateEmployeeDto } from './dto';
import { AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { paginate, applyDateRange } from '../common/pagination';
import { listClinicId, ownClinicWhere, resolveClinicId } from './clinic-scope';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async findAll(actor: AuthUser, query: ListEmployeesQuery) {
    const qb = this.employees
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .leftJoinAndSelect('e.clinic', 'clinic')
      .orderBy('e.createdAt', 'DESC');

    const clinicId = listClinicId(actor, query.clinicId);
    if (clinicId) qb.andWhere('e.clinicId = :clinicId', { clinicId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('e.fullName ILIKE :s', { s: `%${query.search}%` })
            .orWhere('e.phone ILIKE :s', { s: `%${query.search}%` })
            .orWhere('e.employeeCode ILIKE :s', { s: `%${query.search}%` })
            .orWhere('e.email ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }
    applyDateRange(qb, 'e.createdAt', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  /** Active staff for selects (no pagination). */
  async listActive(actor: AuthUser, clinicId?: string) {
    const scoped = listClinicId(actor, clinicId);
    return this.employees.find({
      where: { status: 'ACTIVE' as any, ...(scoped ? { clinicId: scoped } : {}) },
      order: { fullName: 'ASC' },
    });
  }

  /** Physiotherapist user accounts in the clinic not yet linked to a staff record. */
  async listLinkablePhysiotherapists(actor: AuthUser, clinicId?: string) {
    const scoped = listClinicId(actor, clinicId);

    const linked = await this.employees.find({
      where: { userId: Not(IsNull()), ...(scoped ? { clinicId: scoped } : {}) },
      select: ['userId'],
    });
    const linkedIds = linked.map((e) => e.userId!).filter(Boolean);

    return this.users.find({
      where: {
        role: Role.PHYSIOTHERAPIST,
        isActive: true,
        ...(scoped ? { clinicId: scoped } : {}),
        ...(linkedIds.length ? { id: Not(In(linkedIds)) } : {}),
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(actor: AuthUser, id: string) {
    const employee = await this.employees.findOne({
      where: { id, ...ownClinicWhere(actor) },
      relations: ['user', 'clinic'],
    });
    if (!employee) throw new NotFoundException('Staff member not found');
    return employee;
  }

  async create(actor: AuthUser, dto: CreateEmployeeDto) {
    const clinicId = resolveClinicId(actor, dto.clinicId);

    const user = await this.users.findOne({ where: { id: dto.userId } });
    if (!user || user.role !== Role.PHYSIOTHERAPIST) {
      throw new BadRequestException('Selected user is not a physiotherapist');
    }
    if (user.clinicId !== clinicId) {
      throw new BadRequestException(
        'Physiotherapist does not belong to this clinic',
      );
    }

    const existing = await this.employees.findOne({
      where: { clinicId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'This physiotherapist already has a staff record',
      );
    }

    const employeeCode = await this.nextEmployeeCode(clinicId);
    const employee = this.employees.create({
      clinicId,
      userId: user.id,
      employeeCode,
      fullName: user.name,
      email: dto.email ?? user.email,
      phone: dto.phone ?? user.phone,
      designation: dto.designation ?? user.specialization,
      employmentType: dto.employmentType,
      dateOfJoining: dto.dateOfJoining,
      baseSalary: dto.baseSalary ?? 0,
      status: dto.status,
      address: dto.address,
      emergencyContact: dto.emergencyContact,
    });
    return this.employees.save(employee);
  }

  async update(actor: AuthUser, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(actor, id);
    Object.assign(employee, dto);
    return this.employees.save(employee);
  }

  async remove(actor: AuthUser, id: string) {
    const employee = await this.findOne(actor, id);
    await this.employees.softRemove(employee);
    return { success: true };
  }

  /** Sequential per-clinic staff code, e.g. EMP-000042. */
  private async nextEmployeeCode(clinicId: string): Promise<string> {
    const count = await this.employees.count({
      where: { clinicId },
      withDeleted: true,
    });
    return `EMP-${String(count + 1).padStart(6, '0')}`;
  }
}
