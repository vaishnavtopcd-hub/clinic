import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { MachineComplaint } from './machine-complaint.entity';
import { Machine } from '../machines/machine.entity';
import {
  CreateMachineComplaintDto,
  ListMachineComplaintsQuery,
  UpdateMachineComplaintDto,
} from './dto';
import { AuthUser } from '../common/decorators';
import { ComplaintStatus, Role } from '../common/enums';
import { paginate, applyDateRange } from '../common/pagination';

@Injectable()
export class MachineComplaintsService {
  constructor(
    @InjectRepository(MachineComplaint)
    private readonly repo: Repository<MachineComplaint>,
    @InjectRepository(Machine)
    private readonly machines: Repository<Machine>,
  ) {}

  private isSuper(actor: AuthUser) {
    return actor.role === Role.SUPER_ADMIN;
  }

  /** Clinic a complaint belongs to: the actor's own, or (super admin) the requested one. */
  private resolveClinic(actor: AuthUser, requested?: string): string {
    if (!this.isSuper(actor)) {
      if (!actor.clinicId) throw new BadRequestException('No clinic context');
      return actor.clinicId;
    }
    if (!requested) {
      throw new BadRequestException('clinicId is required for super admin');
    }
    return requested;
  }

  private baseQuery() {
    return this.repo
      .createQueryBuilder('mc')
      .leftJoinAndSelect('mc.machine', 'machine')
      .leftJoinAndSelect('mc.reportedBy', 'reportedBy')
      .leftJoinAndSelect('mc.inspectedBy', 'inspectedBy');
  }

  async create(actor: AuthUser, dto: CreateMachineComplaintDto) {
    const clinicId = this.resolveClinic(actor, dto.clinicId);

    // The machine must be the clinic's own or a global (shared) machine.
    const machine = await this.machines.findOne({
      where: { id: dto.machineId },
    });
    if (!machine) throw new NotFoundException('Machine not found');
    if (machine.clinicId !== null && machine.clinicId !== clinicId) {
      throw new ForbiddenException('Machine does not belong to this clinic');
    }

    const complaint = this.repo.create({
      clinicId,
      machineId: machine.id,
      machineName: machine.name,
      title: dto.title,
      description: dto.description,
      severity: dto.severity, // undefined -> column default (MEDIUM)
      status: ComplaintStatus.OPEN,
      reportedById: actor.id,
    });
    const saved = await this.repo.save(complaint);
    return this.findOne(actor, saved.id);
  }

  async findAll(actor: AuthUser, query: ListMachineComplaintsQuery) {
    const qb = this.baseQuery().orderBy('mc.createdAt', 'DESC');

    const cid = actor.clinicId ?? query.clinicId;
    if (cid) {
      qb.andWhere('mc.clinicId = :cid', { cid });
    }

    if (query.status) qb.andWhere('mc.status = :st', { st: query.status });
    if (query.severity) qb.andWhere('mc.severity = :sv', { sv: query.severity });
    if (query.machineId)
      qb.andWhere('mc.machineId = :mid', { mid: query.machineId });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('mc.title ILIKE :s', { s: `%${query.search}%` })
            .orWhere('mc.description ILIKE :s', { s: `%${query.search}%` })
            .orWhere('mc.machineName ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }
    applyDateRange(qb, 'mc.createdAt', query.dateFrom, query.dateTo);

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthUser, id: string) {
    const qb = this.baseQuery().where('mc.id = :id', { id });
    if (actor.clinicId) {
      qb.andWhere('mc.clinicId = :cid', { cid: actor.clinicId });
    }
    const complaint = await qb.getOne();
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async update(actor: AuthUser, id: string, dto: UpdateMachineComplaintDto) {
    const c = await this.findOne(actor, id);

    if (dto.title !== undefined) c.title = dto.title;
    if (dto.description !== undefined) c.description = dto.description;
    if (dto.severity !== undefined) c.severity = dto.severity;
    if (dto.inspectionNotes !== undefined) c.inspectionNotes = dto.inspectionNotes;
    if (dto.resolution !== undefined) c.resolution = dto.resolution;

    // Status transitions stamp the inspection/resolution trail.
    if (dto.status !== undefined && dto.status !== c.status) {
      c.status = dto.status;
      if (dto.status === ComplaintStatus.UNDER_INSPECTION) {
        c.inspectedById = actor.id;
        c.inspectedAt = new Date();
      } else if (dto.status === ComplaintStatus.RESOLVED) {
        if (!c.inspectedById) {
          c.inspectedById = actor.id;
          c.inspectedAt = new Date();
        }
        c.resolvedAt = new Date();
      }
    }

    await this.repo.save(c);
    return this.findOne(actor, id);
  }

  async remove(actor: AuthUser, id: string) {
    const c = await this.findOne(actor, id);
    await this.repo.softRemove(c);
    return { success: true };
  }
}
