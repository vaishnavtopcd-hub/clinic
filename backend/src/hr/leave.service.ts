import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from './entities/leave-request.entity';
import { Employee } from './entities/employee.entity';
import { CreateLeaveDto, ListLeaveQuery, ReviewLeaveDto } from './dto';
import { AuthUser } from '../common/decorators';
import { LeaveStatus } from '../common/enums';
import { paginate, applyDateRange } from '../common/pagination';
import { listClinicId, ownClinicWhere } from './clinic-scope';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leave: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
  ) {}

  async findAll(actor: AuthUser, query: ListLeaveQuery) {
    const qb = this.leave
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.employee', 'employee')
      .orderBy('l.createdAt', 'DESC');

    const clinicId = listClinicId(actor, query.clinicId);
    if (clinicId) qb.andWhere('l.clinicId = :clinicId', { clinicId });
    if (query.employeeId)
      qb.andWhere('l.employeeId = :eid', { eid: query.employeeId });
    if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    // Filter by the leave's start date falling within the range.
    applyDateRange(qb, 'l.startDate', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthUser, id: string) {
    const req = await this.leave.findOne({
      where: { id, ...ownClinicWhere(actor) },
      relations: ['employee'],
    });
    if (!req) throw new NotFoundException('Leave request not found');
    return req;
  }

  /** Submit a leave request (starts in PENDING). */
  async create(actor: AuthUser, dto: CreateLeaveDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
    const employee = await this.employees.findOne({
      where: { id: dto.employeeId, ...ownClinicWhere(actor) },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const req = this.leave.create({
      clinicId: employee.clinicId,
      employeeId: dto.employeeId,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      status: LeaveStatus.PENDING,
    });
    return this.leave.save(req);
  }

  /** Approve or reject a pending leave request. */
  async review(actor: AuthUser, id: string, dto: ReviewLeaveDto) {
    if (
      dto.status !== LeaveStatus.APPROVED &&
      dto.status !== LeaveStatus.REJECTED
    ) {
      throw new BadRequestException('Review status must be APPROVED or REJECTED');
    }
    const req = await this.findOne(actor, id);
    if (req.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been ${req.status.toLowerCase()}`,
      );
    }
    req.status = dto.status;
    req.reviewedById = actor.id;
    req.reviewedAt = new Date();
    req.reviewNote = dto.reviewNote;
    return this.leave.save(req);
  }

  async remove(actor: AuthUser, id: string) {
    const req = await this.findOne(actor, id);
    await this.leave.softRemove(req);
    return { success: true };
  }
}
