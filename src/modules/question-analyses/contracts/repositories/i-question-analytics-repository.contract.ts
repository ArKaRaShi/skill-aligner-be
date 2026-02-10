/**
 * Question Analytics Repository Contract
 *
 * Defines the interface for analytics queries on extracted entities.
 * Handles raw SQL queries for COUNT-based aggregation.
 */
import type {
  EntityQuestionExamples,
  LifetimeStats,
  QualityDistribution,
  TopQuestion,
  TrendingResult,
} from '../../types/analytics.types';
import type { EntityType } from '../../types/core.enums';

export const I_QUESTION_ANALYTICS_REPOSITORY_TOKEN = Symbol(
  'IQuestionAnalyticsRepository',
);

/**
 * Question Analytics Repository Interface
 *
 * Provides COUNT-based analytics operations for extracted entities.
 * All queries use raw SQL with existing indexes.
 */
export interface IQuestionAnalyticsRepository {
  /**
   * Get trending entities by type within a time period
   * @param entityType - The entity type to analyze (topic, skill, task, role)
   * @param startDate - Start of time period
   * @param endDate - End of time period
   * @param limit - Maximum number of results to return
   * @returns Array of trending entities with counts
   */
  getTrending(
    entityType: EntityType,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<TrendingResult[]>;

  /**
   * Get example questions containing a specific entity
   * @param entityType - The entity type
   * @param normalizedLabel - The normalized entity label
   * @param limit - Maximum number of examples to return
   * @returns Entity with example questions
   */
  getEntityQuestionExamples(
    entityType: EntityType,
    normalizedLabel: string,
    limit?: number,
  ): Promise<EntityQuestionExamples>;

  /**
   * Get lifetime extraction statistics
   * @returns Aggregate statistics for all extractions
   */
  getLifetimeStats(): Promise<LifetimeStats>;

  /**
   * Get quality distribution of extractions
   * @returns Count of extractions by quality level
   */
  getQualityDistribution(): Promise<QualityDistribution>;

  /**
   * Get top questions by extraction count
   * @param limit - Maximum number of questions to return
   * @returns Array of most extracted questions
   */
  getTopQuestions(limit?: number): Promise<TopQuestion[]>;
}
