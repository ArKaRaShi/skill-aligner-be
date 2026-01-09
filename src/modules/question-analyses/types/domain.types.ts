/**
 * Domain model types
 * Database entity types matching Prisma schema
 */
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

import type {
  ConfidenceLevel,
  EntityType,
  ExtractionQuality,
  ExtractionSource,
} from './core.enums';

/**
 * Question log domain model
 * Represents a user's question with metadata
 * Matches QuestionLog Prisma model
 */
export interface QuestionLog {
  id: string;
  questionText: string;
  role: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  relatedProcessLogId: string | null;
}

/**
 * Question log analysis domain model
 * Represents a single extraction run for a question log
 * Matches QuestionLogAnalysis Prisma model
 */
export interface QuestionLogAnalysis {
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
  entities: ExtractedEntityDb[];
}

/**
 * Extracted entity as stored in database
 * Flattened structure with type field
 * Matches ExtractedEntity Prisma model
 */
export interface ExtractedEntityDb {
  id: string;
  analysisId: string;
  type: EntityType;
  name: string;
  normalizedLabel: string;
  confidence: ConfidenceLevel;
  source: ExtractionSource;
  createdAt: Date;
}
