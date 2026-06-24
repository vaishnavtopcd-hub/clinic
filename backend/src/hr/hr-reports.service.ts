import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Payroll } from './entities/payroll.entity';
import { HrReportQuery } from './dto';
import { AuthUser } from '../common/decorators';
import { EmployeeStatus } from '../common/enums';
import { listClinicId } from './clinic-scope';

@Injectable()
export class HrReportsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Attendance)
    private readonly attendance: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leave: Repository<LeaveRequest>,
    @InjectRepository(Payroll)
    private readonly payroll: Repository<Payroll>,
  ) {}

  /** Adds a clinic filter to a query builder when one is in scope. */
  private scope<T extends import('typeorm').ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    clinicId?: string,
  ) {
    if (clinicId) qb.andWhere(`${alias}.clinicId = :clinicId`, { clinicId });
    return qb;
  }

  async summary(actor: AuthUser, query: HrReportQuery) {
    const clinicId = listClinicId(actor, query.clinicId);
    const today = new Date().toISOString().slice(0, 10);
    const from = query.dateFrom ?? today;
    const to = query.dateTo ?? today;
    const month = query.month ?? today.slice(0, 7);

    // ---- Employees ----
    const clinicWhere = clinicId ? { clinicId } : {};
    const [totalEmployees, activeEmployees] = await Promise.all([
      this.employees.count({ where: clinicWhere }),
      this.employees.count({
        where: { ...clinicWhere, status: EmployeeStatus.ACTIVE },
      }),
    ]);

    const byType = await this.scope(
      this.employees
        .createQueryBuilder('e')
        .select('e.employmentType', 'type')
        .addSelect('COUNT(e.id)', 'count')
        .groupBy('e.employmentType'),
      'e',
      clinicId,
    ).getRawMany();

    // ---- Attendance (for the date range) ----
    const attendanceRows = await this.scope(
      this.attendance
        .createQueryBuilder('a')
        .select('a.status', 'status')
        .addSelect('COUNT(a.id)', 'count')
        .where('a.date BETWEEN :from AND :to', { from, to })
        .groupBy('a.status'),
      'a',
      clinicId,
    ).getRawMany();

    // ---- Leave (by status) ----
    const leaveRows = await this.scope(
      this.leave
        .createQueryBuilder('l')
        .select('l.status', 'status')
        .addSelect('COUNT(l.id)', 'count')
        .groupBy('l.status'),
      'l',
      clinicId,
    ).getRawMany();

    // ---- Payroll (for the month) ----
    const payrollRows = await this.scope(
      this.payroll
        .createQueryBuilder('p')
        .select('p.status', 'status')
        .addSelect('COUNT(p.id)', 'count')
        .addSelect('COALESCE(SUM(p.netPay), 0)', 'total')
        .where('p.periodMonth = :month', { month })
        .groupBy('p.status'),
      'p',
      clinicId,
    ).getRawMany();

    const payrollPaid = payrollRows.find((r) => r.status === 'PAID');
    const payrollUnpaid = payrollRows.find((r) => r.status === 'UNPAID');

    return {
      range: { from, to, month },
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
        byType: byType.map((r) => ({
          type: r.type,
          count: Number(r.count),
        })),
      },
      attendance: {
        byStatus: attendanceRows.map((r) => ({
          status: r.status,
          count: Number(r.count),
        })),
        total: attendanceRows.reduce((s, r) => s + Number(r.count), 0),
      },
      leave: {
        byStatus: leaveRows.map((r) => ({
          status: r.status,
          count: Number(r.count),
        })),
        pending:
          Number(leaveRows.find((r) => r.status === 'PENDING')?.count ?? 0),
      },
      payroll: {
        month,
        paidCount: Number(payrollPaid?.count ?? 0),
        unpaidCount: Number(payrollUnpaid?.count ?? 0),
        paidAmount: Number(payrollPaid?.total ?? 0),
        unpaidAmount: Number(payrollUnpaid?.total ?? 0),
        totalAmount: payrollRows.reduce((s, r) => s + Number(r.total), 0),
      },
    };
  }
}
