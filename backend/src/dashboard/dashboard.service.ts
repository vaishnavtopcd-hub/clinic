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

  async summary(clinicId: string) {
    const { start, end } = this.todayRange();

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
}
