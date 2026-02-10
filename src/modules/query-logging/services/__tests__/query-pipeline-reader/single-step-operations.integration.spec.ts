import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from '../../../contracts/i-query-logging-repository.contract';
import { PrismaQueryLoggingRepositoryProvider } from '../../../repositories/prisma-query-logging.repository';
import { QueryPipelineLoggerService } from '../../../services/query-pipeline-logger.service';
import { QueryPipelineReaderService } from '../../../services/query-pipeline-reader.service';
import { STEP_NAME } from '../../../types/query-status.type';
import {
  createMockLlmInfo,
  testQuestion,
} from './fixtures/query-pipeline-test.fixtures';

/**
 * Integration tests for QueryPipelineReaderService - Single Step Operations
 *
 * Tests individual step write-read cycles:
 * 1. QUESTION_CLASSIFICATION step
 * 2. QUERY_PROFILE_BUILDING step
 * 3. SKILL_EXPANSION step
 * 4. getStepByName() convenience method
 * 5. getStepRawOutput() generic method
 */
describe('QueryPipelineReaderService Integration - Single Step Operations', () => {
  let module: TestingModule;
  let readerService: QueryPipelineReaderService;
  let loggerService: QueryPipelineLoggerService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        PrismaService,
        AppConfigService,
        ConfigService,
        PrismaQueryLoggingRepositoryProvider,
        {
          provide: QueryPipelineLoggerService,
          inject: [I_QUERY_LOGGING_REPOSITORY_TOKEN],
          useFactory: (repository: IQueryLoggingRepository) => {
            return new QueryPipelineLoggerService(repository);
          },
        },
        {
          provide: QueryPipelineReaderService,
          inject: [I_QUERY_LOGGING_REPOSITORY_TOKEN],
          useFactory: (repository: IQueryLoggingRepository) => {
            return new QueryPipelineReaderService(repository);
          },
        },
      ],
    }).compile();

    readerService = module.get<QueryPipelineReaderService>(
      QueryPipelineReaderService,
    );
    loggerService = module.get<QueryPipelineLoggerService>(
      QueryPipelineLoggerService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.queryProcessLog.deleteMany({});
    await prisma.queryProcessStep.deleteMany({});
  });

  describe('QUESTION_CLASSIFICATION step - write and read cycle', () => {
    it('should write classification data and read it back with proper types', async () => {
      // Arrange - Start a query log
      const queryLogId = await loggerService.start(testQuestion);

      // Act - Log classification step
      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'User is asking about course recommendations',
          llmInfo: createMockLlmInfo(),
        },
        duration: 150,
      });

      // Complete the log
      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Read back the query log
      const log = await readerService.getQueryLogById(queryLogId);

      // Assert - Verify log exists
      expect(log).not.toBeNull();
      expect(log?.question).toBe(testQuestion);

      // Assert - Verify classification step exists
      const classificationStep = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.QUESTION_CLASSIFICATION,
      );
      expect(classificationStep).toBeDefined();

      // Assert - Verify raw output is properly typed
      const rawOutput = classificationStep!.output!.raw as {
        category: string;
        reason: string;
      };
      expect(rawOutput.category).toBe('relevant');
      expect(rawOutput.reason).toBe(
        'User is asking about course recommendations',
      );

      // Assert - Verify LLM info is stored separately
      expect(classificationStep!.llm).toBeDefined();
      expect(classificationStep!.llm!.model).toBe('gpt-4');
      expect(classificationStep!.llm!.provider).toBe('openai');
    });
  });

  describe('SKILL_EXPANSION step - write and read cycle', () => {
    it('should write skill expansion data and read it back with proper types', async () => {
      // Arrange - Start a query log
      const queryLogId = await loggerService.start(testQuestion);

      // Act - Log skill expansion step
      await loggerService.skillExpansion({
        question: testQuestion,
        promptVersion: 'v2',
        skillExpansionResult: {
          skillItems: [
            {
              skill: 'Python Programming',
              reason: 'Core language for web dev',
            },
            { skill: 'Flask Framework', reason: 'Backend framework' },
          ],
          llmInfo: createMockLlmInfo({ promptVersion: 'v2' }),
        },
        duration: 300,
      });

      // Complete the log
      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Read back the query log
      const log = await readerService.getQueryLogById(queryLogId);

      // Assert - Verify skill expansion step exists
      const skillStep = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.SKILL_EXPANSION,
      );
      expect(skillStep).toBeDefined();

      // Assert - Verify raw output is properly typed
      const rawOutput = skillStep!.output!.raw as {
        skillItems: Array<{ skill: string; reason: string }>;
      };

      expect(rawOutput.skillItems).toHaveLength(2);
      expect(rawOutput.skillItems[0].skill).toBe('Python Programming');
      expect(rawOutput.skillItems[0].reason).toBe('Core language for web dev');
    });
  });

  describe('getStepByName - convenience method', () => {
    it('should retrieve a specific step by name with proper typing', async () => {
      // Arrange - Start a query log and log a classification step
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test reason',
          llmInfo: createMockLlmInfo(),
        },
      });

      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Get specific step by name
      const step = await readerService.getStepByName(
        queryLogId,
        STEP_NAME.QUESTION_CLASSIFICATION,
      );

      // Assert - Verify step is returned with proper type
      expect(step).not.toBeNull();
      expect(step!.stepName).toBe(STEP_NAME.QUESTION_CLASSIFICATION);
      expect(step!.output).toBeDefined();
    });

    it('should return null for non-existent step name', async () => {
      // Arrange - Start a query log without any steps
      const queryLogId = await loggerService.start(testQuestion);
      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Try to get a step that doesn't exist
      const step = await readerService.getStepByName(
        queryLogId,
        STEP_NAME.SKILL_EXPANSION,
      );

      // Assert - Should return null
      expect(step).toBeNull();
    });
  });

  describe('getStepRawOutput - convenience method with generic type', () => {
    it('should retrieve raw output with proper type inference', async () => {
      // Arrange - Start a query log and log classification
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test reason',
          llmInfo: createMockLlmInfo(),
        },
      });

      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Get raw output with explicit type
      type ClassificationRawOutput = {
        category: string;
        reason: string;
      };

      const rawOutput =
        await readerService.getStepRawOutput<ClassificationRawOutput>(
          queryLogId,
          STEP_NAME.QUESTION_CLASSIFICATION,
        );

      // Assert - Verify raw output is properly typed
      expect(rawOutput).not.toBeNull();
      expect(rawOutput!.category).toBe('relevant');
      expect(rawOutput!.reason).toBe('Test reason');
      // TypeScript should infer the type correctly here
      expect(rawOutput!.category).toEqual(expect.any(String));
    });
  });
});
