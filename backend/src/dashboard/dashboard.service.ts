import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { User } from '../users/user.entity';
import { Consultation } from '../consultations/entities/consultation.entity';
import { Payment } from '../consultations/entities/payment.entity';
import { Role, PaymentStatus } from '../common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Consultation)
    private readonly consultations: Repository<Consultation>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
  ) {}

  async summary(clinicId: string, dateFrom?: string, dateTo?: string) {
    // Period metrics (patients, consultations, revenue) honour the selected
    // range; cumulative metrics (totals, active staff, outstanding due) do not.
    const { start, end } = this.range(dateFrom, dateTo);

    const [
      totalPatients,
      todaysPatients,
      todaysConsultations,
      activePhysios,
      recentPatients,
      recentConsultations,
    ] = await Promise.all([
      this.patients.count({ where: { clinicId } }),
      this.patients
        .createQueryBuilder('p')
        .where('p.clinicId = :clinicId', { clinicId })
        .andWhere('p.createdAt BETWEEN :start AND :end', { start, end })
        .getCount(),
      this.consultations
        .createQueryBuilder('c')
        .where('c.clinicId = :clinicId', { clinicId })
        .andWhere('c.consultationDate BETWEEN :start AND :end', { start, end })
        .getCount(),
      this.users.count({
        where: { clinicId, role: Role.PHYSIOTHERAPIST, isActive: true },
      }),
      this.patients.find({
        where: { clinicId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.consultations.find({
        where: { clinicId },
        relations: ['patient', 'physiotherapist', 'payment'],
        order: { consultationDate: 'DESC' },
        take: 5,
      }),
    ]);

    // Today's revenue = payments marked paid today.
    const revenueRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.paidAt BETWEEN :start AND :end', { start, end })
      .getRawOne();

    const dueRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.consultationFee - p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PaymentStatus.DUE })
      .getRawOne();

    return {
      totalPatients,
      todaysPatients,
      todaysConsultations,
      activePhysiotherapists: activePhysios,
      todaysRevenue: Number(revenueRow?.sum ?? 0),
      outstandingDue: Number(dueRow?.sum ?? 0),
      recentPatients,
      recentConsultations,
    };
  }

  /** Clinic payment dashboard figures. */
  async paymentDashboard(clinicId: string) {
    const { start, end } = this.todayRange();

    const todaysCollection = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.paidAt BETWEEN :start AND :end', { start, end })
      .getRawOne();

    const totalRevenue = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .getRawOne();

    const totalDue = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.consultationFee - p.amountPaid), 0)', 'sum')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.status = :status', { status: PaymentStatus.DUE })
      .getRawOne();

    const pendingCount = await this.payments.count({
      where: { clinicId, status: PaymentStatus.DUE },
    });

    return {
      todaysCollection: Number(todaysCollection?.sum ?? 0),
      totalRevenue: Number(totalRevenue?.sum ?? 0),
      totalDue: Number(totalDue?.sum ?? 0),
      pendingPayments: pendingCount,
    };
  }

  /**
   * Monthly revenue + patient/consultation counts for the last `months`
   * months (oldest → newest), with empty months filled in. Used by the
   * admin dashboard trend chart.
   */
  async trends(clinicId: string, months = 6) {
    const buckets = this.monthBuckets(months);
    const start = buckets[0].start;
    const end = buckets[buckets.length - 1].end;

    const [revenueRows, patientRows, consultationRows] = await Promise.all([
      this.payments
        .createQueryBuilder('p')
        .select("to_char(date_trunc('month', p.paidAt), 'YYYY-MM')", 'month')
        .addSelect('COALESCE(SUM(p.amountPaid), 0)', 'value')
        .where('p.clinicId = :clinicId', { clinicId })
        .andWhere('p.paidAt BETWEEN :start AND :end', { start, end })
        .groupBy("date_trunc('month', p.paidAt)")
        .getRawMany(),
      this.patients
        .createQueryBuilder('p')
        .select("to_char(date_trunc('month', p.createdAt), 'YYYY-MM')", 'month')
        .addSelect('COUNT(*)', 'value')
        .where('p.clinicId = :clinicId', { clinicId })
        .andWhere('p.createdAt BETWEEN :start AND :end', { start, end })
        .groupBy("date_trunc('month', p.createdAt)")
        .getRawMany(),
      this.consultations
        .createQueryBuilder('c')
        .select(
          "to_char(date_trunc('month', c.consultationDate), 'YYYY-MM')",
          'month',
        )
        .addSelect('COUNT(*)', 'value')
        .where('c.clinicId = :clinicId', { clinicId })
        .andWhere('c.consultationDate BETWEEN :start AND :end', { start, end })
        .groupBy("date_trunc('month', c.consultationDate)")
        .getRawMany(),
    ]);

    const toMap = (rows: { month: string; value: string }[]) =>
      new Map(rows.map((r) => [r.month, Number(r.value)]));
    const revenue = toMap(revenueRows);
    const patients = toMap(patientRows);
    const consultations = toMap(consultationRows);

    return buckets.map((b) => ({
      month: b.key,
      label: b.label,
      revenue: revenue.get(b.key) ?? 0,
      patients: patients.get(b.key) ?? 0,
      consultations: consultations.get(b.key) ?? 0,
    }));
  }

  /** Calendar-month buckets for the last `count` months, oldest first. */
  private monthBuckets(count: number) {
    const now = new Date();
    const buckets: {
      key: string;
      label: string;
      start: Date;
      end: Date;
    }[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      buckets.push({ key, label, start, end });
    }
    return buckets;
  }

  private todayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  /**
   * Resolve optional YYYY-MM-DD bounds to a start/end range (local time).
   * Falls back to today when neither bound is given, so callers that omit the
   * range keep the original behaviour.
   */
  private range(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return this.todayRange();
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(0);
    const end = dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date();
    return { start, end };
  }
}
