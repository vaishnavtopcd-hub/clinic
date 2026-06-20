import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  UpdatePaymentDto,
  ListConsultationsQuery,
} from './dto';
import { Roles, CurrentUser, AuthUser } from '../common/decorators';
import { Role } from '../common/enums';
import { AuditService } from '../audit/audit.service';
import { RequirePermissions } from '../permissions/permissions.guard';

@ApiTags('consultations')
@ApiBearerAuth()
@Roles(Role.CLINIC_ADMIN, Role.PHYSIOTHERAPIST)
@Controller('consultations')
export class ConsultationsController {
  constructor(
    private readonly consultations: ConsultationsService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermissions('consultations.view')
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListConsultationsQuery,
  ) {
    return this.consultations.findAll(user, query);
  }

  @Get('patient/:patientId/history')
  history(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.consultations.visitHistory(user, patientId);
  }

  @Get('patient/:patientId/payment-summary')
  paymentSummary(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.consultations.patientPaymentSummary(user, patientId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consultations.findOne(user, id);
  }

  @RequirePermissions('consultations.create')
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConsultationDto,
  ) {
    const result = await this.consultations.create(user, dto);
    await this.audit.log({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'CONSULTATION_CREATED',
      entity: 'Consultation',
      entityId: result.id,
    });
    return result;
  }

  @RequirePermissions('consultations.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultations.update(user, id, dto);
  }

  @RequirePermissions('payments.update')
  @Patch(':id/payment')
  async updatePayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    const result = await this.consultations.updatePayment(user, id, dto);
    await this.audit.log({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PAYMENT_UPDATED',
      entity: 'Payment',
      entityId: id,
      meta: { status: dto.status },
    });
    return result;
  }
}
