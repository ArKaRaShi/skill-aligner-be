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
 * Integration tests for QueryPipelineReaderService - Multi-Step Pipeline
 *
 * Tests complete pipeline operations:
 * 6. Full pipeline with 4 steps (classification, queryProfile, skillExpansion, answerSynthesis)
 * 10. Complete verification with all 7 steps (all metadata types)
 * 12. Batch retrieval (getLogsByIds)
 */
describe('QueryPipelineReaderService Integration - Multi-Step Pipeline', () => {
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

  describe('Full pipeline - multiple steps write and read', () => {
    it('should write multiple steps and read them all back with correct types', async () => {
      // Arrange - Start a query log
      const queryLogId = await loggerService.start(testQuestion);

      // Act - Log multiple steps in pipeline order
      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'User wants course recommendations',
          llmInfo: createMockLlmInfo({ promptVersion: 'v1' }),
        },
      });

      await loggerService.queryProfile({
        question: testQuestion,
        queryProfileResult: {
          language: 'en',
          llmInfo: createMockLlmInfo({ promptVersion: 'v3' }),
          tokenUsage: {
            model: 'gpt-4',
            inputTokens: 100,
            outputTokens: 50,
          },
        },
      });

      await loggerService.skillExpansion({
        question: testQuestion,
        promptVersion: 'v2',
        skillExpansionResult: {
          skillItems: [{ skill: 'Python', reason: 'Core skill' }],
          llmInfo: createMockLlmInfo({ promptVersion: 'v2' }),
        },
      });

      await loggerService.answerSynthesis({
        question: testQuestion,
        promptVersion: 'v1',
        synthesisResult: {
          answerText: 'Based on your interest, I recommend CS101...',
          llmInfo: createMockLlmInfo({ promptVersion: 'v1' }),
        },
      });

      await loggerService.complete(
        { answer: 'Final answer' },
        { totalDuration: 1000 },
      );

      // Act - Read back the full log
      const log = await readerService.getQueryLogById(queryLogId);

      // Assert - Verify all steps exist with correct order
      expect(log?.processSteps).toHaveLength(4);

      // Sort steps by stepOrder to ensure correct ordering
      const sortedSteps = [...log!.processSteps].sort(
        (a, b) => a.stepOrder - b.stepOrder,
      );

      const [classification, profile, skillExpansion, synthesis] = sortedSteps;

      // Assert - Verify each step has proper type and data
      expect(classification.stepName).toBe(STEP_NAME.QUESTION_CLASSIFICATION);
      expect(
        (classification.output!.raw as { category: string }).category,
      ).toBe('relevant');

      expect(profile.stepName).toBe(STEP_NAME.QUERY_PROFILE_BUILDING);
      expect((profile.output!.raw as { language: string }).language).toBe('en');

      expect(skillExpansion.stepName).toBe(STEP_NAME.SKILL_EXPANSION);
      expect(
        (skillExpansion.output!.raw as { skillItems: unknown[] }).skillItems,
      ).toHaveLength(1);

      expect(synthesis.stepName).toBe(STEP_NAME.ANSWER_SYNTHESIS);
      expect((synthesis.output!.raw as { answer: string }).answer).toContain(
        'CS101',
      );
    });
  });

  describe('Complete verification - all metadata types in one query', () => {
    it('should correctly store and retrieve all metadata types across different steps', async () => {
      // Arrange - Create mock data for all step types
      const skills = ['python'];
      const skillCoursesMap = new Map([['python', []]]);
      const embeddingUsage = {
        bySkill: [
          {
            skill: 'python',
            model: 'e5-base',
            provider: 'local',
            dimension: 768,
            embeddedText: 'python',
            generatedAt: new Date().toISOString(),
            promptTokens: 5,
            totalTokens: 5,
          },
        ],
        totalTokens: 5,
      };

      const filterResult: any = {
        llmAcceptedCoursesBySkill: new Map([['python', []]]),
        llmRejectedCoursesBySkill: new Map([['python', []]]),
        llmMissingCoursesBySkill: new Map([['java', []]]),
        llmInfo: createMockLlmInfo(),
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      };

      const filteredSkillCoursesMap = new Map([['python', []]]);
      const rankedCourses: any[] = [];

      // Act - Log all steps
      const queryLogId = await loggerService.start(testQuestion);

      // LLM-based steps
      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo: createMockLlmInfo({ inputTokens: 100, outputTokens: 50 }),
        },
      });

      await loggerService.queryProfile({
        question: testQuestion,
        queryProfileResult: {
          language: 'en',
          llmInfo: createMockLlmInfo({ promptVersion: 'v3' }),
          tokenUsage: {
            model: 'gpt-4',
            inputTokens: 120,
            outputTokens: 60,
          },
        },
      });

      await loggerService.skillExpansion({
        question: testQuestion,
        promptVersion: 'v2',
        skillExpansionResult: {
          skillItems: [{ skill: 'Python', reason: 'Core skill' }],
          llmInfo: createMockLlmInfo({ inputTokens: 80, outputTokens: 40 }),
        },
      });

      // Embedding-based step
      await loggerService.courseRetrieval({
        skills,
        skillCoursesMap,
        embeddingUsage,
      });

      // Complex steps with metrics
      await loggerService.courseFilter({
        question: testQuestion,
        relevanceFilterResults: [filterResult],
      });

      await loggerService.courseAggregation({
        filteredSkillCoursesMap,
        rankedCourses,
      });

      await loggerService.answerSynthesis({
        question: testQuestion,
        promptVersion: 'v1',
        synthesisResult: {
          answerText: 'Here are your course recommendations...',
          llmInfo: createMockLlmInfo({ inputTokens: 300, outputTokens: 200 }),
        },
      });

      await loggerService.complete({ answer: 'Final answer' });

      // Assert - Read back and verify all metadata
      const log = await readerService.getQueryLogById(queryLogId);
      expect(log?.processSteps).toHaveLength(7); // 1 courseFilter step (merged)

      // Verify LLM steps have llm field with token usage
      const llmSteps = log!.processSteps.filter((s) => s.llm);
      expect(llmSteps).toHaveLength(4); // classification, queryProfile, skillExpansion, answerSynthesis (courseFilter has no step-level llm)

      // Sum up all token usage across LLM steps
      // Note: courseFilter tokens are in allSkillsMetrics[i].tokenUsage, not step.llm
      const totalTokens = llmSteps.reduce(
        (sum, step) => sum + (step.llm?.tokenUsage?.total || 0),
        0,
      );
      // classification (100+50) + queryProfile (100+50) + skillExpansion (80+40) + answerSynthesis (300+200)
      // Note: queryProfile uses llmInfo tokens (100+50), not separate tokenUsage object (120+60)
      // Note: courseFilter tokens (150) are NOT counted here since step-level llm is null
      expect(totalTokens).toBe(920);

      // Verify embedding step has embedding field
      const retrievalStep = log!.processSteps.find(
        (s) => s.stepName === STEP_NAME.COURSE_RETRIEVAL,
      );
      expect(retrievalStep?.embedding?.totalTokens).toBe(5);
      expect(retrievalStep?.embedding?.skillsCount).toBe(1);

      // Verify metrics exist for complex steps
      const filterStep = log!.processSteps.find(
        (s) => s.stepName === STEP_NAME.COURSE_RELEVANCE_FILTER,
      );
      expect(filterStep?.output?.metrics).toBeDefined();

      // Verify course filter step has no step-level llm (per-skill llmInfo in allSkillsMetrics)
      expect(filterStep?.llm).toBeNull();

      // Verify course filter's per-skill token usage is preserved in allSkillsMetrics
      const mergedMetrics = filterStep?.output?.metrics as unknown as {
        allSkillsMetrics: Array<{ tokenUsage?: { total: number } }>;
      };
      const filterTokens = mergedMetrics?.allSkillsMetrics?.reduce(
        (sum, m) => sum + (m.tokenUsage?.total || 0),
        0,
      );
      expect(filterTokens).toBe(300); // 2 skills (python + java) × 150 tokens each = 300

      const aggregationStep = log!.processSteps.find(
        (s) => s.stepName === STEP_NAME.COURSE_AGGREGATION,
      );
      expect(aggregationStep?.output?.metrics).toBeDefined();

      // Verify aggregation step has no LLM (algorithmic)
      expect(aggregationStep?.llm).toBeNull();

      // Verify retrieval step has no LLM (embedding-based)
      expect(retrievalStep?.llm).toBeNull();
    });
  });

  describe('getLogsByIds - batch retrieval', () => {
    it('should retrieve multiple query logs with proper parsing', async () => {
      // Arrange - Create multiple query logs
      const logId1 = await loggerService.start('Question 1?');
      await loggerService.classification({
        question: 'Question 1?',
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo: createMockLlmInfo(),
        },
      });
      await loggerService.complete({ answer: 'Answer 1' });

      const logId2 = await loggerService.start('Question 2?');
      await loggerService.classification({
        question: 'Question 2?',
        promptVersion: 'v1',
        classificationResult: {
          category: 'irrelevant',
          reason: 'Test',
          llmInfo: createMockLlmInfo(),
        },
      });
      await loggerService.complete({ answer: 'Answer 2' });

      // Act - Retrieve multiple logs
      const logs = await readerService.getQueryLogsByIds([logId1, logId2]);

      // Assert - Verify both logs are retrieved with proper types
      expect(logs).toHaveLength(2);
      expect(logs[0].question).toBe('Question 1?');
      expect(logs[1].question).toBe('Question 2?');

      // Assert - Verify steps are properly parsed
      expect(logs[0].processSteps[0].output!.raw).toBeDefined();
      expect(logs[1].processSteps[0].output!.raw).toBeDefined();
    });
  });
});
