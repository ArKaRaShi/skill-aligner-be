import { Module } from '@nestjs/common';

import { AppConfigService } from 'src/config/app-config.service';

import { EmbeddingModule } from '../../core/embedding/embedding.module';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from '../../core/gpt-llm/contracts/i-llm-provider-client.contract';
import { GptLlmModule } from '../../core/gpt-llm/gpt-llm.module';
import { CampusModule } from '../campus/campus.module';
import { CourseModule } from '../course/course.module';
import { FacultyModule } from '../faculty/faculty.module';
import { QuestionClassifierCache } from './cache/question-classifier.cache';
import { QuestionSkillCache } from './cache/question-skill.cache';
import { I_ANSWER_GENERATOR_SERVICE_TOKEN } from './contracts/i-answer-generator-service.contract';
import { I_ANSWER_SYNTHESIS_SERVICE_TOKEN } from './contracts/i-answer-synthesis-service.contract';
import { I_COURSE_CLASSIFICATION_SERVICE_TOKEN } from './contracts/i-course-classification-service.contract';
import { I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN } from './contracts/i-course-relevance-filter-service.contract';
import { I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN } from './contracts/i-query-profile-builder-service.contract';
import { I_QUESTION_CLASSIFIER_SERVICE_TOKEN } from './contracts/i-question-classifier-service.contract';
import { I_SKILL_EXPANDER_SERVICE_TOKEN } from './contracts/i-skill-expander-service.contract';
import { QueryProcessorController } from './query-processor.controller';
import { MockAnswerGeneratorService } from './services/answer-generator/mock-answer-generator.service';
import { ObjectBasedAnswerGeneratorService } from './services/answer-generator/object-based-answer-generator.service';
import { AnswerSynthesisService } from './services/answer-synthesis/answer-synthesis.service';
import { CourseClassificationService } from './services/course-classification/course-classification.service';
import { CourseRelevanceFilterService } from './services/course-relevance-filter/course-relevance-filter.service';
import { MockQueryProfileBuilderService } from './services/query-profile-builder/mock-query-profile-builder.service';
import { QueryProfileBuilderService } from './services/query-profile-builder/query-profile-builder.service';
import { MockQuestionClassifierService } from './services/question-classifier/mock-question-classifier.service';
import { QuestionClassifierService } from './services/question-classifier/question-classifier.service';
import { MockSkillExpanderService } from './services/skill-expander/mock-skill-expander.service';
import { SkillExpanderService } from './services/skill-expander/skill-expander.service';
import { QueryStrategyFactory } from './strategies/query-strategy.factory';
import { SkillQueryStrategy } from './strategies/skill-query.strategy';
import { QueryProcessorUseCases } from './use-cases';

@Module({
  imports: [
    EmbeddingModule.register(),
    CampusModule,
    FacultyModule,
    CourseModule,
    GptLlmModule,
  ],
  controllers: [QueryProcessorController],
  providers: [
    ...QueryProcessorUseCases,
    QuestionClassifierCache,
    QuestionSkillCache,
    {
      provide: I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
      inject: [
        AppConfigService,
        I_LLM_PROVIDER_CLIENT_TOKEN,
        QuestionClassifierCache,
      ],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
        cache: QuestionClassifierCache,
      ) => {
        if (config.useMockQuestionClassifierService) {
          return new MockQuestionClassifierService();
        }
        return new QuestionClassifierService(
          llmProvider,
          config.questionClassifierLlmModel,
          cache,
          config.useQuestionClassifierCache,
        );
      },
    },
    {
      provide: I_SKILL_EXPANDER_SERVICE_TOKEN,
      inject: [
        AppConfigService,
        I_LLM_PROVIDER_CLIENT_TOKEN,
        QuestionSkillCache,
      ],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
        cache: QuestionSkillCache,
      ) => {
        if (config.useMockSkillExpanderService) {
          return new MockSkillExpanderService();
        }
        return new SkillExpanderService(
          llmProvider,
          config.skillExpanderLlmModel,
          cache,
          config.useSkillExpanderCache,
        );
      },
    },
    {
      provide: I_ANSWER_GENERATOR_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        if (config.useMockAnswerGeneratorService) {
          console.log('Creating MockAnswerGeneratorService');
          return new MockAnswerGeneratorService(llmProvider);
        }
        return new ObjectBasedAnswerGeneratorService(
          llmProvider,
          config.answerGeneratorLlmModel,
        );
      },
    },
    {
      provide: I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        if (config.useMockQueryProfileBuilderService) {
          return new MockQueryProfileBuilderService();
        }
        return new QueryProfileBuilderService(
          llmProvider,
          config.queryProfileBuilderLlmModel,
        );
      },
    },
    {
      provide: I_COURSE_CLASSIFICATION_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        // The CourseClassificationService is not mocked for now
        // but this can be extended in the future if needed
        return new CourseClassificationService(
          llmProvider,
          config.courseClassificationLlmModel,
        );
      },
    },
    {
      provide: I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        // The CourseRelevanceFilterService is not mocked for now
        // but this can be extended in the future if needed
        return new CourseRelevanceFilterService(
          llmProvider,
          config.courseRelevanceFilterLlmModel,
        );
      },
    },
    {
      provide: I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        // The AnswerSynthesisService is not mocked for now
        // but this can be extended in the future if needed
        return new AnswerSynthesisService(
          llmProvider,
          config.answerSynthesisLlmModel,
        );
      },
    },

    // Strategies and Factory
    QueryStrategyFactory,
    SkillQueryStrategy,
  ],
  exports: [
    I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
    I_SKILL_EXPANDER_SERVICE_TOKEN,
  ],
})
export class QueryProcessorModule {}
