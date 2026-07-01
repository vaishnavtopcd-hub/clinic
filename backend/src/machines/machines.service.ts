import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { Machine } from './machine.entity';
import { MachineComplaint } from '../machine-complaints/machine-complaint.entity';
import { MachineUsage } from '../consultations/entities/machine-usage.entity';
import { CreateMachineDto, UpdateMachineDto } from './dto';
import { AuthUser } from '../common/decorators';
import { ComplaintStatus, Role } from '../common/enums';
import { PaginationQuery, paginate, applyDateRange } from '../common/pagination';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machines: Repository<Machine>,
    @InjectRepository(MachineComplaint)
    private readonly complaints: Repository<MachineComplaint>,
    @InjectRepository(MachineUsage)
    private readonly usages: Repository<MachineUsage>,
  ) {}

  /**
   * List machines available to the actor:
   * - Super admin: only global master machines.
   * - Clinic users: their clinic's machines + global master machines.
   */
  async findAll(actor: AuthUser, query: PaginationQuery) {
    const qb = this.machines.createQueryBuilder('m').orderBy('m.name', 'ASC');

    // No clinic context (super admin with no clinic selected) → global master
    // machines only. Otherwise the clinic's own machines plus global ones.
    if (!actor.clinicId) {
      qb.where('m.clinicId IS NULL');
    } else {
      qb.where(
        new Brackets((w) =>
          w
            .where('m.clinicId = :cid', { cid: actor.clinicId })
            .orWhere('m.clinicId IS NULL'),
        ),
      );
    }

    if (query.search) {
      qb.andWhere('m.name ILIKE :s', { s: `%${query.search}%` });
    }
    applyDateRange(qb, 'm.createdAt', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  /**
   * Active machines for selection (no pagination).
   * When `excludeComplained` is set, machines with an unresolved complaint
   * (OPEN / UNDER_INSPECTION) in the actor's clinic are hidden — e.g. so a
   * faulty machine can't be chosen for a new consultation.
   */
  async listActive(actor: AuthUser, excludeComplained = false) {
    const machines = await this.machines.find({
      where: [
        { clinicId: actor.clinicId ?? undefined, isActive: true },
        { clinicId: IsNull(), isActive: true },
      ],
      order: { name: 'ASC' },
    });

    if (!excludeComplained || !actor.clinicId) return machines;

    const open = await this.complaints.find({
      where: {
        clinicId: actor.clinicId,
        status: In([ComplaintStatus.OPEN, ComplaintStatus.UNDER_INSPECTION]),
      },
    });
    const blocked = new Set(open.map((c) => c.machineId));
    return machines.filter((m) => !blocked.has(m.id));
  }

  async findOne(actor: AuthUser, id: string) {
    const machine = await this.machines.findOne({ where: { id } });
    if (!machine) throw new NotFoundException('Machine not found');
    this.assertCanManage(actor, machine);
    return machine;
  }

  async create(actor: AuthUser, dto: CreateMachineDto) {
    const machine = this.machines.create({
      name: dto.name,
      description: dto.description,
      isActive: true,
      // Super admin creates global machines; clinic admin creates clinic ones.
      clinicId: actor.role === Role.SUPER_ADMIN ? null : actor.clinicId,
    });
    return this.machines.save(machine);
  }

  async update(actor: AuthUser, id: string, dto: UpdateMachineDto) {
    const machine = await this.findOne(actor, id);
    Object.assign(machine, dto);
    return this.machines.save(machine);
  }

  async remove(actor: AuthUser, id: string) {
    const machine = await this.findOne(actor, id);
    await this.machines.softRemove(machine);
    return { success: true };
  }

  /**
   * Usage summary for a machine: total time, sessions, average and recent runs.
   * Scoped to the actor's clinic (a super admin with no clinic selected sees the
   * global total across clinics). Any user with machines.view may read it.
   */
  async usageSummary(
    actor: AuthUser,
    machineId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const machine = await this.machines.findOne({ where: { id: machineId } });
    if (!machine) throw new NotFoundException('Machine not found');

    const scoped = () => {
      const qb = this.usages
        .createQueryBuilder('u')
        .innerJoin('u.consultation', 'c')
        .where('u.machineId = :machineId', { machineId });
      if (actor.clinicId) qb.andWhere('c.clinicId = :cid', { cid: actor.clinicId });
      if (dateFrom) qb.andWhere('c.consultationDate >= :df', { df: dateFrom });
      if (dateTo)
        qb.andWhere('c.consultationDate <= :dt', { dt: `${dateTo} 23:59:59` });
      return qb;
    };

    const totals = await scoped()
      .select('COALESCE(SUM(u.durationMinutes), 0)', 'minutes')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('MAX(c.consultationDate)', 'lastUsedAt')
      .getRawOne<{ minutes: string; sessions: string; lastUsedAt: Date | null }>();

    const recentRows = await scoped()
      .leftJoin('c.patient', 'p')
      .select('u.id', 'id')
      .addSelect('c.id', 'consultationId')
      .addSelect('c.consultationDate', 'date')
      .addSelect('p.fullName', 'patientName')
      .addSelect('u.durationMinutes', 'durationMinutes')
      .addSelect('u.notes', 'notes')
      .orderBy('c.consultationDate', 'DESC')
      .limit(10)
      .getRawMany();

    const totalMinutes = Number(totals?.minutes ?? 0);
    const totalSessions = Number(totals?.sessions ?? 0);

    return {
      machineId,
      machineName: machine.name,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions,
      avgMinutes: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
      lastUsedAt: totals?.lastUsedAt ?? null,
      recent: recentRows.map((r) => ({
        id: r.id,
        consultationId: r.consultationId,
        date: r.date,
        patientName: r.patientName ?? null,
        durationMinutes: Number(r.durationMinutes),
        notes: r.notes ?? null,
      })),
    };
  }

  /** A clinic admin may only manage their own clinic's machines. */
  private assertCanManage(actor: AuthUser, machine: Machine) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (machine.clinicId !== null) {
        throw new ForbiddenException('Super admin manages global machines only');
      }
      return;
    }
    if (machine.clinicId !== actor.clinicId) {
      throw new ForbiddenException('Cannot manage this machine');
    }
  }
}
