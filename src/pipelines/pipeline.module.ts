import { Module } from '@nestjs/common';

import { EmbeddingModule } from 'src/modules';

import { EmbedPipeline } from './embed.pipeline';
import { SeedCampusAndFacultyPipeline } from './seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './seed-course-and-lo.pipeline';
import { UpdateGenEdCodesPipeline } from './update-gened-codes.pipeline';

@Module({
  imports: [EmbeddingModule],
  providers: [
    EmbedPipeline,
    SeedCampusAndFacultyPipeline,
    SeedCourseAndLoPipeline,
    UpdateGenEdCodesPipeline,
  ],
})
export class PipelineModule {}
