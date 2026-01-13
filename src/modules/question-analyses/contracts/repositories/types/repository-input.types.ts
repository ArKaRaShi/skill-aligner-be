/**
 * Repository input types
 * Type definitions for repository method parameters
 */
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

import type {
  ConfidenceLevel,
  EntityType,
  ExtractionQuality,
  ExtractionSource,
} from '../../../types/core.enums';

// ============================================================================
// QuestionLog Repository Input Types
// ============================================================================

/**
 * Input data for creating a question log
 */
export interface CreateQuestionLogInput {
  questionText: string;
  role?: string;
  metadata?: Record<string, unknown>;
  relatedProcessLogId?: string;
}

/**
 * Input data for updating a question log
 */
export type UpdateQuestionLogInput = Partial<
  Pick<
    CreateQuestionLogInput,
    'questionText' | 'role' | 'metadata' | 'relatedProcessLogId'
  >
>;

/**
 * Filter parameters for finding question logs
 */
export interface FindQuestionLogsParams {
  relatedProcessLogId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// QuestionLogAnalysis Repository Input Types
// ============================================================================

/**
 * Input data for creating an extracted entity
 */
export interface CreateExtractedEntityInput {
  type: EntityType;
  name: string;
  normalizedLabel: string;
  confidence: ConfidenceLevel;
  source: ExtractionSource;
}

/**
 * Input data for creating a question log analysis with entities
 */
export interface CreateQuestionLogAnalysisInput {
  questionLogId: string;
  extractionVersion: string;
  extractionNumber: number;
  modelUsed: string;
  overallQuality: ExtractionQuality;
  entityCounts: {
    topics: number;
    skills: number;
    tasks: number;
    roles: number;
  };
  extractionCost: number;
  tokensUsed: number;
  reasoning: string | null;
  llm: LlmInfo | null;
  entities: CreateExtractedEntityInput[];
}

/**
 * Filter parameters for finding analyses
 */
export interface FindAnalysesParams {
  questionLogId?: string;
  extractionVersion?: string;
  limit?: number;
}
