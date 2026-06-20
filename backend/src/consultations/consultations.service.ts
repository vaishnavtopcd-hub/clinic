import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Consultation } from './entities/consultation.entity';
import { ClinicalNote } from './entities/clinical-note.entity';
import { MachineUsage } from './entities/machine-usage.entity';
import { Payment } from './entities/payment.entity';
import { Machine } from '../machines/machine.entity';
import { Patient } from '../patients/patient.entity';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  UpdatePaymentDto,
  ListConsultationsQuery,
} from './dto';
import { PaymentStatus } from '../common/enums';
import { AuthUser } from '../common/decorators';
import { paginate } from '../common/pagination';

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Consultation)
    private readonly consultations: Repository<Consultation>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Machine)
    private readonly machines: Repository<Machine>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
  ) {}

  /** Creates a consultation with its clinical note, machine usage and payment,
   *  all in a single transaction. Never overwrites previous consultations. */
  async create(actor: AuthUser, dto: CreateConsultationDto) {
    const clinicId = actor.clinicId!;

    const patient = await this.patients.findOne({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) throw new NotFoundException('Patient not found in this clinic');

    // Resolve and snapshot machine names.
    let usageRows: MachineUsage[] = [];
    if (dto.machineUsages?.length) {
      const ids = dto.machineUsages.map((m) => m.machineId);
      const machines = await this.machines.find({ where: { id: In(ids) } });
      const byId = new Map(machines.map((m) => [m.id, m]));
      for (const u of dto.machineUsages) {
        const machine = byId.get(u.machineId);
        if (!machine) {
          throw new BadRequestException(`Unknown machine: ${u.machineId}`);
        }
        // Ensure machine belongs to this clinic or is a global machine.
        if (machine.clinicId && machine.clinicId !== clinicId) {
          throw new BadRequestException('Machine not available to this clinic');
        }
      }
    }

    return this.dataSource.transaction(async (em) => {
      const consultation = em.create(Consultation, {
        clinicId,
        patientId: dto.patientId,
        physiotherapistId: dto.physiotherapistId ?? actor.id,
        consultationDate: dto.consultationDate
          ? new Date(dto.consultationDate)
          : new Date(),
        chiefComplaint: dto.chiefComplaint,
        diagnosis: dto.diagnosis,
        treatmentPlan: dto.treatmentPlan,
        notes: dto.notes,
      });
      const saved = await em.save(consultation);

      if (dto.clinicalNote) {
        await em.save(
          em.create(ClinicalNote, {
            consultationId: saved.id,
            ...dto.clinicalNote,
          }),
        );
      }

      if (dto.machineUsages?.length) {
        const machines = await em.find(Machine, {
          where: { id: In(dto.machineUsages.map((m) => m.machineId)) },
        });
        const byId = new Map(machines.map((m) => [m.id, m]));
        usageRows = dto.machineUsages.map((u) =>
          em.create(MachineUsage, {
            consultationId: saved.id,
            machineId: u.machineId,
            machineName: byId.get(u.machineId)!.name,
            durationMinutes: u.durationMinutes,
            notes: u.notes,
          }),
        );
        await em.save(usageRows);
      }

      const isPaid = dto.payment.status === PaymentStatus.PAID;
      await em.save(
        em.create(Payment, {
          clinicId,
          consultationId: saved.id,
          patientId: dto.patientId,
          consultationFee: dto.payment.consultationFee,
          amountPaid: isPaid ? dto.payment.consultationFee : 0,
          method: dto.payment.method,
          status: dto.payment.status,
          paidAt: isPaid ? new Date() : null,
        }),
      );

      return this.findOne(actor, saved.id, em);
    });
  }

  async findAll(actor: AuthUser, query: ListConsultationsQuery) {
    const qb = this.consultations
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.patient', 'patient')
      .leftJoinAndSelect('c.physiotherapist', 'physio')
      .leftJoinAndSelect('c.payment', 'payment')
      .where('c.clinicId = :clinicId', { clinicId: actor.clinicId })
      .orderBy('c.consultationDate', 'DESC');

    if (query.patientId)
      qb.andWhere('c.patientId = :pid', { pid: query.patientId });
    if (query.physiotherapistId)
      qb.andWhere('c.physiotherapistId = :phid', {
        phid: query.physiotherapistId,
      });
    if (query.paymentStatus)
      qb.andWhere('payment.status = :ps', { ps: query.paymentStatus });
    if (query.dateFrom)
      qb.andWhere('c.consultationDate >= :df', { df: query.dateFrom });
    if (query.dateTo)
      qb.andWhere('c.consultationDate <= :dt', { dt: `${query.dateTo} 23:59:59` });
    if (query.search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('patient.fullName ILIKE :s', { s: `%${query.search}%` })
            .orWhere('patient.phone ILIKE :s', { s: `%${query.search}%` })
            .orWhere('c.diagnosis ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthUser, id: string, em?: any) {
    const repo = em ? em.getRepository(Consultation) : this.consultations;
    const consultation = await repo.findOne({
      where: { id, clinicId: actor.clinicId },
      relations: [
        'patient',
        'physiotherapist',
        'clinicalNote',
        'machineUsages',
        'payment',
      ],
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    return consultation;
  }

  /** Edit clinical fields only — payment history is updated separately. */
  async update(actor: AuthUser, id: string, dto: UpdateConsultationDto) {
    const consultation = await this.findOne(actor, id);
    const { clinicalNote, ...fields } = dto;
    Object.assign(consultation, fields);
    await this.consultations.save(consultation);

    if (clinicalNote) {
      const noteRepo = this.dataSource.getRepository(ClinicalNote);
      const existing = await noteRepo.findOne({
        where: { consultationId: id },
      });
      if (existing) {
        Object.assign(existing, clinicalNote);
        await noteRepo.save(existing);
      } else {
        await noteRepo.save(
          noteRepo.create({ consultationId: id, ...clinicalNote }),
        );
      }
    }
    return this.findOne(actor, id);
  }

  /** Update payment info; flipping DUE -> PAID stamps paidAt and amountPaid. */
  async updatePayment(actor: AuthUser, id: string, dto: UpdatePaymentDto) {
    const consultation = await this.findOne(actor, id);
    const payment = await this.payments.findOne({
      where: { consultationId: id },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (dto.consultationFee !== undefined)
      payment.consultationFee = dto.consultationFee;
    if (dto.method !== undefined) payment.method = dto.method;

    if (dto.status !== undefined && dto.status !== payment.status) {
      payment.status = dto.status;
      if (dto.status === PaymentStatus.PAID) {
        payment.amountPaid = payment.consultationFee;
        payment.paidAt = new Date();
      } else {
        payment.amountPaid = 0;
        payment.paidAt = null;
      }
    } else if (payment.status === PaymentStatus.PAID) {
      // Keep amountPaid in sync if fee changed while already paid.
      payment.amountPaid = payment.consultationFee;
    }

    await this.payments.save(payment);
    return this.findOne(actor, id);
  }

  /** Full visit history for a patient, latest first. */
  async visitHistory(actor: AuthUser, patientId: string) {
    return this.consultations.find({
      where: { clinicId: actor.clinicId!, patientId },
      relations: [
        'physiotherapist',
        'clinicalNote',
        'machineUsages',
        'payment',
      ],
      order: { consultationDate: 'DESC' },
    });
  }

  /** Per-patient payment summary. */
  async patientPaymentSummary(actor: AuthUser, patientId: string) {
    const rows = await this.payments.find({
      where: { clinicId: actor.clinicId!, patientId },
      order: { createdAt: 'DESC' },
    });
    const totalFees = rows.reduce((s, p) => s + Number(p.consultationFee), 0);
    const totalPaid = rows.reduce((s, p) => s + Number(p.amountPaid), 0);
    const lastPaid = rows
      .filter((p) => p.paidAt)
      .sort((a, b) => +new Date(b.paidAt!) - +new Date(a.paidAt!))[0];
    return {
      totalFees,
      totalPaid,
      totalDue: totalFees - totalPaid,
      lastPaymentDate: lastPaid?.paidAt ?? null,
    };
  }
}
