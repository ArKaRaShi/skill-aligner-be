import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

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
      const key = appConfigService.openAiApiKey;
      expect(key).toBe('fake-api-key');
      expect(spy).toHaveBeenCalledWith('OPENAI_API_KEY');

      spy.mockRestore();
    });

    it('should return default OPENAI_API_KEY when config value is undefined', () => {
      const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const key = appConfigService.openAiApiKey;
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
});
