import { IQueryLoggingRepository } from 'src/modules/query-logging/contracts/i-query-logging-repository.contract';
import {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from 'src/modules/query-logging/types/query-log.type';

import { QueryPipelineLoggerService } from '../../../query-pipeline-logger.service';
import {
  createMockQueryLog,
  createMockRepository,
  mockQueryLogId,
} from '../fixtures/query-pipeline-logger.fixtures';

describe('QueryPipelineLoggerService - Lifecycle', () => {
  let service: QueryPipelineLoggerService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = createMockRepository();

    // Create service with mocked repository
    service = new QueryPipelineLoggerService(mockRepository);
  });

  describe('start', () => {
    it('should create a query log and return the ID', async () => {
      // Arrange
      const question = 'What is machine learning?';
      const input: QueryLogInput = {
        question,
        campusId: 'campus-1',
        facultyId: 'faculty-1',
        isGenEd: false,
      };
      const mockLog: QueryProcessLog = createMockQueryLog({
        question,
        input,
      });
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      // Act
      const result = await service.start(question, input);

      // Assert
      expect(result).toBe(mockQueryLogId);
      expect(mockRepository.createQueryLog).toHaveBeenCalledWith({
        question,
        input,
      });
    });

    it('should create a query log without input', async () => {
      // Arrange
      const question = 'What is AI?';
      const mockLog: QueryProcessLog = createMockQueryLog({
        question,
        input: undefined,
      });
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      // Act
      const result = await service.start(question);

      // Assert
      expect(result).toBe(mockQueryLogId);
      expect(mockRepository.createQueryLog).toHaveBeenCalledWith({
        question,
        input: undefined,
      });
    });
  });

  describe('complete', () => {
    beforeEach(async () => {
      // Start a log first
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should complete a query log with output and metrics', async () => {
      // Arrange
      const output: QueryLogOutput = {
        answer: 'This is the answer',
        relatedCourses: [{ courseCode: 'CS101', courseName: 'Intro to CS' }],
      };
      const metrics: Partial<QueryLogMetrics> = {
        totalDuration: 5000,
        tokens: {
          llm: {
            input: 1000,
            output: 500,
            total: 1500,
          },
          total: 1500,
        },
      };

      // Act
      await service.complete(output, metrics);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
          metrics,
        },
      );
    });

    it('should complete a query log with only output', async () => {
      // Arrange
      const output: QueryLogOutput = {
        suggestQuestion: 'What is deep learning?',
      };

      // Act
      await service.complete(output);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
        },
      );
    });
  });

  describe('earlyExit', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should mark query as early exit with classification', async () => {
      // Arrange
      const output: QueryLogOutput = {
        classification: {
          category: 'irrelevant',
          reason: 'Question is not about courses',
        },
      };

      // Act
      await service.earlyExit(output);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'EARLY_EXIT',
          completedAt: expect.any(Date),
          output,
        },
      );
    });
  });

  describe('fail', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should mark query as failed with error', async () => {
      // Arrange
      const error: QueryLogError = {
        code: 'LLM_ERROR',
        message: 'Failed to connect to LLM',
        stack: 'Error: ...',
      };

      // Act
      await service.fail(error);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'FAILED',
          completedAt: expect.any(Date),
          error,
        },
      );
    });
  });
});
