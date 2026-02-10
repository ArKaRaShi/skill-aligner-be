/**
 * Repository contract for question logs
 * Defines the interface for data access operations
 */
import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { QuestionLog } from '../../types';
import type {
  CreateQuestionLogInput,
  FindQuestionLogsParams,
  UpdateQuestionLogInput,
} from './types/repository-input.types';

export const I_QUESTION_LOG_REPOSITORY_TOKEN = Symbol('IQuestionLogRepository');

/**
 * Repository interface for question log operations
 * Provides CRUD operations for QuestionLog entities
 */
export interface IQuestionLogRepository {
  /**
   * Find a question log by ID
   * @param id - The question log identifier
   * @returns The question log if found, null otherwise
   */
  findById(id: Identifier): Promise<QuestionLog | null>;

  /**
   * Find multiple question logs with optional filters
   * @param params - Optional filter parameters
   * @returns Array of question logs matching the criteria
   */
  findMany(params?: FindQuestionLogsParams): Promise<QuestionLog[]>;

  /**
   * Create a new question log
   * @param data - The question log data
   * @returns The created question log
   */
  create(data: CreateQuestionLogInput): Promise<QuestionLog>;

  /**
   * Update an existing question log
   * @param id - The question log identifier
   * @param data - The data to update
   * @returns The updated question log
   */
  update(id: Identifier, data: UpdateQuestionLogInput): Promise<QuestionLog>;

  /**
   * Delete a question log by ID
   * @param id - The question log identifier
   * @returns The deleted question log
   */
  delete(id: Identifier): Promise<QuestionLog>;

  /**
   * Find question logs by related process log ID
   * @param processLogId - The process log identifier
   * @returns Array of question logs associated with the process log
   */
  findByProcessLogId(processLogId: Identifier): Promise<QuestionLog[]>;
}
