import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineComplaint } from './machine-complaint.entity';
import { Machine } from '../machines/machine.entity';
import { MachineComplaintsService } from './machine-complaints.service';
import { MachineComplaintsController } from './machine-complaints.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MachineComplaint, Machine])],
  controllers: [MachineComplaintsController],
  providers: [MachineComplaintsService],
})
export class MachineComplaintsModule {}
