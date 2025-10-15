import { Occupation } from '../shared/types/occupation.type';

export interface OccupationEmbeddingOutput {
  vectors: unknown;
}

export class OccupationEmbeddingPipeline {
  async execute(occupations: Occupation[]): Promise<OccupationEmbeddingOutput> {
    return {
      vectors: occupations,
    };
  }
}
