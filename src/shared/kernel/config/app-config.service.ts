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

  get embeddingModel(): string {
    return (
      this.configService.get<string>('EMBEDDING_MODEL') ??
      AppConfigDefault.EMBEDDING_MODEL
    );
  }

  get embeddingProvider(): 'local' | 'openai' | 'openrouter' {
    const embeddingProvider =
      this.configService.get<string>('EMBEDDING_PROVIDER') ??
      AppConfigDefault.EMBEDDING_PROVIDER;
    return embeddingProvider as 'local' | 'openai' | 'openrouter';
  }

  get questionClassifierLlmModel(): string {
    return (
      this.configService.get<string>('QUESTION_CLASSIFIER_LLM_MODEL') ??
      AppConfigDefault.QUESTION_CLASSIFIER_LLM_MODEL
    );
  }

  get skillExpanderLlmModel(): string {
    return (
      this.configService.get<string>('SKILL_EXPANDER_LLM_MODEL') ??
      AppConfigDefault.SKILL_EXPANDER_LLM_MODEL
    );
  }

  get filterLoLlmModel(): string {
    return (
      this.configService.get<string>('FILTER_LO_LLM_MODEL') ??
      AppConfigDefault.FILTER_LO_LLM_MODEL
    );
  }

  /**
   * Gets the default LLM provider to use when no provider is specified.
   * @returns The default provider name ('openrouter' or 'openai')
   */
  get defaultLlmProvider(): 'openrouter' | 'openai' {
    const provider =
      this.configService.get<'openrouter' | 'openai'>('DEFAULT_LLM_PROVIDER') ??
      AppConfigDefault.DEFAULT_LLM_PROVIDER;
    return provider as 'openrouter' | 'openai';
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

  get useQuestionClassifierCache(): boolean {
    return (
      this.configService.get<boolean>('USE_QUESTION_CLASSIFIER_CACHE') ??
      AppConfigDefault.USE_QUESTION_CLASSIFIER_CACHE
    );
  }

  get useSkillExpanderCache(): boolean {
    return (
      this.configService.get<boolean>('USE_SKILL_EXPANDER_CACHE') ??
      AppConfigDefault.USE_SKILL_EXPANDER_CACHE
    );
  }

  get queryProfileBuilderLlmModel(): string {
    return (
      this.configService.get<string>('QUERY_PROFILE_BUILDER_LLM_MODEL') ??
      AppConfigDefault.QUERY_PROFILE_BUILDER_LLM_MODEL
    );
  }

  get answerSynthesisLlmModel(): string {
    return (
      this.configService.get<string>('ANSWER_SYNTHESIS_LLM_MODEL') ??
      AppConfigDefault.ANSWER_SYNTHESIS_LLM_MODEL
    );
  }

  get courseRelevanceFilterLlmModel(): string {
    return (
      this.configService.get<string>('COURSE_RELEVANCE_FILTER_LLM_MODEL') ??
      AppConfigDefault.COURSE_RELEVANCE_FILTER_LLM_MODEL
    );
  }

  get useMockQueryProfileBuilderService(): boolean {
    return (
      this.configService.get<boolean>(
        'USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE',
      ) ?? AppConfigDefault.USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE
    );
  }
}
