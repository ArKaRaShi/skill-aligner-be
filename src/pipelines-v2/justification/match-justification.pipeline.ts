import { RetrievalResult } from '../retrieval/clo-skill-retrieval.pipeline';

export interface JustificationOutput {
  explanations: unknown;
}

export class MatchJustificationPipeline {
  async execute(
    retrievalResult: RetrievalResult,
  ): Promise<JustificationOutput> {
    return {
      explanations: retrievalResult.cloToSkillMatches,
    };
  }
}
