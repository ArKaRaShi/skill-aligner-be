/**
 * Repository contract for question log analyses
 * Defines the interface for data access operations
 */
import type { Identifier } from 'src/shared/contracts/types/identifier';

import { QuestionLogAnalysis } from '../../types';
import {
  CreateQuestionLogAnalysisInput,
  FindAnalysesParams,
} from './types/repository-input.types';

export const I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN = Symbol(
  'IQuestionLogAnalysisRepository',
);

/**
 * Repository interface for question log analysis operations
 * Provides CRUD operations and extraction management
 */
export interface IQuestionLogAnalysisRepository {
  /**
   * Create a new question log analysis with extracted entities
   * @param data - The analysis data including entities
   * @returns The created analysis with entities
   */
  create(data: CreateQuestionLogAnalysisInput): Promise<QuestionLogAnalysis>;

  /**
   * Find multiple analyses with optional filters
   * @param params - Optional filter parameters
   * @returns Array of analyses matching the criteria
   */
  findMany(params?: FindAnalysesParams): Promise<QuestionLogAnalysis[]>;

  /**
   * Find a single analysis by its identifier
   * @param id - The analysis identifier
   * @returns The analysis if found, null otherwise
   */
  findById(id: Identifier): Promise<QuestionLogAnalysis | null>;

  /**
   * Find all analyses for a specific question log
   * @param questionLogId - The question log identifier
   * @returns Array of analyses for the question log, ordered by extraction date descending
   */
  findByQuestionLogId(
    questionLogId: Identifier,
  ): Promise<QuestionLogAnalysis[]>;

  /**
   * Get the next extraction number for a question log and version
   * Implements auto-increment logic for extraction tracking
   * @param questionLogId - The question log identifier
   * @param extractionVersion - The extraction version (e.g., "v1")
   * @returns The next extraction number (1 if no existing extractions)
   */
  getNextExtractionNumber(
    questionLogId: Identifier,
    extractionVersion: string,
  ): Promise<number>;
}
