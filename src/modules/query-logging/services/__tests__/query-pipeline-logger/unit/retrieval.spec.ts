import type { IQueryLoggingRepository } from '../../../../contracts/i-query-logging-repository.contract';
import type { QueryProcessLogWithSteps } from '../../../../types/query-log-step.type';
import type { QueryProcessLog } from '../../../../types/query-log.type';
import { QueryPipelineLoggerService } from '../../../query-pipeline-logger.service';
import {
  createMockLogWithSteps,
  createMockQueryLog,
  createMockRepository,
  mockQueryLogId,
} from '../fixtures/query-pipeline-logger.fixtures';

describe('QueryPipelineLoggerService - Retrieval', () => {
  let service: QueryPipelineLoggerService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new QueryPipelineLoggerService(mockRepository);
  });

  describe('getFullLog', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should return full query log with steps', async () => {
      // Arrange
      const mockLogWithSteps: QueryProcessLogWithSteps = createMockLogWithSteps(
        {
          processSteps: [],
        },
      );
      mockRepository.findQueryLogById.mockResolvedValue(mockLogWithSteps);

      // Act
      const result = await service.getFullLog();

      // Assert
      expect(mockRepository.findQueryLogById).toHaveBeenCalledWith(
        mockQueryLogId,
        true,
      );
      expect(result).toEqual(mockLogWithSteps);
    });
  });

  describe('getLastLog', () => {
    it('should return the last query log', async () => {
      // Arrange
      const mockLogWithSteps: QueryProcessLogWithSteps = createMockLogWithSteps(
        {
          question: 'Last question',
        },
      );
      mockRepository.findLastQueryLog.mockResolvedValue(mockLogWithSteps);

      // Act
      const result =
        await QueryPipelineLoggerService.getLastLog(mockRepository);

      // Assert
      expect(mockRepository.findLastQueryLog).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockLogWithSteps);
    });
  });
});
