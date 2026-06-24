import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { Machine } from './machine.entity';
import { MachineComplaint } from '../machine-complaints/machine-complaint.entity';
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
