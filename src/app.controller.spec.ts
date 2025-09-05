import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppConfigService } from './app-config.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppConfigService,
          useValue: { openRouterApiKey: 'fake-api-key' },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('getResponse', () => {
    it('should return mocked API response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue('Hello World!'),
      } as any);

      const result = await appController.getResponse('any question');
      expect(result).toBe('Hello World!');
    });
  });
});
