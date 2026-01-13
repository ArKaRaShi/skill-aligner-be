/**
 * Question Analytics Service Contract
 *
 * Defines the interface for analytics queries on extracted entities.
 * This contract is specifically tied to QuestionAnalyticsService implementation.
 */
import { EntityType } from '../../types';
import type {
  EntityQuestionExamples,
  LifetimeStats,
  QualityDistribution,
  TopQuestion,
  TrendingResult,
} from '../../types/analytics.types';

/**
 * Service contract token for dependency injection
 */
export const I_QUESTION_ANALYTICS_SERVICE_TOKEN = Symbol(
  'IQuestionAnalyticsService',
);

/**
 * Question Analytics Service Interface
 *
 * Defines COUNT-based analytics operations for extracted entities.
 * No ML or clustering - just simple SQL aggregation.
 */
export interface IQuestionAnalyticsService {
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
