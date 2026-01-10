/**
 * Question Analyses Module
 *
 * Provides entity extraction and analytics services for user questions.
 * This module extracts and analyzes entities (topics, skills, tasks, roles) from user questions
 * to provide actionable insights for course recommendations and content strategy.
 *
 * Features:
 * - Entity extraction from user questions using LLM
 * - Analytics queries for trending entities, question examples, and statistics
 * - Versioned extraction tracking with cost monitoring
 *
 * Module is NOT @Global() - must be explicitly imported by modules that need it.
 */
import { Module } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  type ILlmRouterService,
} from '../../shared/adapters/llm/contracts/i-llm-router-service.contract';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { AppConfigService } from '../../shared/kernel/config/app-config.service';
import {
  I_QUESTION_ANALYTICS_REPOSITORY_TOKEN,
  type IQuestionAnalyticsRepository,
} from './contracts/repositories/i-question-analytics-repository.contract';
import {
  I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
  type IQuestionLogAnalysisRepository,
} from './contracts/repositories/i-question-log-analysis-repository.contract';
import {
  I_QUESTION_LOG_REPOSITORY_TOKEN,
  type IQuestionLogRepository,
} from './contracts/repositories/i-question-log-repository.contract';
import { I_QUESTION_ANALYTICS_SERVICE_TOKEN } from './contracts/services/i-question-analytics-service.contract';
import { I_QUESTION_EXTRACTION_SERVICE_TOKEN } from './contracts/services/i-question-extraction-service.contract';
import { PrismaQuestionAnalyticsRepository } from './repositories/prisma-question-analytics.repository';
import { PrismaQuestionLogAnalysisRepository } from './repositories/prisma-question-log-analysis.repository';
import { PrismaQuestionLogRepository } from './repositories/prisma-question-log.repository';
import { QuestionAnalyticsService } from './services/question-analytics.service';
import { QuestionExtractionService } from './services/question-extraction.service';

/**
 * Question Analyses Module
 *
 * Provides entity extraction and analytics services.
 * Uses factory pattern for service providers to enable testing and future configuration.
 */
@Module({
  imports: [GptLlmModule],
  providers: [
    // Repository Providers
    {
      provide: I_QUESTION_LOG_REPOSITORY_TOKEN,
      useClass: PrismaQuestionLogRepository,
    },
    {
      provide: I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
      useClass: PrismaQuestionLogAnalysisRepository,
    },
    {
      provide: I_QUESTION_ANALYTICS_REPOSITORY_TOKEN,
      useClass: PrismaQuestionAnalyticsRepository,
    },
    // Question Extraction Service Provider
    {
      provide: I_QUESTION_EXTRACTION_SERVICE_TOKEN,
      inject: [
        AppConfigService,
        I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
        I_QUESTION_LOG_REPOSITORY_TOKEN,
        I_LLM_ROUTER_SERVICE_TOKEN,
      ],
      useFactory: (
        config: AppConfigService,
        repository: IQuestionLogAnalysisRepository,
        questionLogRepository: IQuestionLogRepository,
        llmRouter: ILlmRouterService,
      ) => {
        return new QuestionExtractionService(
          repository,
          questionLogRepository,
          llmRouter,
          config.questionExtractionLlmModel,
        );
      },
    },
    // Question Analytics Service Provider
    {
      provide: I_QUESTION_ANALYTICS_SERVICE_TOKEN,
      inject: [I_QUESTION_ANALYTICS_REPOSITORY_TOKEN],
      useFactory: (repository: IQuestionAnalyticsRepository) => {
        return new QuestionAnalyticsService(repository);
      },
    },
  ],
  exports: [
    I_QUESTION_LOG_REPOSITORY_TOKEN,
    I_QUESTION_EXTRACTION_SERVICE_TOKEN,
    I_QUESTION_ANALYTICS_SERVICE_TOKEN,
  ],
})
export class QuestionAnalysesModule {}
