/**
 * Analytics Repository Query Result Types
 *
 * Type definitions for raw SQL query results in the analytics repository.
 * These types represent raw database values (strings, bigint, etc.)
 * before mapping to domain types.
 *
 * NOTE: Use primitive types (string, bigint) for database columns.
 * Enum conversion happens in the repository mapping layer.
 */

/**
 * Raw query result for trending entities query
 */
export type TrendingResultRaw = {
  normalized_label: string;
  count: bigint;
};

/**
 * Raw query result for entity details lookup
 */
export type EntityDetailsRaw = {
  name: string;
  normalized_label: string;
  type: string;
};

/**
 * Raw query result for example questions with entities
 */
export type QuestionWithEntitiesRaw = {
  question_log_id: string;
  question_text: string;
  extracted_at: Date;
  entity_type: string;
  entity_name: string;
  entity_normalized_label: string;
};

/**
 * Raw query result for lifetime stats aggregation
 */
export type LifetimeStatsRaw = {
  total_extractions: bigint;
  total_cost: number;
  total_tokens: bigint;
  total_questions: bigint;
  high_quality: bigint;
  medium_quality: bigint;
  low_quality: bigint;
  none_quality: bigint;
};

/**
 * Raw query result for quality distribution query
 */
export type QualityDistributionRaw = {
  overall_quality: string;
  count: bigint;
};

/**
 * Raw query result for top questions query
 */
export type TopQuestionRaw = {
  question_log_id: string;
  question_text: string;
  extraction_count: bigint;
  last_extracted_at: Date;
};
