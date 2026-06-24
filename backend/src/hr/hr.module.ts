import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Employee } from './entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Payroll } from './entities/payroll.entity';
import { User } from '../users/user.entity';
import { Consultation } from '../consultations/entities/consultation.entity';

import { HrUsersService } from './users.service';
import { HrUsersController } from './users.controller';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { HrReportsService } from './hr-reports.service';
import { HrReportsController } from './hr-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Attendance,
      LeaveRequest,
      Payroll,
      User,
      Consultation,
    ]),
  ],
  controllers: [
    HrUsersController,
    EmployeesController,
    AttendanceController,
    LeaveController,
    PayrollController,
    HrReportsController,
  ],
  providers: [
    HrUsersService,
    EmployeesService,
    AttendanceService,
    LeaveService,
    PayrollService,
    HrReportsService,
  ],
})
export class HrModule {}
