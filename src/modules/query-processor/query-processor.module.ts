import { Module } from '@nestjs/common';

import { AppConfigService } from 'src/config/app-config.service';

import { CourseModule } from '../course/course.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from '../gpt-llm/contracts/i-llm-provider-client.contract';
import { GptLlmModule } from '../gpt-llm/gpt-llm.module';
import { I_ANSWER_GENERATOR_SERVICE_TOKEN } from './contracts/i-answer-generator-service.contract';
import { I_QUESTION_CLASSIFIER_SERVICE_TOKEN } from './contracts/i-question-classifier-service.contract';
import { I_SKILL_EXPANDER_SERVICE_TOKEN } from './contracts/i-skill-expander-service.contract';
import { QueryProcessorController } from './query-processor.controller';
import { MockAnswerGeneratorService } from './services/answer-generator/mock-answer-generator.service';
import { ObjectBasedAnswerGeneratorService } from './services/answer-generator/object-based-answer-generator.service';
import { MockQuestionClassifierService } from './services/question-classifier/mock-question-classifier.service';
import { QuestionClassifierService } from './services/question-classifier/question-classifier.service';
import { MockSkillExpanderService } from './services/skill-expander.service.ts/mock-skill-expander.service';
import { SkillExpanderService } from './services/skill-expander.service.ts/skill-expander.service';
import { QueryProcessorUseCases } from './use-cases';

@Module({
  imports: [EmbeddingModule.register(), CourseModule, GptLlmModule],
  controllers: [QueryProcessorController],
  providers: [
    ...QueryProcessorUseCases,
    {
      provide: I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        if (config.useMockQuestionClassifierService) {
          return new MockQuestionClassifierService();
        }
        return new QuestionClassifierService(
          llmProvider,
          config.questionClassifierLlmModel,
        );
      },
    },
    {
      provide: I_SKILL_EXPANDER_SERVICE_TOKEN,
      inject: [AppConfigService, I_LLM_PROVIDER_CLIENT_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmProvider: ILlmProviderClient,
      ) => {
        if (config.useMockSkillExpanderService) {
          return new MockSkillExpanderService();
        }
        return new SkillExpanderService(
          llmProvider,
          config.skillExpanderLlmModel,
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
          return new MockAnswerGeneratorService(llmProvider);
        }
        return new ObjectBasedAnswerGeneratorService(
          llmProvider,
          config.answerGeneratorLlmModel,
        );
      },
    },
  ],
})
export class QueryProcessorModule {}
