import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../shared/adapters/embedding/embedding.module';
import { EmbedPipeline } from './embed.pipeline';
import { EmbedPipelineV2 } from './embed.pipeline.v2';
import { EmbedPipelineV3 } from './embed.pipeline.v3';
import { InspectEmbeddingsPipeline } from './inspect-embeddings.pipeline';
import { SeedCampusAndFacultyPipeline } from './seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './seed-course-and-lo.pipeline';
import { SeedCourseAndLoPipelineV2 } from './seed-course-and-lo.pipeline.v2';
import { UpdateGenEdCodesPipeline } from './update-gened-codes.pipeline';

@Module({
  imports: [EmbeddingModule],
  providers: [
    EmbedPipeline,
    EmbedPipelineV2,
    EmbedPipelineV3,
    InspectEmbeddingsPipeline,
    SeedCampusAndFacultyPipeline,
    SeedCourseAndLoPipeline,
    SeedCourseAndLoPipelineV2,
    UpdateGenEdCodesPipeline,
  ],
  exports: [PipelineModule],
})
export class PipelineModule {}
