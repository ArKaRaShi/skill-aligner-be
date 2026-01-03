import { Module } from '@nestjs/common';

import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import { EmbeddingModule } from '../../shared/adapters/embedding/embedding.module';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from '../../shared/adapters/llm/contracts/i-llm-router-service.contract';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { CampusModule } from '../campus/campus.module';
import { CourseModule } from '../course/course.module';
import { FacultyModule } from '../faculty/faculty.module';
import { QuestionClassifierCache } from './cache/question-classifier.cache';
import { QuestionSkillCache } from './cache/question-skill.cache';
import { I_ANSWER_SYNTHESIS_SERVICE_TOKEN } from './contracts/i-answer-synthesis-service.contract';
import { I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN } from './contracts/i-course-relevance-filter-service.contract';
import { I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN } from './contracts/i-query-profile-builder-service.contract';
import { I_QUESTION_CLASSIFIER_SERVICE_TOKEN } from './contracts/i-question-classifier-service.contract';
import { I_SKILL_EXPANDER_SERVICE_TOKEN } from './contracts/i-skill-expander-service.contract';
import { QueryProcessorController } from './query-processor.controller';
import { AnswerSynthesisService } from './services/answer-synthesis/answer-synthesis.service';
import { CourseRelevanceFilterService } from './services/course-relevance-filter/course-relevance-filter.service';
import { MockQueryProfileBuilderService } from './services/query-profile-builder/mock-query-profile-builder.service';
import { QueryProfileBuilderService } from './services/query-profile-builder/query-profile-builder.service';
import { MockQuestionClassifierService } from './services/question-classifier/mock-question-classifier.service';
import { QuestionClassifierService } from './services/question-classifier/question-classifier.service';
import { MockSkillExpanderService } from './services/skill-expander/mock-skill-expander.service';
import { SkillExpanderService } from './services/skill-expander/skill-expander.service';
import { QueryProcessorUseCases } from './use-cases';

@Module({
  imports: [
    EmbeddingModule,
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
        I_LLM_ROUTER_SERVICE_TOKEN,
        QuestionClassifierCache,
      ],
      useFactory: (
        config: AppConfigService,
        llmRouter: ILlmRouterService,
        cache: QuestionClassifierCache,
      ) => {
        if (config.useMockQuestionClassifierService) {
          return new MockQuestionClassifierService();
        }
        return new QuestionClassifierService(
          llmRouter,
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
        I_LLM_ROUTER_SERVICE_TOKEN,
        QuestionSkillCache,
      ],
      useFactory: (
        config: AppConfigService,
        llmRouter: ILlmRouterService,
        cache: QuestionSkillCache,
      ) => {
        if (config.useMockSkillExpanderService) {
          return new MockSkillExpanderService();
        }
        return new SkillExpanderService(
          llmRouter,
          config.skillExpanderLlmModel,
          cache,
          config.useSkillExpanderCache,
        );
      },
    },
    {
      provide: I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_ROUTER_SERVICE_TOKEN],
      useFactory: (config: AppConfigService, llmRouter: ILlmRouterService) => {
        if (config.useMockQueryProfileBuilderService) {
          return new MockQueryProfileBuilderService();
        }
        return new QueryProfileBuilderService(
          llmRouter,
          config.queryProfileBuilderLlmModel,
        );
      },
    },
    {
      provide: I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_ROUTER_SERVICE_TOKEN],
      useFactory: (config: AppConfigService, llmRouter: ILlmRouterService) => {
        // The CourseRelevanceFilterService is not mocked for now
        // but this can be extended in future if needed
        return new CourseRelevanceFilterService(
          llmRouter,
          config.courseRelevanceFilterLlmModel,
        );
      },
    },
    {
      provide: I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_ROUTER_SERVICE_TOKEN],
      useFactory: (config: AppConfigService, llmRouter: ILlmRouterService) => {
        // The AnswerSynthesisService is not mocked for now
        // but this can be extended in future if needed
        return new AnswerSynthesisService(
          llmRouter,
          config.answerSynthesisLlmModel,
        );
      },
    },
  ],
  exports: [
    I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
    I_SKILL_EXPANDER_SERVICE_TOKEN,
  ],
})
export class QueryProcessorModule {}
