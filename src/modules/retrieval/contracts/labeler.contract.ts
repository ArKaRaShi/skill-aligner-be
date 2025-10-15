import { LabelerInput, LabelerOutput } from '../types/retrieval.types';

export const LABELER_ADAPTER = Symbol('LABELER_ADAPTER');

export interface LabelerAdapterContract {
  labelClos(input: LabelerInput): Promise<LabelerOutput>;
}
