/**
 * Question Extraction Service Contract
 *
 * Defines the interface for entity extraction operations from user questions.
 * This contract is specifically tied to QuestionExtractionService implementation.
 */
import type { Identifier } from 'src/shared/contracts/types/identifier';

import type {
  ExtractionHistoryEntry,
  ExtractionResult,
} from '../../types/extraction.types';
import type { ExtractFromQuestionInput } from './types/service-input.types';

/**
 * Service contract token for dependency injection
 */
export const I_QUESTION_EXTRACTION_SERVICE_TOKEN = Symbol(
  'IQuestionExtractionService',
);

/**
 * Question Extraction Service Interface
 *
 * Defines operations for extracting entities from user questions using LLM.
 */
export interface IQuestionExtractionService {
  /**
   * Extract entities from a question log
   * @param input - Extraction parameters including question log ID and version
   * @returns Extraction result with analysis and extracted entities
   */
  extractFromQuestion(
    input: ExtractFromQuestionInput,
  ): Promise<ExtractionResult>;

  /**
   * Get extraction history for a question log
   * @param questionLogId - The question log identifier
   * @returns Array of extraction history entries
   */
  getExtractionHistory(
    questionLogId: Identifier,
  ): Promise<ExtractionHistoryEntry[]>;
}
