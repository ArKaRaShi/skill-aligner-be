import { Inject, Injectable } from '@nestjs/common';

import { SemanticsApiClient } from 'src/common/adapters/secondary';

import {
  LABELER_ADAPTER,
  LabelerAdapterContract,
} from '../contracts/labeler.contract';
import {
  VECTOR_ADAPTER,
  VectorAdapterContract,
} from '../contracts/vector.contract';
import {
  LabelerInput,
  LabelerOutput,
  RetrievalRequest,
  RetrievalResponse,
  VectorSearchParams,
} from '../types/retrieval.types';

@Injectable()
export class RetrievalCourseService {
  constructor(
    @Inject(VECTOR_ADAPTER)
    private readonly vectorAdapter: VectorAdapterContract,
    @Inject(LABELER_ADAPTER)
    private readonly labelerAdapter: LabelerAdapterContract,
  ) {}

  async retrieveBySkill(request: RetrievalRequest): Promise<RetrievalResponse> {
    const perCourseMaxRank = request.perCourseMaxRank ?? 3;
    const limit = request.limit ?? 50;
    const normalizedSkillDescription = request.skillDescription
      .trim()
      .toLowerCase();
    const queryText = `Find course learning outcomes related to the skill "${request.skillName}", which involves ${normalizedSkillDescription}`;

    const embeddingResponse = await SemanticsApiClient.embed({
      text: queryText,
      role: 'query',
    });

    if (!embeddingResponse.embeddings?.length) {
      throw new Error('Embedding API returned empty result.');
    }

    const vectorParams: VectorSearchParams = {
      embedding: embeddingResponse.embeddings,
      perCourseMaxRank,
      limit,
    };
    const clos = await this.vectorAdapter.findSimilarClos(vectorParams);

    const labelerInput: LabelerInput = {
      queryText,
      skillName: request.skillName,
      skillDescription: request.skillDescription,
      clos,
    };
    let labelerOutput: LabelerOutput | null = null;
    try {
      labelerOutput = await this.labelerAdapter.labelClos(labelerInput);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown labeler failure';
      throw new Error(`Labeler adapter failed: ${reason}`, { cause: error });
    }

    return {
      metadata: {
        queryText,
        perCourseMaxRank,
        limit,
        embeddingModel: embeddingResponse.model,
        embeddingDimension: embeddingResponse.dimension,
        embeddedAt: embeddingResponse.embedded_at,
      },
      clos,
      labelerOutput,
    };
  }
}
