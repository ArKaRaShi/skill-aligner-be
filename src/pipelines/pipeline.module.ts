import { Module } from '@nestjs/common';

import { EmbeddingModule } from 'src/modules';

import { EmbedPipeline } from './embed.pipeline';

@Module({
  imports: [EmbeddingModule],
  providers: [EmbedPipeline],
})
export class PipelineModule {}
