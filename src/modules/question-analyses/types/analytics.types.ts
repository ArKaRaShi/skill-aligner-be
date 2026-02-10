/**
 * Analytics and statistics types
 * Types for analytics queries and aggregation results
 */
import type { EntityType } from './core.enums';

/**
 * Trending analytics result
 * Used for trending queries (e.g., "What skills are trending?")
 */
export interface TrendingResult {
  entityType: EntityType;
  normalizedLabel: string;
  count: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Quality distribution stats
 * Breakdown of extraction quality levels
 */
export interface QualityDistribution {
  high: number;
  medium: number;
  low: number;
  none: number;
}

/**
 * Lifetime extraction statistics
 * Aggregate statistics for all extractions
 */
export interface LifetimeStats {
  totalExtractions: number;
  totalCost: number;
  averageTokensPerExtraction: number;
  totalQuestionsProcessed: number;
  qualityDistribution: QualityDistribution;
}

/**
 * Example question for entity guidance
 * Shows what other users asked about a specific entity
 * Used for user guidance and discovery
 */
export interface ExampleQuestion {
  questionLogId: string;
  questionText: string;
  extractedAt: Date;
  entities: Array<{
    type: EntityType;
    name: string;
    normalizedLabel: string;
  }>;
}

/**
 * Entity question examples result
 * Returns example questions containing a specific entity
 * Useful for guiding users: "Other users interested in AI also asked..."
 */
export interface EntityQuestionExamples {
  entity: {
    type: EntityType;
    normalizedLabel: string;
    name: string;
  };
  examples: ExampleQuestion[];
  totalQuestions: number;
}

/**
 * Top questions result
 * Questions with highest engagement/extraction count
 */
export interface TopQuestion {
  questionLogId: string;
  questionText: string;
  extractionCount: number;
  lastExtractedAt: Date;
}
