import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: AppConfigService,
          useValue: { nodeEnv: 'test' },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore original implementations
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database (mocked)', async () => {
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database (mocked)', async () => {
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
