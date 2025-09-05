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
      // Mock global.fetch function
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Hello World!' }), // Mock json method
      } as any);

      const result = await appController.getResponse('any question');
      expect(result).toEqual({ message: 'Hello World!' }); // Check if result matches the mock
      expect(fetch).toHaveBeenCalledTimes(1); // Ensure fetch was called once
    });
  });
});
