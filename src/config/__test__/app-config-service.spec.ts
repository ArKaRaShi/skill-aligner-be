import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigDefault } from '../app-config.constant';
import { AppConfigService } from '../app-config.service';

describe('AppConfigService', () => {
  let appConfigService: AppConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(), // we'll spy on this
          },
        },
      ],
    }).compile();

    appConfigService = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(appConfigService).toBeDefined();
  });

  describe('nodeEnv', () => {
    it('should return NODE_ENV from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('production');

      const result = appConfigService.nodeEnv;
      expect(result).toBe('production');
      expect(spy).toHaveBeenCalledWith('NODE_ENV');

      spy.mockRestore();
    });

    it('should return default NODE_ENV when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = appConfigService.nodeEnv;
      expect(result).toBe('development');
      expect(spy).toHaveBeenCalledWith('NODE_ENV');

      spy.mockRestore();
    });
  });

  describe('appDebug', () => {
    it('should return APP_DEBUG from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(true);

      const result = appConfigService.appDebug;
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('APP_DEBUG');

      spy.mockRestore();
    });

    it('should return default APP_DEBUG when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = appConfigService.appDebug;
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('APP_DEBUG');

      spy.mockRestore();
    });
  });

  describe('port', () => {
    it('should return PORT from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(8080);

      const result = appConfigService.port;
      expect(result).toBe(8080);
      expect(spy).toHaveBeenCalledWith('PORT');

      spy.mockRestore();
    });

    it('should return default PORT when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = appConfigService.port;
      expect(result).toBe(3001);
      expect(spy).toHaveBeenCalledWith('PORT');

      spy.mockRestore();
    });
  });

  describe('databaseUrl', () => {
    it('should return DATABASE_URL from config', () => {
      const mockDatabaseUrl = 'postgresql://user:pass@localhost:5432/db';
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(mockDatabaseUrl);

      const result = appConfigService.databaseUrl;
      expect(result).toBe(mockDatabaseUrl);
      expect(spy).toHaveBeenCalledWith('DATABASE_URL');

      spy.mockRestore();
    });

    it('should return default DATABASE_URL when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = appConfigService.databaseUrl;
      expect(result).toBe('');
      expect(spy).toHaveBeenCalledWith('DATABASE_URL');

      spy.mockRestore();
    });
  });

  describe('openAiApiKey', () => {
    it('should return OPENAI_API_KEY from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('fake-api-key');
      const key = appConfigService.openAIApiKey;
      expect(key).toBe('fake-api-key');
      expect(spy).toHaveBeenCalledWith('OPENAI_API_KEY');

      spy.mockRestore();
    });

    it('should return default OPENAI_API_KEY when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const key = appConfigService.openAIApiKey;
      expect(key).toBe('');
      expect(spy).toHaveBeenCalledWith('OPENAI_API_KEY');

      spy.mockRestore();
    });
  });

  describe('openRouterApiKey', () => {
    it('should return OPENROUTER_API_KEY from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('fake-api-key');

      const key = appConfigService.openRouterApiKey;
      expect(key).toBe('fake-api-key');
      expect(spy).toHaveBeenCalledWith('OPENROUTER_API_KEY');

      spy.mockRestore();
    });

    it('should return default OPENROUTER_API_KEY when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const key = appConfigService.openRouterApiKey;
      expect(key).toBe('');
      expect(spy).toHaveBeenCalledWith('OPENROUTER_API_KEY');

      spy.mockRestore();
    });
  });

  describe('openRouterBaseUrl', () => {
    it('should return OPENROUTER_BASE_URL from config', () => {
      const mockUrl = 'https://openrouter.example.com/api/v1';
      const spy = jest.spyOn(configService, 'get').mockReturnValue(mockUrl);

      const url = appConfigService.openRouterBaseUrl;
      expect(url).toBe(mockUrl);
      expect(spy).toHaveBeenCalledWith('OPENROUTER_BASE_URL');

      spy.mockRestore();
    });

    it('should return default OPENROUTER_BASE_URL when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const url = appConfigService.openRouterBaseUrl;
      expect(url).toBe(AppConfigDefault.OPENROUTER_BASE_URL);
      expect(spy).toHaveBeenCalledWith('OPENROUTER_BASE_URL');

      spy.mockRestore();
    });
  });

  describe('semanticsApiBaseUrl', () => {
    it('should return SEMANTICS_API_BASE_URL from config', () => {
      const mockUrl = 'https://semantics.example.com';
      const spy = jest.spyOn(configService, 'get').mockReturnValue(mockUrl);

      const url = appConfigService.semanticsApiBaseUrl;
      expect(url).toBe(mockUrl);
      expect(spy).toHaveBeenCalledWith('SEMANTICS_API_BASE_URL');

      spy.mockRestore();
    });

    it('should return default SEMANTICS_API_BASE_URL when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const url = appConfigService.semanticsApiBaseUrl;
      expect(url).toBe(AppConfigDefault.SEMANTICS_API_BASE_URL);
      expect(spy).toHaveBeenCalledWith('SEMANTICS_API_BASE_URL');

      spy.mockRestore();
    });
  });

  describe('embeddingProvider', () => {
    it('should return EMBEDDING_PROVIDER from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue('openai');

      const provider = appConfigService.embeddingProvider;
      expect(provider).toBe('openai');
      expect(spy).toHaveBeenCalledWith('EMBEDDING_PROVIDER');

      spy.mockRestore();
    });

    it('should return default EMBEDDING_PROVIDER when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const provider = appConfigService.embeddingProvider;
      expect(provider).toBe(AppConfigDefault.EMBEDDING_PROVIDER);
      expect(spy).toHaveBeenCalledWith('EMBEDDING_PROVIDER');

      spy.mockRestore();
    });
  });

  describe('questionClassifierLlmProvider', () => {
    it('should return QUESTION_CLASSIFIER_LLM_PROVIDER from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue('openai');

      const provider = appConfigService.questionClassifierLlmProvider;
      expect(provider).toBe('openai');
      expect(spy).toHaveBeenCalledWith('QUESTION_CLASSIFIER_LLM_PROVIDER');

      spy.mockRestore();
    });

    it('should return default QUESTION_CLASSIFIER_LLM_PROVIDER when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const provider = appConfigService.questionClassifierLlmProvider;
      expect(provider).toBe(AppConfigDefault.QUESTION_CLASSIFIER_LLM_PROVIDER);
      expect(spy).toHaveBeenCalledWith('QUESTION_CLASSIFIER_LLM_PROVIDER');

      spy.mockRestore();
    });
  });

  describe('questionClassifierLlmModel', () => {
    it('should return QUESTION_CLASSIFIER_LLM_MODEL from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('openai/gpt-4o-mini');

      const model = appConfigService.questionClassifierLlmModel;
      expect(model).toBe('openai/gpt-4o-mini');
      expect(spy).toHaveBeenCalledWith('QUESTION_CLASSIFIER_LLM_MODEL');

      spy.mockRestore();
    });

    it('should return default QUESTION_CLASSIFIER_LLM_MODEL when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const model = appConfigService.questionClassifierLlmModel;
      expect(model).toBe(AppConfigDefault.QUESTION_CLASSIFIER_LLM_MODEL);
      expect(spy).toHaveBeenCalledWith('QUESTION_CLASSIFIER_LLM_MODEL');

      spy.mockRestore();
    });
  });

  describe('skillExpanderLlmProvider', () => {
    it('should return SKILL_EXPANDER_LLM_PROVIDER from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue('openai');

      const provider = appConfigService.skillExpanderLlmProvider;
      expect(provider).toBe('openai');
      expect(spy).toHaveBeenCalledWith('SKILL_EXPANDER_LLM_PROVIDER');

      spy.mockRestore();
    });

    it('should return default SKILL_EXPANDER_LLM_PROVIDER when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const provider = appConfigService.skillExpanderLlmProvider;
      expect(provider).toBe(AppConfigDefault.SKILL_EXPANDER_LLM_PROVIDER);
      expect(spy).toHaveBeenCalledWith('SKILL_EXPANDER_LLM_PROVIDER');

      spy.mockRestore();
    });
  });

  describe('skillExpanderLlmModel', () => {
    it('should return SKILL_EXPANDER_LLM_MODEL from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('openai/gpt-4o-mini');

      const model = appConfigService.skillExpanderLlmModel;
      expect(model).toBe('openai/gpt-4o-mini');
      expect(spy).toHaveBeenCalledWith('SKILL_EXPANDER_LLM_MODEL');

      spy.mockRestore();
    });

    it('should return default SKILL_EXPANDER_LLM_MODEL when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const model = appConfigService.skillExpanderLlmModel;
      expect(model).toBe(AppConfigDefault.SKILL_EXPANDER_LLM_MODEL);
      expect(spy).toHaveBeenCalledWith('SKILL_EXPANDER_LLM_MODEL');

      spy.mockRestore();
    });
  });

  describe('answerGeneratorLlmProvider', () => {
    it('should return ANSWER_GENERATOR_LLM_PROVIDER from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue('openai');

      const provider = appConfigService.answerGeneratorLlmProvider;
      expect(provider).toBe('openai');
      expect(spy).toHaveBeenCalledWith('ANSWER_GENERATOR_LLM_PROVIDER');

      spy.mockRestore();
    });

    it('should return default ANSWER_GENERATOR_LLM_PROVIDER when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const provider = appConfigService.answerGeneratorLlmProvider;
      expect(provider).toBe(AppConfigDefault.ANSWER_GENERATOR_LLM_PROVIDER);
      expect(spy).toHaveBeenCalledWith('ANSWER_GENERATOR_LLM_PROVIDER');

      spy.mockRestore();
    });
  });

  describe('answerGeneratorLlmModel', () => {
    it('should return ANSWER_GENERATOR_LLM_MODEL from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('openai/gpt-4o-mini');

      const model = appConfigService.answerGeneratorLlmModel;
      expect(model).toBe('openai/gpt-4o-mini');
      expect(spy).toHaveBeenCalledWith('ANSWER_GENERATOR_LLM_MODEL');

      spy.mockRestore();
    });

    it('should return default ANSWER_GENERATOR_LLM_MODEL when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const model = appConfigService.answerGeneratorLlmModel;
      expect(model).toBe(AppConfigDefault.ANSWER_GENERATOR_LLM_MODEL);
      expect(spy).toHaveBeenCalledWith('ANSWER_GENERATOR_LLM_MODEL');

      spy.mockRestore();
    });
  });

  describe('useMockQuestionClassifierService', () => {
    it('should return USE_MOCK_QUESTION_CLASSIFIER_SERVICE from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(true);

      const flag = appConfigService.useMockQuestionClassifierService;
      expect(flag).toBe(true);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_QUESTION_CLASSIFIER_SERVICE');

      spy.mockRestore();
    });

    it('should return default USE_MOCK_QUESTION_CLASSIFIER_SERVICE when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const flag = appConfigService.useMockQuestionClassifierService;
      expect(flag).toBe(AppConfigDefault.USE_MOCK_QUESTION_CLASSIFIER_SERVICE);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_QUESTION_CLASSIFIER_SERVICE');

      spy.mockRestore();
    });
  });

  describe('useMockSkillExpanderService', () => {
    it('should return USE_MOCK_SKILL_EXPANDER_SERVICE from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(true);

      const flag = appConfigService.useMockSkillExpanderService;
      expect(flag).toBe(true);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_SKILL_EXPANDER_SERVICE');

      spy.mockRestore();
    });

    it('should return default USE_MOCK_SKILL_EXPANDER_SERVICE when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const flag = appConfigService.useMockSkillExpanderService;
      expect(flag).toBe(AppConfigDefault.USE_MOCK_SKILL_EXPANDER_SERVICE);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_SKILL_EXPANDER_SERVICE');

      spy.mockRestore();
    });
  });

  describe('useMockAnswerGeneratorService', () => {
    it('should return USE_MOCK_ANSWER_GENERATOR_SERVICE from config', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(true);

      const flag = appConfigService.useMockAnswerGeneratorService;
      expect(flag).toBe(true);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_ANSWER_GENERATOR_SERVICE');

      spy.mockRestore();
    });

    it('should return default USE_MOCK_ANSWER_GENERATOR_SERVICE when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const flag = appConfigService.useMockAnswerGeneratorService;
      expect(flag).toBe(AppConfigDefault.USE_MOCK_ANSWER_GENERATOR_SERVICE);
      expect(spy).toHaveBeenCalledWith('USE_MOCK_ANSWER_GENERATOR_SERVICE');

      spy.mockRestore();
    });
  });

  describe('toolDispatcherLlmModel', () => {
    it('should return TOOL_DISPATCHER_LLM_MODEL from config', () => {
      const spy = jest
        .spyOn(configService, 'get')
        .mockReturnValue('openai/gpt-4o-mini');

      const model = appConfigService.toolDispatcherLlmModel;
      expect(model).toBe('openai/gpt-4o-mini');
      expect(spy).toHaveBeenCalledWith('TOOL_DISPATCHER_LLM_MODEL');

      spy.mockRestore();
    });

    it('should return default TOOL_DISPATCHER_LLM_MODEL when undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const model = appConfigService.toolDispatcherLlmModel;
      expect(model).toBe(AppConfigDefault.TOOL_DISPATCHER_LLM_MODEL);
      expect(spy).toHaveBeenCalledWith('TOOL_DISPATCHER_LLM_MODEL');

      spy.mockRestore();
    });
  });
});
