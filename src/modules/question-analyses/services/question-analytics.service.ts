/**
 * Question Analytics Service
 *
 * Provides COUNT-based analytics queries for extracted entities.
 * Delegates all data access to the analytics repository.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_QUESTION_ANALYTICS_REPOSITORY_TOKEN,
  IQuestionAnalyticsRepository,
} from '../contracts/repositories/i-question-analytics-repository.contract';
import type { IQuestionAnalyticsService } from '../contracts/services/i-question-analytics-service.contract';
import type {
  EntityQuestionExamples,
  LifetimeStats,
  QualityDistribution,
  TopQuestion,
  TrendingResult,
} from '../types/analytics.types';
import type { EntityType } from '../types/core.enums';

/**
 * Question Analytics Service Implementation
 *
 * Orchestrates analytics operations by delegating to the analytics repository.
 * No raw SQL in the service layer - all data access is handled by the repository.
 */
@Injectable()
export class QuestionAnalyticsService implements IQuestionAnalyticsService {
  private readonly logger = new Logger(QuestionAnalyticsService.name);

  constructor(
    @Inject(I_QUESTION_ANALYTICS_REPOSITORY_TOKEN)
    private readonly analyticsRepository: IQuestionAnalyticsRepository,
  ) {}

  async getTrending(
    entityType: EntityType,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<TrendingResult[]> {
    this.logger.debug(
      `Fetching trending ${entityType} entities from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    return this.analyticsRepository.getTrending(
      entityType,
      startDate,
      endDate,
      limit,
    );
  }

  async getEntityQuestionExamples(
    entityType: EntityType,
    normalizedLabel: string,
    limit?: number,
  ): Promise<EntityQuestionExamples> {
    this.logger.debug(
      `Fetching example questions for ${entityType}:${normalizedLabel}`,
    );

    const result = await this.analyticsRepository.getEntityQuestionExamples(
      entityType,
      normalizedLabel,
      limit,
    );

    this.logger.debug(
      `Found ${result.totalQuestions} example questions for ${entityType}:${normalizedLabel}`,
    );

    return result;
  }

  async getLifetimeStats(): Promise<LifetimeStats> {
    this.logger.debug('Fetching lifetime extraction statistics');

    return this.analyticsRepository.getLifetimeStats();
  }

  async getQualityDistribution(): Promise<QualityDistribution> {
    this.logger.debug('Fetching quality distribution');

    return this.analyticsRepository.getQualityDistribution();
  }

  async getTopQuestions(limit?: number): Promise<TopQuestion[]> {
    this.logger.debug(`Fetching top ${limit} questions by extraction count`);

    return this.analyticsRepository.getTopQuestions(limit);
  }
}
