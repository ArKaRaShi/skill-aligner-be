import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfigDefault } from './app-config.constant';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get('NODE_ENV') ?? AppConfigDefault.NODE_ENV;
  }

  get appDebug(): boolean {
    return this.configService.get('APP_DEBUG') ?? AppConfigDefault.APP_DEBUG;
  }

  get port(): number {
    return this.configService.get('PORT') ?? AppConfigDefault.PORT;
  }

  get databaseUrl(): string {
    return (
      this.configService.get('DATABASE_URL') ?? AppConfigDefault.DATABASE_URL
    );
  }

  get openAIApiKey(): string {
    return (
      this.configService.get('OPENAI_API_KEY') ??
      AppConfigDefault.OPENAI_API_KEY
    );
  }

  get openRouterApiKey(): string {
    return (
      this.configService.get('OPENROUTER_API_KEY') ??
      AppConfigDefault.OPENROUTER_API_KEY
    );
  }

  get openRouterBaseUrl(): string {
    return (
      this.configService.get<string>('OPENROUTER_BASE_URL') ??
      AppConfigDefault.OPENROUTER_BASE_URL
    );
  }

  get semanticsApiBaseUrl(): string {
    return (
      this.configService.get('SEMANTICS_API_BASE_URL') ??
      AppConfigDefault.SEMANTICS_API_BASE_URL
    );
  }

  get embeddingProvider(): 'e5' | 'openai' {
    const embeddingProvider =
      this.configService.get<string>('EMBEDDING_PROVIDER') ??
      AppConfigDefault.EMBEDDING_PROVIDER;
    return embeddingProvider as 'e5' | 'openai';
  }

  get gptLlmProvider(): 'openrouter' | 'openai' {
    const gptLlmProvider =
      this.configService.get<'openrouter' | 'openai'>('GPT_LLM_PROVIDER') ??
      AppConfigDefault.GPT_LLM_PROVIDER;
    return gptLlmProvider as 'openrouter' | 'openai';
  }

  get gptLlmModel(): string {
    return (
      this.configService.get<string>('GPT_LLM_MODEL') ??
      AppConfigDefault.GPT_LLM_MODEL
    );
  }

  get useMockQuestionClassifierService(): boolean {
    return (
      this.configService.get<boolean>('USE_MOCK_QUESTION_CLASSIFIER_SERVICE') ??
      AppConfigDefault.USE_MOCK_QUESTION_CLASSIFIER_SERVICE
    );
  }

  get useMockSkillExpanderService(): boolean {
    return (
      this.configService.get<boolean>('USE_MOCK_SKILL_EXPANDER_SERVICE') ??
      AppConfigDefault.USE_MOCK_SKILL_EXPANDER_SERVICE
    );
  }

  get useMockAnswerGeneratorService(): boolean {
    return (
      this.configService.get<boolean>('USE_MOCK_ANSWER_GENERATOR_SERVICE') ??
      AppConfigDefault.USE_MOCK_ANSWER_GENERATOR_SERVICE
    );
  }
}
