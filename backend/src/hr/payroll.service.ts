import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from './entities/payroll.entity';
import { Employee } from './entities/employee.entity';
import { CreatePayrollDto, ListPayrollQuery, UpdatePayrollDto } from './dto';
import { AuthUser } from '../common/decorators';
import { PayrollStatus } from '../common/enums';
import { paginate, applyDateRange } from '../common/pagination';
import { listClinicId, ownClinicWhere } from './clinic-scope';

const num = (v: unknown) => Number(v ?? 0);
const netPay = (base: number, allowances: number, deductions: number) =>
  Math.max(0, num(base) + num(allowances) - num(deductions));

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payroll: Repository<Payroll>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  async findAll(actor: AuthUser, query: ListPayrollQuery) {
    const qb = this.payroll
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'employee')
      .orderBy('p.periodMonth', 'DESC')
      .addOrderBy('employee.fullName', 'ASC');

    const clinicId = listClinicId(actor, query.clinicId);
    if (clinicId) qb.andWhere('p.clinicId = :clinicId', { clinicId });
    if (query.employeeId)
      qb.andWhere('p.employeeId = :eid', { eid: query.employeeId });
    if (query.periodMonth)
      qb.andWhere('p.periodMonth = :pm', { pm: query.periodMonth });
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    applyDateRange(qb, 'p.createdAt', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthUser, id: string) {
    const record = await this.payroll.findOne({
      where: { id, ...ownClinicWhere(actor) },
      relations: ['employee'],
    });
    if (!record) throw new NotFoundException('Payroll record not found');
    return record;
  }

  /** Generate a payroll record for an employee for a given month. */
  async create(actor: AuthUser, dto: CreatePayrollDto) {
    const employee = await this.employees.findOne({
      where: { id: dto.employeeId, ...ownClinicWhere(actor) },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const dup = await this.payroll.findOne({
      where: { employeeId: dto.employeeId, periodMonth: dto.periodMonth },
    });
    if (dup) {
      throw new ConflictException(
        `Payroll for ${dto.periodMonth} already exists for this employee`,
      );
    }

    const baseSalary = dto.baseSalary ?? num(employee.baseSalary);
    const allowances = dto.allowances ?? 0;
    const deductions = dto.deductions ?? 0;
    const status = dto.status ?? PayrollStatus.UNPAID;

    const record = this.payroll.create({
      clinicId: employee.clinicId,
      employeeId: dto.employeeId,
      periodMonth: dto.periodMonth,
      baseSalary,
      allowances,
      deductions,
      netPay: netPay(baseSalary, allowances, deductions),
      status,
      paidAt: status === PayrollStatus.PAID ? new Date() : null,
      notes: dto.notes,
    });
    return this.payroll.save(record);
  }

  async update(actor: AuthUser, id: string, dto: UpdatePayrollDto) {
    const record = await this.findOne(actor, id);

    if (dto.baseSalary !== undefined) record.baseSalary = dto.baseSalary;
    if (dto.allowances !== undefined) record.allowances = dto.allowances;
    if (dto.deductions !== undefined) record.deductions = dto.deductions;
    if (dto.notes !== undefined) record.notes = dto.notes;
    record.netPay = netPay(
      num(record.baseSalary),
      num(record.allowances),
      num(record.deductions),
    );

    if (dto.status !== undefined && dto.status !== record.status) {
      record.status = dto.status;
      record.paidAt = dto.status === PayrollStatus.PAID ? new Date() : null;
    }
    return this.payroll.save(record);
  }

  async remove(actor: AuthUser, id: string) {
    const record = await this.findOne(actor, id);
    await this.payroll.softRemove(record);
    return { success: true };
  }
}
