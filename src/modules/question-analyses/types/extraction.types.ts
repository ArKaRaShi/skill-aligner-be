/**
 * Extraction operation types
 * Types for entity extraction operations and results
 */
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

import type {
  ConfidenceLevel,
  ExtractionQuality,
  ExtractionSource,
} from './core.enums';

/**
 * Single entity from LLM extraction result
 * Matches the Zod schema structure
 */
export interface LlmExtractedEntity {
  name: string;
  normalizedLabel: string;
  confidence: ConfidenceLevel;
  source: ExtractionSource;
}

/**
 * Complete extraction result from LLM
 * Matches the Zod schema in entity-extraction.prompt.ts
 */
export interface EntityExtractionResult {
  mentionTopics: LlmExtractedEntity[];
  mentionSkills: LlmExtractedEntity[];
  mentionTasks: LlmExtractedEntity[];
  mentionRoles: LlmExtractedEntity[];
  unmappedConcepts: string[];
  overallQuality: ExtractionQuality;
  reasoning: string;
}

/**
 * Create extraction input (for internal/repository use)
 * Parameters for creating a new extraction with pre-computed result
 */
export interface CreateExtractionInput {
  questionLogId: string;
  extractionVersion: string;
  modelUsed: string;
  extractionResult: EntityExtractionResult;
  extractionCost: number;
  tokensUsed: number;
  llmInfo?: LlmInfo;
}

/**
 * Extraction service result
 * Returned after successful extraction operation
 */
export interface ExtractionResult {
  analysis: {
    id: string;
    questionLogId: string;
    extractionVersion: string;
    extractionNumber: number;
    modelUsed: string;
    extractedAt: Date;
    overallQuality: ExtractionQuality;
    entityCounts: {
      topics: number;
      skills: number;
      tasks: number;
      roles: number;
    } | null;
    extractionCost: number;
    tokensUsed: number;
    reasoning: string | null;
    llm: LlmInfo | null;
    createdAt: Date;
  };
  entities: Array<{
    type: 'topic' | 'skill' | 'task' | 'role';
    name: string;
    normalizedLabel: string;
    confidence: ConfidenceLevel;
    source: ExtractionSource;
  }>;
}

/**
 * Extraction history entry
 * Used for listing extraction history for a question
 */
export interface ExtractionHistoryEntry {
  extractionVersion: string;
  extractionNumber: number;
  modelUsed: string;
  extractedAt: Date;
  overallQuality: ExtractionQuality;
  entityCounts: {
    topics: number;
    skills: number;
    tasks: number;
    roles: number;
  };
  extractionCost: number;
  tokensUsed: number;
}
