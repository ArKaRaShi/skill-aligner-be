import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from '../contracts/i-query-logging-repository.contract';
import { PrismaQueryLoggingRepositoryProvider } from '../repositories/prisma-query-logging.repository';
import { QueryPipelineLoggerService } from '../services/query-pipeline-logger.service';
import { QueryPipelineReaderService } from '../services/query-pipeline-reader.service';
import { STEP_NAME } from '../types/query-status.type';

/**
 * Integration tests for QueryPipelineReaderService
 *
 * Tests the full write-read cycle:
 * 1. Write data using QueryPipelineLoggerService
 * 2. Read and parse using QueryPipelineReaderService
 * 3. Verify types are correctly reconstructed
 */
describe('QueryPipelineReaderService Integration', () => {
  let module: TestingModule;
  let readerService: QueryPipelineReaderService;
  let loggerService: QueryPipelineLoggerService;
  let prisma: PrismaService;

  const testQuestion =
    'What courses should I take to learn Python programming?';

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

  /**
   * Helper: Create mock LLM info for testing
   */
  const createMockLlmInfo = (overrides = {}) => ({
    model: 'gpt-4',
    provider: 'openai' as const,
    inputTokens: 100,
    outputTokens: 50,
    userPrompt: 'Test prompt',
    systemPrompt: 'Test system prompt',
    promptVersion: 'v1',
    finishReason: 'stop' as const,
    warnings: [],
    ...overrides,
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

  describe('QUERY_PROFILE_BUILDING step - write and read cycle', () => {
    it('should write query profile data and read it back with proper types', async () => {
      // Arrange - Start a query log
      const queryLogId = await loggerService.start(testQuestion);

      // Act - Log query profile step
      await loggerService.queryProfile({
        question: testQuestion,
        queryProfileResult: {
          intents: [
            { original: 'web development', augmented: 'ask-skills' },
            { original: 'career', augmented: 'ask-occupation' },
          ],
          preferences: [{ original: 'online', augmented: 'flexible schedule' }],
          background: [
            { original: 'beginner', augmented: 'no prior experience' },
          ],
          language: 'en',
          llmInfo: createMockLlmInfo({ promptVersion: 'v1' }),
          tokenUsage: {
            model: 'gpt-4',
            inputTokens: 120,
            outputTokens: 80,
          },
        },
        duration: 200,
      });

      // Complete the log
      await loggerService.complete({
        answer: 'Test answer',
      });

      // Act - Read back the query log
      const log = await readerService.getQueryLogById(queryLogId);

      // Assert - Verify query profile step exists
      const profileStep = log?.processSteps.find(
        (s) => s.stepName === STEP_NAME.QUERY_PROFILE_BUILDING,
      );
      expect(profileStep).toBeDefined();

      // Assert - Verify raw output is properly typed with new structure
      const rawOutput = profileStep!.output!.raw as {
        intents: Array<{ original: string; augmented: string }>;
        preferences: Array<{ original: string; augmented: string }>;
        background: Array<{ original: string; augmented: string }>;
        language: 'en' | 'th';
      };

      // Assert - Verify core data (not wrapped in queryProfile property)
      expect(rawOutput.intents).toHaveLength(2);
      expect(rawOutput.intents[0].original).toBe('web development');
      expect(rawOutput.intents[0].augmented).toBe('ask-skills');
      expect(rawOutput.preferences).toHaveLength(1);
      expect(rawOutput.preferences[0].original).toBe('online');
      expect(rawOutput.background).toHaveLength(1);
      expect(rawOutput.language).toBe('en');

      // Assert - Verify llmInfo is NOT in raw output (stored separately)
      expect('llmInfo' in rawOutput).toBe(false);
      expect(profileStep!.llm).toBeDefined();
      expect(profileStep!.llm!.promptVersion).toBe('v1');
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
          intents: [{ original: 'programming', augmented: 'ask-skills' }],
          preferences: [],
          background: [],
          language: 'en',
          llmInfo: createMockLlmInfo({ promptVersion: 'v1' }),
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
            provider: 'openai' as const,
            inputTokens: 150,
            outputTokens: 75,
            promptVersion: 'v1',
            systemPrompt: 'You are a helpful assistant',
            userPrompt: testQuestion,
            finishReason: 'stop' as const,
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
            provider: 'openrouter' as const,
            inputTokens: 500,
            outputTokens: 300,
            promptVersion: 'v2',
            finishReason: 'stop' as const,
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

      // Assert - Should have 3 steps (one per skill: python, javascript, java)
      expect(filterSteps).toHaveLength(3);

      // Assert - Verify metrics exist for filter step
      const pythonStep = filterSteps?.find((s) => s.input?.skill === 'python');
      expect(pythonStep?.output?.metrics).toBeDefined();

      const metrics = pythonStep?.output?.metrics as any;
      expect(metrics).toMatchObject({
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
          intents: [],
          preferences: [],
          background: [],
          language: 'en',
          llmInfo: createMockLlmInfo({ inputTokens: 120, outputTokens: 60 }),
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
      expect(log?.processSteps).toHaveLength(8);

      // Verify LLM steps have llm field with token usage
      const llmSteps = log!.processSteps.filter((s) => s.llm);
      expect(llmSteps).toHaveLength(6); // classification, queryProfile, skillExpansion, courseFilter x2, answerSynthesis

      // Sum up all token usage across LLM steps
      // Note: filterResult uses default llmInfo (100+50=150) unless explicitly overridden
      const totalTokens = llmSteps.reduce(
        (sum, step) => sum + (step.llm?.tokenUsage?.total || 0),
        0,
      );
      // classification (100+50) + queryProfile (120+60) + skillExpansion (80+40) + courseFilter x2 (2*(100+50)) + answerSynthesis (300+200)
      expect(totalTokens).toBe(1250);

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
          intents: [],
          preferences: [],
          background: [],
          language: 'en',
          llmInfo: createMockLlmInfo(),
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

      // Assert - Verify all 8 steps exist (2 courseFilter steps due to 2 skills)
      expect(log?.processSteps).toHaveLength(8);

      // Assert - Verify step orders are sequential 1-7 (with duplicate 5 for 2 courseFilter steps)
      const stepOrders = log!.processSteps
        .map((s) => s.stepOrder)
        .sort((a, b) => a - b);
      expect(stepOrders).toEqual([1, 2, 3, 4, 5, 5, 6, 7]);

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
