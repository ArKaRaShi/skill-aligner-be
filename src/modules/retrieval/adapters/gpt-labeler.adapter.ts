import { Injectable } from '@nestjs/common';

import { LabelerAdapterContract } from '../contracts/labeler.contract';
import { LabelerInput, LabelerOutput } from '../types/retrieval.types';

@Injectable()
export class GptLabelerAdapter implements LabelerAdapterContract {
  async labelClos(_input: LabelerInput): Promise<LabelerOutput> {
    // TODO Integrate GPT-powered labelling and rationale generation.
    return {
      rationale: null,
      labels: [],
    };
  }
}
