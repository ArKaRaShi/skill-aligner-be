import type { Identifier } from 'src/shared/contracts/types/identifier';
import { TimingMap } from 'src/shared/utils/time-logger.helper';
import { TokenMap } from 'src/shared/utils/token-logger.helper';

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

  describe('completeWithRawMetrics', () => {
    beforeEach(async () => {
      // Start a log first
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should build metrics from raw data and complete the query log', async () => {
      // Arrange
      const output: QueryLogOutput = {
        answer: 'This is the answer',
        relatedCourses: [{ courseCode: 'CS101', courseName: 'Intro to CS' }],
      };

      const timing: TimingMap = {
        OVERALL: {
          start: Date.now() - 5000,
          end: Date.now(),
          duration: 5000,
        },
      };

      const llmKey = 'llm' as Identifier;
      const tokenMap: TokenMap = {
        [llmKey]: [
          {
            usage: {
              model: 'gpt-4o-mini',
              inputTokens: 1000,
              outputTokens: 500,
            },
            costEstimate: {
              model: 'gpt-4o-mini',
              inputTokens: 1000,
              outputTokens: 500,
              available: true,
              estimatedCost: 0.01,
            },
          },
        ],
      };

      const coursesReturned = 10;

      // Act
      await service.completeWithRawMetrics(
        output,
        timing,
        tokenMap,
        coursesReturned,
      );

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
          metrics: expect.objectContaining({
            totalDuration: 5000,
            tokens: expect.objectContaining({
              llm: {
                input: 1000,
                output: 500,
                total: 1500,
              },
              total: 1500,
            }),
            costs: expect.objectContaining({
              llm: 0.01,
              total: 0.01,
            }),
            counts: {
              coursesReturned: 10,
            },
          }),
        },
      );
    });

    it('should handle empty token map gracefully', async () => {
      // Arrange
      const output: QueryLogOutput = {
        answer: 'No courses found',
        relatedCourses: [],
      };

      const timing: TimingMap = {
        OVERALL: {
          start: Date.now() - 1000,
          end: Date.now(),
          duration: 1000,
        },
      };

      const tokenMap: TokenMap = {};
      const coursesReturned = 0;

      // Act
      await service.completeWithRawMetrics(
        output,
        timing,
        tokenMap,
        coursesReturned,
      );

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
          metrics: expect.objectContaining({
            totalDuration: 1000,
            tokens: expect.objectContaining({
              total: 0,
            }),
            costs: expect.objectContaining({
              total: 0,
            }),
            counts: {
              coursesReturned: 0,
            },
          }),
        },
      );
    });

    it('should handle multiple token entries with different categories', async () => {
      // Arrange
      const output: QueryLogOutput = {
        answer: 'Course recommendations',
      };

      const timing: TimingMap = {
        OVERALL: {
          start: Date.now() - 3000,
          end: Date.now(),
          duration: 3000,
        },
      };

      const llmKey = 'llm' as Identifier;
      const embeddingKey = 'embedding' as Identifier;
      const tokenMap: TokenMap = {
        [llmKey]: [
          {
            usage: {
              model: 'gpt-4o-mini',
              inputTokens: 800,
              outputTokens: 400,
            },
            costEstimate: {
              model: 'gpt-4o-mini',
              inputTokens: 800,
              outputTokens: 400,
              available: true,
              estimatedCost: 0.008,
            },
          },
        ],
        [embeddingKey]: [
          {
            usage: {
              model: 'e5-base',
              inputTokens: 200,
              outputTokens: 0,
            },
            costEstimate: {
              model: 'e5-base',
              inputTokens: 200,
              outputTokens: 0,
              available: true,
              estimatedCost: 0.001,
            },
          },
        ],
      };

      const coursesReturned = 5;

      // Act
      await service.completeWithRawMetrics(
        output,
        timing,
        tokenMap,
        coursesReturned,
      );

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
          metrics: expect.objectContaining({
            tokens: expect.objectContaining({
              llm: {
                input: 800,
                output: 400,
                total: 1200,
              },
              embedding: {
                total: 200,
              },
              total: 1400, // 1200 LLM + 200 embedding
            }),
            costs: expect.objectContaining({
              llm: 0.008,
              embedding: 0.001,
              total: 0.009,
            }),
            counts: {
              coursesReturned: 5,
            },
          }),
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
