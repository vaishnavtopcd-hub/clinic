import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { Payment } from '../consultations/entities/payment.entity';
import { MachineUsage } from '../consultations/entities/machine-usage.entity';
import { PaymentStatus } from '../common/enums';
import { ReportRangeQuery } from './dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Consultation)
    private readonly consultations: Repository<Consultation>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(MachineUsage)
    private readonly usages: Repository<MachineUsage>,
  ) {}

  private range(q: ReportRangeQuery) {
    const from = q.dateFrom ? `${q.dateFrom} 00:00:00` : '1970-01-01';
    const to = q.dateTo ? `${q.dateTo} 23:59:59` : '2999-12-31';
    return { from, to };
  }

  private totalPages(count: number, limit: number) {
    return Math.max(1, Math.ceil(count / limit));
  }

  async dailyPatients(clinicId: string, q: ReportRangeQuery) {
    const { from, to } = this.range(q);
    const [data, count] = await this.patients
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.createdAt BETWEEN :from AND :to', { from, to })
      .orderBy('p.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return {
      count,
      data,
      page: q.page,
      limit: q.limit,
      totalPages: this.totalPages(count, q.limit),
    };
  }

  async dailyConsultations(clinicId: string, q: ReportRangeQuery) {
    const { from, to } = this.range(q);
    const [data, count] = await this.consultations
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.patient', 'patient')
      .leftJoinAndSelect('c.physiotherapist', 'physio')
      .leftJoinAndSelect('c.payment', 'payment')
      .where('c.clinicId = :clinicId', { clinicId })
      .andWhere('c.consultationDate BETWEEN :from AND :to', { from, to })
      .orderBy('c.consultationDate', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return {
      count,
      data,
      page: q.page,
      limit: q.limit,
      totalPages: this.totalPages(count, q.limit),
    };
  }

  async dailyCollection(clinicId: string, q: ReportRangeQuery) {
    const { from, to } = this.range(q);
    // Sum the full filtered set so the total stays accurate across pages.
    const { sum } = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.paidAt BETWEEN :from AND :to', { from, to })
      .getRawOne();
    const [data, count] = await this.payments
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.patient', 'patient')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.paidAt BETWEEN :from AND :to', { from, to })
      .orderBy('p.paidAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return {
      count,
      total: Number(sum),
      data,
      page: q.page,
      limit: q.limit,
      totalPages: this.totalPages(count, q.limit),
    };
  }

  async pendingPayments(clinicId: string, q: ReportRangeQuery) {
    // Sum outstanding dues over the full set, independent of the current page.
    const { sum } = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.consultationFee - p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PaymentStatus.DUE })
      .getRawOne();
    const [data, count] = await this.payments
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.patient', 'patient')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PaymentStatus.DUE })
      .orderBy('p.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return {
      count,
      total: Number(sum),
      data,
      page: q.page,
      limit: q.limit,
      totalPages: this.totalPages(count, q.limit),
    };
  }

  async machineUsage(clinicId: string, q: ReportRangeQuery) {
    const { from, to } = this.range(q);
    const rows = await this.usages
      .createQueryBuilder('mu')
      .innerJoin('mu.consultation', 'c')
      .select('mu.machineName', 'machineName')
      .addSelect('COUNT(mu.id)', 'uses')
      .addSelect('SUM(mu.durationMinutes)', 'totalMinutes')
      .where('c.clinicId = :clinicId', { clinicId })
      .andWhere('c.consultationDate BETWEEN :from AND :to', { from, to })
      .groupBy('mu.machineName')
      .orderBy('uses', 'DESC')
      .getRawMany();
    return {
      data: rows.map((r) => ({
        machineName: r.machineName,
        uses: Number(r.uses),
        totalMinutes: Number(r.totalMinutes),
      })),
    };
  }

  async physiotherapistActivity(clinicId: string, q: ReportRangeQuery) {
    const { from, to } = this.range(q);
    const rows = await this.consultations
      .createQueryBuilder('c')
      .innerJoin('c.physiotherapist', 'u')
      .leftJoin('c.payment', 'payment')
      .select('u.id', 'physiotherapistId')
      .addSelect('u.name', 'name')
      .addSelect('COUNT(DISTINCT c.id)', 'consultations')
      .addSelect('COUNT(DISTINCT c.patientId)', 'patients')
      .addSelect('COALESCE(SUM(payment.amountPaid), 0)', 'collected')
      .where('c.clinicId = :clinicId', { clinicId })
      .andWhere('c.consultationDate BETWEEN :from AND :to', { from, to })
      .groupBy('u.id')
      .addGroupBy('u.name')
      .orderBy('consultations', 'DESC')
      .getRawMany();
    return {
      data: rows.map((r) => ({
        physiotherapistId: r.physiotherapistId,
        name: r.name,
        consultations: Number(r.consultations),
        patients: Number(r.patients),
        collected: Number(r.collected),
      })),
    };
  }
}
