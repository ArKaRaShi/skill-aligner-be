import { CloEmbeddingOutput } from '../embedding/clo-embedding.pipeline';
import { OccupationEmbeddingOutput } from '../embedding/occupation-embedding.pipeline';

export interface RetrievalResult {
  cloToSkillMatches: unknown;
}

export class CloSkillRetrievalPipeline {
  async execute(
    cloVectors: CloEmbeddingOutput,
    occupationVectors: OccupationEmbeddingOutput,
  ): Promise<RetrievalResult> {
    return {
      cloToSkillMatches: {
        cloVectors,
        occupationVectors,
      },
    };
  }
}
