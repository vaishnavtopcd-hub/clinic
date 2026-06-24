import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Employee } from './entities/employee.entity';
import {
  ListAttendanceQuery,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto';
import { AuthUser } from '../common/decorators';
import { paginate } from '../common/pagination';
import { listClinicId, ownClinicWhere } from './clinic-scope';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendance: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  async findAll(actor: AuthUser, query: ListAttendanceQuery) {
    const qb = this.attendance
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'employee')
      .orderBy('a.date', 'DESC')
      .addOrderBy('employee.fullName', 'ASC');

    const clinicId = listClinicId(actor, query.clinicId);
    if (clinicId) qb.andWhere('a.clinicId = :clinicId', { clinicId });
    if (query.employeeId)
      qb.andWhere('a.employeeId = :eid', { eid: query.employeeId });
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.date) qb.andWhere('a.date = :date', { date: query.date });
    if (query.dateFrom) qb.andWhere('a.date >= :df', { df: query.dateFrom });
    if (query.dateTo) qb.andWhere('a.date <= :dt', { dt: query.dateTo });

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  /** Create or update the attendance record for an employee on a given day. */
  async mark(actor: AuthUser, dto: MarkAttendanceDto) {
    const employee = await this.requireEmployee(actor, dto.employeeId);

    let record = await this.attendance.findOne({
      where: { employeeId: dto.employeeId, date: dto.date },
    });
    if (record) {
      record.status = dto.status;
      record.checkIn = dto.checkIn;
      record.checkOut = dto.checkOut;
      record.notes = dto.notes;
    } else {
      record = this.attendance.create({
        clinicId: employee.clinicId,
        employeeId: dto.employeeId,
        date: dto.date,
        status: dto.status,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        notes: dto.notes,
      });
    }
    return this.attendance.save(record);
  }

  async update(actor: AuthUser, id: string, dto: UpdateAttendanceDto) {
    const record = await this.findOne(actor, id);
    Object.assign(record, dto);
    return this.attendance.save(record);
  }

  async findOne(actor: AuthUser, id: string) {
    const record = await this.attendance.findOne({
      where: { id, ...ownClinicWhere(actor) },
      relations: ['employee'],
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }

  async remove(actor: AuthUser, id: string) {
    const record = await this.findOne(actor, id);
    await this.attendance.softRemove(record);
    return { success: true };
  }

  private async requireEmployee(actor: AuthUser, employeeId: string) {
    const employee = await this.employees.findOne({
      where: { id: employeeId, ...ownClinicWhere(actor) },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }
}
