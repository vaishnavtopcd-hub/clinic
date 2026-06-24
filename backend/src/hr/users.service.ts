import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { Employee } from './entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { CreateUserDto, ListHrUsersQuery, UpdateUserDto } from './users.dto';
import { AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { applyDateRange } from '../common/pagination';

@Injectable()
export class HrUsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Consultation)
    private readonly consultations: Repository<Consultation>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Attendance)
    private readonly attendance: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leave: Repository<LeaveRequest>,
  ) {}

  private isSuper(actor: AuthUser) {
    return actor.role === Role.SUPER_ADMIN;
  }

  /**
   * Who may be granted which role:
   * - Super Admin may assign any role.
   * - A Clinic Admin may only create HR or Physiotherapist staff. They can
   *   never mint another Clinic Admin or a Super Admin (privilege escalation).
   */
  private assertCanAssignRole(actor: AuthUser, role: Role) {
    if (this.isSuper(actor)) return;
    if (role !== Role.HR && role !== Role.PHYSIOTHERAPIST) {
      throw new ForbiddenException(
        'You may only create HR or Physiotherapist staff',
      );
    }
  }

  /**
   * Who may modify an existing account:
   * - Only a Super Admin may touch Super Admin or Clinic Admin accounts.
   * - A Clinic Admin may manage HR / Physiotherapist staff in their clinic
   *   (clinic scoping is enforced separately by findOne).
   */
  private assertCanTouch(actor: AuthUser, target: User) {
    if (this.isSuper(actor)) return;
    if (
      target.role === Role.SUPER_ADMIN ||
      target.role === Role.CLINIC_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a Super Admin can manage admin accounts',
      );
    }
  }

  async findAll(actor: AuthUser, query: ListHrUsersQuery) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.clinic', 'clinic');

    // Scope to the actor's clinic (a super admin scopes to their selected
    // clinic, or the requested one, else spans all clinics).
    const cid = actor.clinicId ?? query.clinicId;
    if (cid) {
      qb.andWhere('u.clinicId = :cid', { cid });
    }

    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status)
      qb.andWhere('u.isActive = :active', {
        active: query.status === 'ACTIVE',
      });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.name ILIKE :s', { s: `%${query.search}%` })
            .orWhere('u.email ILIKE :s', { s: `%${query.search}%` })
            .orWhere('u.username ILIKE :s', { s: `%${query.search}%` })
            .orWhere('u.phone ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }

    applyDateRange(qb, 'u.createdAt', query.dateFrom, query.dateTo);

    const sortCol =
      { name: 'u.name', email: 'u.email', role: 'u.role', createdAt: 'u.createdAt' }[
        query.sortBy ?? 'createdAt'
      ] ?? 'u.createdAt';
    const order = (query.order ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortCol, order);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async findOne(actor: AuthUser, id: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.clinic', 'clinic')
      .where('u.id = :id', { id });
    if (actor.clinicId) {
      qb.andWhere('u.clinicId = :cid', { cid: actor.clinicId });
    }
    const user = await qb.getOne();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    this.assertCanAssignRole(actor, dto.role);

    let clinicId: string | null;
    if (dto.role === Role.SUPER_ADMIN) {
      clinicId = null;
    } else if (this.isSuper(actor)) {
      if (!dto.clinicId)
        throw new BadRequestException('clinicId is required for this role');
      clinicId = dto.clinicId;
    } else {
      clinicId = actor.clinicId;
      if (!clinicId) throw new BadRequestException('No clinic context');
    }

    await this.assertEmailFree(dto.email);
    if (dto.username) await this.assertUsernameFree(dto.username);

    const user = this.users.create({
      clinicId,
      name: dto.name,
      email: dto.email.toLowerCase(),
      username: dto.username,
      phone: dto.phone,
      department: dto.department,
      specialization: dto.specialization,
      photoUrl: dto.photoUrl,
      role: dto.role,
      isActive: dto.isActive ?? true,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.users.save(user);
    return this.findOne(actor, saved.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.findOne(actor, id);
    this.assertCanTouch(actor, user);

    // Role change.
    if (dto.role && dto.role !== user.role) {
      this.assertCanAssignRole(actor, dto.role);
      user.role = dto.role;
      if (dto.role === Role.SUPER_ADMIN) {
        user.clinicId = null;
      } else if (this.isSuper(actor)) {
        const target = dto.clinicId ?? user.clinicId;
        if (!target)
          throw new BadRequestException('clinicId is required for this role');
        user.clinicId = target;
      }
    }

    // Clinic move (super admin only).
    if (dto.clinicId !== undefined && this.isSuper(actor) && user.role !== Role.SUPER_ADMIN) {
      user.clinicId = dto.clinicId;
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      await this.assertEmailFree(dto.email, user.id);
      user.email = dto.email.toLowerCase();
    }
    if (dto.username !== undefined && dto.username !== user.username) {
      if (dto.username) await this.assertUsernameFree(dto.username, user.id);
      user.username = dto.username;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.department !== undefined) user.department = dto.department;
    if (dto.specialization !== undefined)
      user.specialization = dto.specialization;
    if (dto.photoUrl !== undefined) user.photoUrl = dto.photoUrl;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);

    await this.users.save(user);
    return this.findOne(actor, user.id);
  }

  async remove(actor: AuthUser, id: string) {
    const user = await this.findOne(actor, id);
    if (user.id === actor.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    this.assertCanTouch(actor, user);
    await this.users.softRemove(user);
    return { success: true };
  }

  /** Performance & activity metrics for a staff member. */
  async performance(actor: AuthUser, id: string) {
    const user = await this.findOne(actor, id); // enforces visibility/RBAC
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = `${today} 00:00:00`;
    const dayEnd = `${today} 23:59:59`;

    // ---- Consultation activity (work done as physiotherapist) ----
    const byPhysio = () =>
      this.consultations
        .createQueryBuilder('c')
        .where('c.physiotherapistId = :uid', { uid: user.id });

    const totalConsultations = await byPhysio().getCount();
    const todaysConsultations = await byPhysio()
      .andWhere('c.consultationDate BETWEEN :f AND :t', {
        f: dayStart,
        t: dayEnd,
      })
      .getCount();
    const totalPatients = Number(
      (
        await byPhysio()
          .select('COUNT(DISTINCT c.patientId)', 'n')
          .getRawOne()
      ).n,
    );
    const todaysPatients = Number(
      (
        await byPhysio()
          .andWhere('c.consultationDate BETWEEN :f AND :t', {
            f: dayStart,
            t: dayEnd,
          })
          .select('COUNT(DISTINCT c.patientId)', 'n')
          .getRawOne()
      ).n,
    );
    const lastRow = await byPhysio()
      .select('MAX(c.consultationDate)', 'd')
      .getRawOne();

    // ---- Attendance & leave (require an employment record) ----
    const employee = await this.employees.findOne({
      where: { userId: user.id },
    });

    const attendance = {
      present: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      workingDays: 0,
      history: [] as Attendance[],
    };
    const leave = {
      total: 0,
      approved: 0,
      pending: 0,
      records: [] as LeaveRequest[],
    };

    if (employee) {
      const aRows = await this.attendance
        .createQueryBuilder('a')
        .select('a.status', 'status')
        .addSelect('COUNT(*)', 'n')
        .where('a.employeeId = :eid', { eid: employee.id })
        .groupBy('a.status')
        .getRawMany();
      const a = Object.fromEntries(aRows.map((r) => [r.status, Number(r.n)]));
      attendance.present = a.PRESENT ?? 0;
      attendance.halfDay = a.HALF_DAY ?? 0;
      attendance.absent = a.ABSENT ?? 0;
      attendance.onLeave = a.ON_LEAVE ?? 0;
      attendance.workingDays = attendance.present + attendance.halfDay;
      attendance.history = await this.attendance.find({
        where: { employeeId: employee.id },
        order: { date: 'DESC' },
        take: 10,
      });

      const lRows = await this.leave
        .createQueryBuilder('l')
        .select('l.status', 'status')
        .addSelect('COUNT(*)', 'n')
        .where('l.employeeId = :eid', { eid: employee.id })
        .groupBy('l.status')
        .getRawMany();
      const l = Object.fromEntries(lRows.map((r) => [r.status, Number(r.n)]));
      leave.approved = l.APPROVED ?? 0;
      leave.pending = l.PENDING ?? 0;
      leave.total = (l.PENDING ?? 0) + (l.APPROVED ?? 0) + (l.REJECTED ?? 0);
      leave.records = await this.leave.find({
        where: { employeeId: employee.id },
        relations: ['employee'],
        order: { createdAt: 'DESC' },
        take: 10,
      });
    }

    return {
      hasEmployment: !!employee,
      consultations: {
        total: totalConsultations,
        today: todaysConsultations,
        totalPatients,
        todaysPatients,
        lastDate: lastRow?.d ?? null,
      },
      attendance,
      leave,
    };
  }

  private async assertEmailFree(email: string, exceptId?: string) {
    const existing = await this.users.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Email is already in use');
    }
  }

  private async assertUsernameFree(username: string, exceptId?: string) {
    const existing = await this.users.findOne({ where: { username } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Username is already in use');
    }
  }
}
