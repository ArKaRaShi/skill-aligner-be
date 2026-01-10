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
 * Integration tests for QueryPipelineReaderService - Metadata Types
 *
 * Tests metadata storage and retrieval:
 * 7. LLM Metadata (token usage, costs, prompts)
 * 8. Embedding Metadata (model, dimension, tokens)
 * 9. Metrics (allSkillsMetrics, summary)
 * 11. Step field verification (duration, stepOrder, parameters)
 */
describe('QueryPipelineReaderService Integration - Metadata Types', () => {
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

  describe('LLM Metadata - verify llm field storage and retrieval', () => {
    it('should store and retrieve LLM metadata for classification step', async () => {
      // Arrange & Act
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'User wants course recommendations',
          llmInfo: createMockLlmInfo({
            model: 'gpt-4',
            provider: 'openai',
            inputTokens: 150,
            outputTokens: 75,
            promptVersion: 'v1',
            systemPrompt: 'You are a helpful assistant',
            userPrompt: testQuestion,
            finishReason: 'stop',
          }),
        },
      });

      await loggerService.complete({ answer: 'Test answer' });

      // Act - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const step = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.QUESTION_CLASSIFICATION,
      );

      // Assert - Verify LLM metadata is stored in step.llm
      expect(step?.llm).toBeDefined();
      expect(step?.llm?.provider).toBe('openai');
      expect(step?.llm?.model).toBe('gpt-4');
      expect(step?.llm?.promptVersion).toBe('v1');
      expect(step?.llm?.systemPromptHash).toBeDefined();
      expect(step?.llm?.userPrompt).toBe(testQuestion);

      // Assert - Verify token usage is calculated
      expect(step?.llm?.tokenUsage).toBeDefined();
      expect(step?.llm?.tokenUsage?.input).toBe(150);
      expect(step?.llm?.tokenUsage?.output).toBe(75);
      expect(step?.llm?.tokenUsage?.total).toBe(225);

      // Assert - Verify cost is calculated
      expect(step?.llm?.cost).toBeDefined();
      expect(typeof step?.llm?.cost).toBe('number');

      // Assert - Verify full metadata is preserved
      expect(step?.llm?.fullMetadata).toBeDefined();
      expect(step?.llm?.fullMetadata?.finishReason).toBe('stop');
    });

    it('should store LLM metadata for answer synthesis step', async () => {
      // Arrange & Act
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.answerSynthesis({
        question: testQuestion,
        promptVersion: 'v2',
        synthesisResult: {
          answerText: 'Based on your question, here are the courses...',
          llmInfo: createMockLlmInfo({
            model: 'gpt-4o-mini',
            provider: 'openrouter',
            inputTokens: 500,
            outputTokens: 300,
            promptVersion: 'v2',
            finishReason: 'stop',
          }),
        },
      });

      await loggerService.complete({ answer: 'Test answer' });

      // Act - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const step = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.ANSWER_SYNTHESIS,
      );

      // Assert
      expect(step?.llm?.provider).toBe('openrouter');
      expect(step?.llm?.model).toBe('gpt-4o-mini');
      expect(step?.llm?.tokenUsage?.total).toBe(800);
    });
  });

  describe('Embedding Metadata - verify embedding field for course retrieval', () => {
    it('should store and retrieve embedding metadata for course retrieval step', async () => {
      // Arrange
      const skills = ['python', 'javascript'];
      const mockCourses = [] as any; // Empty array for simplicity

      const skillCoursesMap = new Map<string, any[]>(
        skills.map((skill) => [skill, mockCourses]),
      );

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
          {
            skill: 'javascript',
            model: 'e5-base',
            provider: 'local',
            dimension: 768,
            embeddedText: 'javascript',
            generatedAt: new Date().toISOString(),
            promptTokens: 6,
            totalTokens: 6,
          },
        ],
        totalTokens: 11,
      };

      // Act
      const queryLogId = await loggerService.start(testQuestion);
      await loggerService.courseRetrieval({
        skills,
        skillCoursesMap,
        embeddingUsage,
      });
      await loggerService.complete({ answer: 'Test answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const step = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.COURSE_RETRIEVAL,
      );

      // Assert - Verify embedding field is populated
      expect(step?.embedding).toBeDefined();
      expect(step?.embedding?.model).toBe('e5-base');
      expect(step?.embedding?.provider).toBe('local');
      expect(step?.embedding?.dimension).toBe(768);
      expect(step?.embedding?.totalTokens).toBe(11);
      expect(step?.embedding?.skillsCount).toBe(2);

      // Assert - Verify bySkill breakdown
      expect(step?.embedding?.bySkill).toHaveLength(2);
      expect(step?.embedding?.bySkill?.[0]?.skill).toBe('python');
      expect(step?.embedding?.bySkill?.[1]?.skill).toBe('javascript');

      // Assert - Verify NO LLM field for retrieval step (uses embeddings, not LLM)
      expect(step?.llm).toBeNull();
    });
  });

  describe('Metrics - verify calculated metrics for complex steps', () => {
    it('should store and retrieve metrics for course relevance filter step', async () => {
      // Arrange - Create mock filter result with metrics
      // NOTE: After merge, we create ONE step with allSkillsMetrics array
      const filterResult: any = {
        llmAcceptedCoursesBySkill: new Map([
          ['python', []],
          ['javascript', []],
        ]),
        llmRejectedCoursesBySkill: new Map([['python', []]]),
        llmMissingCoursesBySkill: new Map([['java', []]]),
        llmInfo: createMockLlmInfo({
          inputTokens: 200,
          outputTokens: 100,
        }),
        tokenUsage: {
          inputTokens: 200,
          outputTokens: 100,
          totalTokens: 300,
        },
      };

      // Act
      const queryLogId = await loggerService.start(testQuestion);
      await loggerService.courseFilter({
        question: testQuestion,
        relevanceFilterResults: [filterResult],
      });
      await loggerService.complete({ answer: 'Test answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const filterSteps = log?.processSteps.filter(
        (s) => s.stepName === STEP_NAME.COURSE_RELEVANCE_FILTER,
      );

      // Assert - Should have 1 step (merged with all skills)
      expect(filterSteps).toHaveLength(1);

      const filterStep = filterSteps?.[0];
      expect(filterStep?.output?.metrics).toBeDefined();

      const mergedMetrics = filterStep?.output?.metrics as unknown as {
        allSkillsMetrics: Array<{ skill: string }>;
        summary: { totalSkills: number };
      };
      expect(mergedMetrics?.allSkillsMetrics).toBeDefined();
      expect(mergedMetrics?.allSkillsMetrics).toHaveLength(3);

      // Verify skill names
      const skillNames: string[] = (mergedMetrics?.allSkillsMetrics || []).map(
        (m) => m.skill,
      );
      expect(skillNames).toContain('python');
      expect(skillNames).toContain('javascript');
      expect(skillNames).toContain('java');

      // Verify each skill has metrics
      const pythonMetrics = (mergedMetrics?.allSkillsMetrics || []).find(
        (m) => m.skill === 'python',
      );
      expect(pythonMetrics).toMatchObject({
        skill: 'python',
        inputCount: expect.any(Number),
        acceptedCount: expect.any(Number),
        rejectedCount: expect.any(Number),
        missingCount: expect.any(Number),
        llmDecisionRate: expect.any(Number),
        llmRejectionRate: expect.any(Number),
        llmFallbackRate: expect.any(Number),
        scoreDistribution: {
          score1: expect.any(Number),
          score2: expect.any(Number),
          score3: expect.any(Number),
        },
      });

      // Verify summary stats
      expect(mergedMetrics?.summary).toBeDefined();
      expect(mergedMetrics?.summary?.totalSkills).toBe(3);

      // Verify step-level llm is null (per-skill llmInfo is in allSkillsMetrics)
      expect(filterStep?.llm).toBeNull();
    });

    it('should store and retrieve metrics for course aggregation step', async () => {
      // Arrange
      const filteredSkillCoursesMap = new Map<string, any[]>([
        ['python', []],
        ['javascript', []],
      ]);

      const rankedCourses: any[] = [
        {
          courseId: 'course-1',
          courseCode: 'CS101',
          courseName: 'Intro to Python',
          finalScore: 3,
          skillBreakdown: [],
          winningSkills: ['python'],
        },
      ];

      // Act
      const queryLogId = await loggerService.start(testQuestion);
      await loggerService.courseAggregation({
        filteredSkillCoursesMap,
        rankedCourses,
      });
      await loggerService.complete({ answer: 'Test answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const aggregationStep = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.COURSE_AGGREGATION,
      );

      // Assert - Verify metrics exist for aggregation step
      expect(aggregationStep?.output?.metrics).toBeDefined();

      const metrics = aggregationStep?.output?.metrics as any;
      expect(metrics).toMatchObject({
        rawCourseCount: expect.any(Number),
        uniqueCourseCount: expect.any(Number),
        duplicateCount: expect.any(Number),
        duplicateRate: expect.any(Number),
        contributingSkills: expect.arrayContaining(['python', 'javascript']),
        courses: expect.any(Array),
        scoreDistribution: {
          score1: expect.any(Number),
          score2: expect.any(Number),
          score3: expect.any(Number),
        },
      });

      // Assert - Verify raw output with Map reconstruction
      const raw = aggregationStep?.output?.raw as
        | {
            filteredSkillCoursesMap: Map<string, unknown>;
            rankedCourses: unknown[];
          }
        | undefined;
      expect(raw?.filteredSkillCoursesMap).toBeInstanceOf(Map);
      expect(raw?.filteredSkillCoursesMap.has('python')).toBe(true);
      expect(raw?.rankedCourses).toHaveLength(1);

      // Assert - Verify NO LLM field for aggregation step (algorithmic, not LLM-based)
      expect(aggregationStep?.llm).toBeNull();
    });
  });

  describe('Step field verification - ensure all fields are stored correctly', () => {
    it('should verify duration, stepOrder, input, and timestamps are stored correctly', async () => {
      // Arrange & Act
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test reason',
          llmInfo: createMockLlmInfo({
            schemaName: 'QuestionClassificationSchema',
          }),
        },
        duration: 250, // Explicit duration
      });

      await loggerService.complete({ answer: 'Test answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const step = log?.processSteps[0];

      // Assert - Verify duration is stored correctly
      expect(step?.duration).toBe(250);

      // Assert - Verify stepOrder is correct (QUESTION_CLASSIFICATION = 1)
      expect(step?.stepOrder).toBe(1);

      // Assert - Verify input is stored correctly
      expect(step?.input).toBeDefined();
      expect(step?.input).toMatchObject({
        question: testQuestion,
        promptVersion: 'v1',
      });

      // Assert - Verify completedAt is set
      expect(step?.completedAt).toBeDefined();
      expect(step?.completedAt).toBeInstanceOf(Date);

      // Assert - Verify timestamps
      expect(step?.createdAt).toBeDefined();
      expect(step?.updatedAt).toBeDefined();
      expect(step?.startedAt).toBeDefined();

      // Assert - Verify stepOrder <= completedAt (time consistency)
      // Allow 10ms tolerance for timing precision issues
      const timeDiff =
        (step?.completedAt!.getTime() ?? 0) - step?.startedAt.getTime()!;
      expect(timeDiff).toBeGreaterThanOrEqual(-10);
    });

    it('should verify schemaName and parameters in LLM metadata', async () => {
      // Arrange & Act
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo: createMockLlmInfo({
            schemaName: 'QuestionClassificationSchema',
            hyperParameters: { temperature: 0.7, maxTokens: 1000 },
          }),
        },
      });

      await loggerService.complete({ answer: 'Test answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);
      const step = log?.processSteps[0];

      // Assert - Verify schemaName is stored
      expect(step?.llm?.schemaName).toBe('QuestionClassificationSchema');

      // Assert - Verify parameters (hyperParameters) are stored
      expect(step?.llm?.parameters).toBeDefined();
      expect(step?.llm?.parameters).toEqual({
        temperature: 0.7,
        maxTokens: 1000,
      });
    });

    it('should verify all step orders are sequential (1-7)', async () => {
      // Arrange & Act - Log all 7 steps
      const queryLogId = await loggerService.start(testQuestion);

      await loggerService.classification({
        question: testQuestion,
        promptVersion: 'v1',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo: createMockLlmInfo(),
        },
      });

      await loggerService.queryProfile({
        question: testQuestion,
        queryProfileResult: {
          language: 'en',
          llmInfo: createMockLlmInfo({ promptVersion: 'v3' }),
          tokenUsage: { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
        },
      });

      await loggerService.skillExpansion({
        question: testQuestion,
        promptVersion: 'v2',
        skillExpansionResult: {
          skillItems: [{ skill: 'Python', reason: 'Core skill' }],
          llmInfo: createMockLlmInfo(),
        },
      });

      await loggerService.courseRetrieval({
        skills: ['python'],
        skillCoursesMap: new Map([['python', []]]),
      });

      await loggerService.courseFilter({
        question: testQuestion,
        relevanceFilterResults: [
          {
            llmAcceptedCoursesBySkill: new Map([['python', []]]),
            llmRejectedCoursesBySkill: new Map([['python', []]]),
            llmMissingCoursesBySkill: new Map([['java', []]]),
            llmInfo: createMockLlmInfo(),
            tokenUsage: {
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
            },
          } as any,
        ],
      });

      await loggerService.courseAggregation({
        filteredSkillCoursesMap: new Map([['python', []]]),
        rankedCourses: [],
      });

      await loggerService.answerSynthesis({
        question: testQuestion,
        promptVersion: 'v1',
        synthesisResult: {
          answerText: 'Test answer',
          llmInfo: createMockLlmInfo(),
        },
      });

      await loggerService.complete({ answer: 'Final answer' });

      // Assert - Read back
      const log = await readerService.getQueryLogById(queryLogId);

      // Assert - Verify all 7 steps exist (1 courseFilter step merged)
      expect(log?.processSteps).toHaveLength(7);

      // Assert - Verify step orders are sequential 1-7 (each step appears once)
      const stepOrders = log!.processSteps
        .map((s) => s.stepOrder)
        .sort((a, b) => a - b);
      expect(stepOrders).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Assert - Verify step names match expected step orders
      const stepsByOrder = Object.fromEntries(
        log!.processSteps.map((s) => [s.stepOrder, s.stepName]),
      );
      expect(stepsByOrder[1]).toBe(STEP_NAME.QUESTION_CLASSIFICATION);
      expect(stepsByOrder[2]).toBe(STEP_NAME.QUERY_PROFILE_BUILDING);
      expect(stepsByOrder[3]).toBe(STEP_NAME.SKILL_EXPANSION);
      expect(stepsByOrder[4]).toBe(STEP_NAME.COURSE_RETRIEVAL);
      expect(stepsByOrder[5]).toBe(STEP_NAME.COURSE_RELEVANCE_FILTER);
      expect(stepsByOrder[6]).toBe(STEP_NAME.COURSE_AGGREGATION);
      expect(stepsByOrder[7]).toBe(STEP_NAME.ANSWER_SYNTHESIS);
    });
  });
});
