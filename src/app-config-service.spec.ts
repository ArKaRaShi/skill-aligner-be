import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';
import { ConfigService } from '@nestjs/config';

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
            get: jest.fn(), // we’ll spy on this
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

  it('should return OPENROUTER_API_KEY from config', () => {
    const spy = jest
      .spyOn(configService, 'get')
      .mockReturnValue('fake-api-key');

    const key = appConfigService.openRouterApiKey;
    expect(key).toBe('fake-api-key');
    expect(spy).toHaveBeenCalledWith('OPENROUTER_API_KEY');

    spy.mockRestore();
  });

  it('should return empty string if OPENROUTER_API_KEY is undefined', () => {
    const spy = jest.spyOn(configService, 'get').mockReturnValue(undefined);

    const key = appConfigService.openRouterApiKey;
    expect(key).toBe('');
    expect(spy).toHaveBeenCalledWith('OPENROUTER_API_KEY');

    spy.mockRestore();
  });
});
