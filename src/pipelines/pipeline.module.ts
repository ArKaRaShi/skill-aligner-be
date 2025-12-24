import { Module } from '@nestjs/common';

import { EmbeddingModule } from 'src/core';

import { EmbedPipeline } from './embed.pipeline';
import { EmbedPipelineV2 } from './embed.pipeline.v2';
import { InspectEmbeddingsPipeline } from './inspect-embeddings.pipeline';
import { SeedCampusAndFacultyPipeline } from './seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './seed-course-and-lo.pipeline';
import { UpdateGenEdCodesPipeline } from './update-gened-codes.pipeline';

@Module({
  imports: [EmbeddingModule],
  providers: [
    EmbedPipeline,
    EmbedPipelineV2,
    InspectEmbeddingsPipeline,
    SeedCampusAndFacultyPipeline,
    SeedCourseAndLoPipeline,
    UpdateGenEdCodesPipeline,
  ],
})
export class PipelineModule {}
