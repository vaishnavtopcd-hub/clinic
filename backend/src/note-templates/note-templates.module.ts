import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalNoteTemplate } from './note-template.entity';
import { NoteTemplatesService } from './note-templates.service';
import { NoteTemplatesController } from './note-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalNoteTemplate])],
  controllers: [NoteTemplatesController],
  providers: [NoteTemplatesService],
  exports: [NoteTemplatesService],
})
export class NoteTemplatesModule {}
