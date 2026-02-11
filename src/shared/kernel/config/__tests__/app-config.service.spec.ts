import { ConfigService } from '@nestjs/config';

import { AppConfigDefault } from '../app-config.constant';
import { AppConfigService } from '../app-config.service';

type ConfigOverrides = Record<string, unknown>;

const createService = (overrides: ConfigOverrides = {}) => {
  const configService = {
    get: jest.fn((key: string) => overrides[key]),
  } as unknown as ConfigService;

  return new AppConfigService(configService);
};

describe('AppConfigService', () => {
  describe('defaults', () => {
    it('returns default values when config is not set', () => {
      const service = createService();

      expect(service.nodeEnv).toBe(AppConfigDefault.NODE_ENV);
      expect(service.isProduction).toBe(false);
      expect(service.isDevelopment).toBe(true);
      expect(service.appDebug).toBe(AppConfigDefault.APP_DEBUG);
      expect(service.port).toBe(AppConfigDefault.PORT);
      expect(service.databaseUrl).toBe(AppConfigDefault.DATABASE_URL);
      expect(service.directUrl).toBe(AppConfigDefault.DIRECT_URL);
      expect(service.throttleTtlMs).toBe(AppConfigDefault.THROTTLE_TTL_MS);
      expect(service.throttleLimit).toBe(AppConfigDefault.THROTTLE_LIMIT);
      expect(service.openAIApiKey).toBe(AppConfigDefault.OPENAI_API_KEY);
      expect(service.openRouterApiKey).toBe(
        AppConfigDefault.OPENROUTER_API_KEY,
      );
      expect(service.openRouterBaseUrl).toBe(
        AppConfigDefault.OPENROUTER_BASE_URL,
      );
      expect(service.zaiBaseUrl).toBe(AppConfigDefault.ZAI_BASE_URL);
      expect(service.zaiApiKey).toBe(AppConfigDefault.ZAI_API_KEY);
      expect(service.semanticsApiBaseUrl).toBe(
        AppConfigDefault.SEMANTICS_API_BASE_URL,
      );
      expect(service.embeddingModel).toBe(AppConfigDefault.EMBEDDING_MODEL);
      expect(service.embeddingProvider).toBe(
        AppConfigDefault.EMBEDDING_PROVIDER,
      );
      expect(service.questionClassifierLlmModel).toBe(
        AppConfigDefault.QUESTION_CLASSIFIER_LLM_MODEL,
      );
      expect(service.skillExpanderLlmModel).toBe(
        AppConfigDefault.SKILL_EXPANDER_LLM_MODEL,
      );
      expect(service.filterLoLlmModel).toBe(
        AppConfigDefault.FILTER_LO_LLM_MODEL,
      );
      expect(service.defaultLlmProvider).toBe(
        AppConfigDefault.DEFAULT_LLM_PROVIDER,
      );
      expect(service.answerSynthesisLlmModel).toBe(
        AppConfigDefault.ANSWER_SYNTHESIS_LLM_MODEL,
      );
      expect(service.courseRelevanceFilterLlmModel).toBe(
        AppConfigDefault.COURSE_RELEVANCE_FILTER_LLM_MODEL,
      );
      expect(service.questionExtractionLlmModel).toBe(
        AppConfigDefault.QUESTION_EXTRACTION_LLM_MODEL,
      );
      expect(service.useMockQuestionClassifierService).toBe(
        AppConfigDefault.USE_MOCK_QUESTION_CLASSIFIER_SERVICE,
      );
      expect(service.useMockSkillExpanderService).toBe(
        AppConfigDefault.USE_MOCK_SKILL_EXPANDER_SERVICE,
      );
      expect(service.useMockQueryProfileBuilderService).toBe(
        AppConfigDefault.USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE,
      );
      expect(service.useQuestionClassifierCache).toBe(
        AppConfigDefault.USE_QUESTION_CLASSIFIER_CACHE,
      );
      expect(service.useSkillExpanderCache).toBe(
        AppConfigDefault.USE_SKILL_EXPANDER_CACHE,
      );
      expect(service.queryProfileBuilderLlmModel).toBe(
        AppConfigDefault.QUERY_PROFILE_BUILDER_LLM_MODEL,
      );
    });
  });

  describe('overrides', () => {
    it('returns configured values when provided', () => {
      const service = createService({
        NODE_ENV: 'production',
        APP_DEBUG: false,
        PORT: 4000,
        DATABASE_URL:
          'postgresql://user:password@localhost:5432/testdb?schema=public',
        DIRECT_URL: 'postgresql://user:password@localhost:5432/testdb',
        THROTTLE_TTL_MS: 120000,
        THROTTLE_LIMIT: 5,
        OPENAI_API_KEY: 'openai-key',
        OPENROUTER_API_KEY: 'openrouter-key',
        OPENROUTER_BASE_URL: 'https://example.com/api',
        ZAI_BASE_URL: 'https://zai.example.com',
        ZAI_API_KEY: 'zai-key',
        SEMANTICS_API_BASE_URL: 'http://localhost:9000/api',
        EMBEDDING_MODEL: 'text-embedding-3-small',
        EMBEDDING_PROVIDER: 'openrouter',
        QUESTION_CLASSIFIER_LLM_MODEL: 'qc-model',
        SKILL_EXPANDER_LLM_MODEL: 'se-model',
        FILTER_LO_LLM_MODEL: 'filter-model',
        DEFAULT_LLM_PROVIDER: 'openai',
        ANSWER_SYNTHESIS_LLM_MODEL: 'as-model',
        COURSE_RELEVANCE_FILTER_LLM_MODEL: 'crf-model',
        QUESTION_EXTRACTION_LLM_MODEL: 'qe-model',
        USE_MOCK_QUESTION_CLASSIFIER_SERVICE: true,
        USE_MOCK_SKILL_EXPANDER_SERVICE: true,
        USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE: true,
        USE_QUESTION_CLASSIFIER_CACHE: true,
        USE_SKILL_EXPANDER_CACHE: true,
        QUERY_PROFILE_BUILDER_LLM_MODEL: 'qpb-model',
      });

      expect(service.nodeEnv).toBe('production');
      expect(service.isProduction).toBe(true);
      expect(service.isDevelopment).toBe(false);
      expect(service.appDebug).toBe(false);
      expect(service.port).toBe(4000);
      expect(service.databaseUrl).toBe(
        'postgresql://user:password@localhost:5432/testdb?schema=public',
      );
      expect(service.directUrl).toBe(
        'postgresql://user:password@localhost:5432/testdb',
      );
      expect(service.throttleTtlMs).toBe(120000);
      expect(service.throttleLimit).toBe(5);
      expect(service.openAIApiKey).toBe('openai-key');
      expect(service.openRouterApiKey).toBe('openrouter-key');
      expect(service.openRouterBaseUrl).toBe('https://example.com/api');
      expect(service.zaiBaseUrl).toBe('https://zai.example.com');
      expect(service.zaiApiKey).toBe('zai-key');
      expect(service.semanticsApiBaseUrl).toBe('http://localhost:9000/api');
      expect(service.embeddingModel).toBe('text-embedding-3-small');
      expect(service.embeddingProvider).toBe('openrouter');
      expect(service.questionClassifierLlmModel).toBe('qc-model');
      expect(service.skillExpanderLlmModel).toBe('se-model');
      expect(service.filterLoLlmModel).toBe('filter-model');
      expect(service.defaultLlmProvider).toBe('openai');
      expect(service.answerSynthesisLlmModel).toBe('as-model');
      expect(service.courseRelevanceFilterLlmModel).toBe('crf-model');
      expect(service.questionExtractionLlmModel).toBe('qe-model');
      expect(service.useMockQuestionClassifierService).toBe(true);
      expect(service.useMockSkillExpanderService).toBe(true);
      expect(service.useMockQueryProfileBuilderService).toBe(true);
      expect(service.useQuestionClassifierCache).toBe(true);
      expect(service.useSkillExpanderCache).toBe(true);
      expect(service.queryProfileBuilderLlmModel).toBe('qpb-model');
    });
  });
});
