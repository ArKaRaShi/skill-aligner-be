import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import {
  createMockLlmInfo,
  createMockTokenUsage,
} from '../../../../shared/services/__tests__/test-set-builder.fixture';
import { EvaluationHashUtil } from '../../../../shared/utils/evaluation-hash.util';
import {
  createMockCourseInfo,
  createMockEvaluationItem,
  createMockRetrievalPerformanceMetrics,
} from '../../../__tests__/course-retrieval.fixture';
import { CourseRetrieverEvaluator } from '../../../evaluators/course-retriever.evaluator';
import type {
  CourseRetrieverTestCase,
  CourseRetrieverTestSet,
} from '../../../types/course-retrieval.types';
import { CourseRetrievalResultManagerService } from '../../course-retrieval-result-manager.service';
import { CourseRetrievalRunnerService } from '../../course-retrieval-runner.service';

// ============================================================================
// TEST HELPERS
// ============================================================================

const getTempDir = () => path.join(os.tmpdir(), `dedupe-test-${Date.now()}`);

/**
 * Create test cases with deduplication scenarios
 *
 * Scenario 1: Same skill, same courses → should be deduped
 * Scenario 2: Same skill, different courses → should NOT be deduped
 * Scenario 3: Different skill, same courses → should NOT be deduped
 * Scenario 4: Different skill, different courses → should NOT be deduped
 */
const createDedupeTestCases = (): CourseRetrieverTestCase[] => {
  const pythonCourse = createMockCourseInfo({
    subjectCode: 'CS101',
    subjectName: 'Python Programming',
  });

  const javaCourse = createMockCourseInfo({
    subjectCode: 'CS201',
    subjectName: 'Java Programming',
  });

  return [
    // Test cases 1-3: Same skill, same courses → should dedupe
    {
      id: 'test-001',
      question: 'How to learn Python?',
      skill: 'Python programming',
      retrievedCourses: [pythonCourse],
    },
    {
      id: 'test-002',
      question: 'What is Python used for?',
      skill: 'Python programming',
      retrievedCourses: [pythonCourse],
    },
    {
      id: 'test-003',
      question: 'Python best practices?',
      skill: 'Python programming',
      retrievedCourses: [pythonCourse],
    },
    // Test case 4: Same skill, different courses → should NOT dedupe
    {
      id: 'test-004',
      question: 'How to learn Java?',
      skill: 'Java programming',
      retrievedCourses: [javaCourse],
    },
    // Test case 5: Different skill, same courses → should NOT dedupe
    {
      id: 'test-005',
      question: 'Advanced topics?',
      skill: 'Advanced programming',
      retrievedCourses: [pythonCourse, javaCourse],
    },
  ];
};

const createMockEvaluatorOutput = (skill: string, coursesCount: number) => ({
  skill,
  question: 'Mock question',
  evaluations: Array.from({ length: coursesCount }, () =>
    createMockEvaluationItem(),
  ),
  metrics: createMockRetrievalPerformanceMetrics(),
  llmInfo: createMockLlmInfo({ provider: 'openai' }), // Explicitly set provider
  llmTokenUsage: createMockTokenUsage(),
  llmCostEstimateSummary: {
    totalEstimatedCost: 0.001,
    details: [
      {
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        available: true,
        estimatedCost: 0.001,
      },
    ],
  },
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CourseRetrievalRunnerService - Deduplication', () => {
  let service: CourseRetrievalRunnerService;
  let judgeEvaluator: CourseRetrieverEvaluator;
  let tempDir: string;

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    // Create mock evaluator
    const mockJudgeEvaluator = {
      evaluate: jest
        .fn()
        .mockImplementation(({ skill, retrievedCourses }) =>
          Promise.resolve(
            createMockEvaluatorOutput(skill, retrievedCourses.length),
          ),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRetrievalRunnerService,
        CourseRetrievalResultManagerService,
        {
          provide: CourseRetrieverEvaluator,
          useValue: mockJudgeEvaluator,
        },
      ],
    })
      .overrideProvider(CourseRetrievalResultManagerService)
      .useFactory({
        factory: () => {
          return new CourseRetrievalResultManagerService(tempDir);
        },
      })
      .overrideProvider(CourseRetrievalRunnerService)
      .useFactory({
        factory: (resultManager) => {
          return new CourseRetrievalRunnerService(
            mockJudgeEvaluator as unknown as CourseRetrieverEvaluator,
            resultManager,
            tempDir,
          );
        },
        inject: [CourseRetrievalResultManagerService],
      })
      .compile();

    service = module.get<CourseRetrievalRunnerService>(
      CourseRetrievalRunnerService,
    );
    judgeEvaluator = module.get<CourseRetrieverEvaluator>(
      CourseRetrieverEvaluator,
    );
  });

  afterEach(async () => {
    await FileHelper.deleteDirectory(tempDir);
  });

  describe('Cross-question deduplication', () => {
    it('should group test cases by skill correctly', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-dedupe',
        description: 'Test deduplication',
        cases: testCases,
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - evaluate should be called only 3 times:
      // - 1 call for Python programming (test-001, test-002, test-003)
      // - 1 call for Java programming (test-004)
      // - 1 call for Advanced programming (test-005)
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(3);

      // Verify we have 3 records (one per unique skill)
      const recordsPath = path.join(
        tempDir,
        'test-dedupe',
        'records',
        'records-iteration-1.json',
      );
      const records = await FileHelper.loadJson<unknown[]>(recordsPath);
      expect(records).toHaveLength(3); // One record per unique skill

      // Verify the Python programming record has all 3 question IDs
      const pythonRecord = records.find(
        (r) => (r as { skill: string }).skill === 'Python programming',
      );
      expect(pythonRecord).toBeDefined();
      expect((pythonRecord as { questionIds: string[] }).questionIds).toEqual(
        expect.arrayContaining(['test-001', 'test-002', 'test-003']),
      );
    });

    it('should skip evaluation for already completed deduplication groups', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-resume',
        description: 'Test resume with dedupe',
        cases: testCases,
      };

      // Act - First run
      await service.runTestSet({ testSet, iterationNumber: 1 });
      const _firstRunCallCount = (judgeEvaluator.evaluate as jest.Mock).mock
        .calls.length;

      // Reset mock
      (judgeEvaluator.evaluate as jest.Mock).mockClear();

      // Act - Second run (should skip all)
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - no new evaluations should occur
      expect(judgeEvaluator.evaluate).not.toHaveBeenCalled();

      // Verify records still contain all 3 unique skills
      const recordsPath = path.join(
        tempDir,
        'test-resume',
        'records',
        'records-iteration-1.json',
      );
      const records = await FileHelper.loadJson<unknown[]>(recordsPath);
      expect(records).toHaveLength(3); // One record per unique skill
    });

    it('should log deduplication statistics correctly', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-stats',
        description: 'Test dedupe statistics',
        cases: testCases,
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - verify deduplication statistics in progress file
      const progressPath = path.join(
        tempDir,
        'test-stats',
        'progress',
        'progress-iteration-1.json',
      );
      const progress = await FileHelper.loadJson<{
        deduplicationStats?: {
          totalQuestions: number;
          totalSkillsExtracted: number;
          uniqueSkillsEvaluated: number;
          deduplicationRate: number;
          skillFrequency: Record<string, number>;
        };
      }>(progressPath);

      expect(progress.deduplicationStats).toBeDefined();
      expect(progress.deduplicationStats!.totalQuestions).toBe(5);
      expect(progress.deduplicationStats!.totalSkillsExtracted).toBe(5);
      expect(progress.deduplicationStats!.uniqueSkillsEvaluated).toBe(3);
      expect(progress.deduplicationStats!.deduplicationRate).toBeCloseTo(
        0.4,
        1,
      ); // (5-3)/5 = 40% reduction
      expect(
        progress.deduplicationStats!.skillFrequency['Python programming'],
      ).toBe(3);
      expect(
        progress.deduplicationStats!.skillFrequency['Java programming'],
      ).toBe(1);
      expect(
        progress.deduplicationStats!.skillFrequency['Advanced programming'],
      ).toBe(1);
    });
  });

  describe('Hash consistency for deduplication', () => {
    it('should generate consistent dedupe keys for same (skill, courses)', () => {
      // Arrange
      const course = createMockCourseInfo({
        subjectCode: 'CS101',
        subjectName: 'Python',
      });

      const testCase1: CourseRetrieverTestCase = {
        id: 'test-001',
        question: 'Question 1?',
        skill: 'Python',
        retrievedCourses: [course],
      };

      const testCase2: CourseRetrieverTestCase = {
        id: 'test-002',
        question: 'Question 2?',
        skill: 'Python',
        retrievedCourses: [course],
      };

      // Act
      const hash1 = EvaluationHashUtil.hashCourses(testCase1.retrievedCourses);
      const hash2 = EvaluationHashUtil.hashCourses(testCase2.retrievedCourses);

      // Assert - same courses should produce same hash
      expect(hash1).toBe(hash2);
    });

    it('should generate different dedupe keys for different courses', () => {
      // Arrange
      const course1 = createMockCourseInfo({
        subjectCode: 'CS101',
        subjectName: 'Python',
      });

      const course2 = createMockCourseInfo({
        subjectCode: 'CS201',
        subjectName: 'Java',
      });

      const testCase1: CourseRetrieverTestCase = {
        id: 'test-001',
        question: 'Question 1?',
        skill: 'Programming',
        retrievedCourses: [course1],
      };

      const testCase2: CourseRetrieverTestCase = {
        id: 'test-002',
        question: 'Question 2?',
        skill: 'Programming',
        retrievedCourses: [course2],
      };

      // Act
      const hash1 = EvaluationHashUtil.hashCourses(testCase1.retrievedCourses);
      const hash2 = EvaluationHashUtil.hashCourses(testCase2.retrievedCourses);

      // Assert - different courses should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash regardless of course order', () => {
      // Arrange
      const course1 = createMockCourseInfo({
        subjectCode: 'CS101',
        subjectName: 'Python',
      });

      const course2 = createMockCourseInfo({
        subjectCode: 'CS201',
        subjectName: 'Java',
      });

      const testCase1: CourseRetrieverTestCase = {
        id: 'test-001',
        question: 'Question?',
        skill: 'Programming',
        retrievedCourses: [course1, course2],
      };

      const testCase2: CourseRetrieverTestCase = {
        id: 'test-002',
        question: 'Question?',
        skill: 'Programming',
        retrievedCourses: [course2, course1], // Different order
      };

      // Act
      const hash1 = EvaluationHashUtil.hashCourses(testCase1.retrievedCourses);
      const hash2 = EvaluationHashUtil.hashCourses(testCase2.retrievedCourses);

      // Assert - order should not affect hash
      expect(hash1).toBe(hash2);
    });
  });

  describe('Progress tracking with deduplication', () => {
    it('should save progress entries with hash and questionIds', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-progress',
        description: 'Test progress with dedupe',
        cases: testCases,
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert
      const progressPath = path.join(
        tempDir,
        'test-progress',
        'progress',
        'progress-iteration-1.json',
      );
      const progress = await FileHelper.loadJson<{
        entries: Array<{
          hash: string;
          skill: string;
          questionIds: string[];
          occurrenceCount: number;
          completedAt: string;
        }>;
      }>(progressPath);

      // Should have 3 entries (one per unique skill)
      expect(progress.entries).toHaveLength(3);

      // Verify each entry has required fields
      progress.entries.forEach((entry) => {
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(entry.skill).toBeDefined();
        expect(Array.isArray(entry.questionIds)).toBe(true);
        expect(entry.questionIds.length).toBeGreaterThan(0);
        expect(entry.occurrenceCount).toBeGreaterThan(0);
        expect(entry.completedAt).toBeDefined();
      });

      // Verify the Python programming entry has 3 question IDs
      const pythonEntry = progress.entries.find(
        (e) => e.skill === 'Python programming',
      );
      expect(pythonEntry).toBeDefined();
      expect(pythonEntry!.questionIds).toHaveLength(3);
      expect(pythonEntry!.questionIds).toContain('test-001');
      expect(pythonEntry!.questionIds).toContain('test-002');
      expect(pythonEntry!.questionIds).toContain('test-003');
      expect(pythonEntry!.occurrenceCount).toBe(3);
    });
  });

  describe('Cached results for deduplicated groups', () => {
    it('should create cached results for all question IDs in skill group', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-cache',
        description: 'Test cached results',
        cases: testCases,
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - verify records file contains 3 records (one per unique skill)
      const recordsPath = path.join(
        tempDir,
        'test-cache',
        'records',
        'records-iteration-1.json',
      );
      const records = await FileHelper.loadJson<
        Array<{
          questionIds: string[];
          skill: string;
          llmModel: string;
          llmProvider: string;
        }>
      >(recordsPath);

      expect(records).toHaveLength(3);

      // Verify the Python programming record has all 3 question IDs
      const pythonRecord = records.find(
        (r) => r.skill === 'Python programming',
      );
      expect(pythonRecord).toBeDefined();
      expect(pythonRecord!.questionIds).toHaveLength(3);
      expect(pythonRecord!.questionIds).toContain('test-001');
      expect(pythonRecord!.questionIds).toContain('test-002');
      expect(pythonRecord!.questionIds).toContain('test-003');

      // Should have evaluation metrics (from single LLM call)
      expect(pythonRecord!.llmModel).toBe('gpt-4');
      expect(pythonRecord!.llmProvider).toBe('openai');
    });
  });

  describe('Crash recovery with deduplication', () => {
    it('should resume from last completed deduplication group', async () => {
      // Arrange
      const testCases = createDedupeTestCases();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-crash',
        description: 'Test crash recovery with dedupe',
        cases: testCases,
      };

      let callCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated crash');
        }
        return Promise.resolve(
          createMockEvaluatorOutput('Python programming', 1),
        );
      });

      // Act & Assert - First run: crash after 1 group
      // With Promise.allSettled, errors are isolated, so the run completes
      await service.runTestSet({ testSet, iterationNumber: 1 });
      expect(callCount).toBe(3); // All 3 attempted (2 succeeded, 1 failed)

      // Verify progress has 2 entries (2 successful groups, 1 failed)
      const progressPath = path.join(
        tempDir,
        'test-crash',
        'progress',
        'progress-iteration-1.json',
      );
      const progress = await FileHelper.loadJson<{
        entries: unknown[];
      }>(progressPath);
      expect(progress.entries).toHaveLength(2);

      // Resume - complete remaining groups
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(() =>
        Promise.resolve(createMockEvaluatorOutput('Java programming', 1)),
      );

      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - should have 3 records total (one per unique skill)
      const recordsPath = path.join(
        tempDir,
        'test-crash',
        'records',
        'records-iteration-1.json',
      );
      const records = await FileHelper.loadJson<unknown[]>(recordsPath);
      expect(records).toHaveLength(3); // One record per unique skill
    });
  });

  describe('Deduplication edge cases', () => {
    it('should handle empty test set', async () => {
      // Arrange
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-empty',
        description: 'Test empty dedupe',
        cases: [],
      };

      // Act & Assert - should not throw
      await service.runTestSet({ testSet, iterationNumber: 1 });

      expect(judgeEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should handle single test case', async () => {
      // Arrange
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-single',
        description: 'Test single dedupe',
        cases: [
          {
            id: 'test-001',
            question: 'Question?',
            skill: 'Python',
            retrievedCourses: [createMockCourseInfo()],
          },
        ],
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(1);
    });

    it('should handle all test cases with same skill', async () => {
      // Arrange - all 5 test cases have same skill
      const course = createMockCourseInfo();
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-all-same',
        description: 'Test all same dedupe',
        cases: Array.from({ length: 5 }, (_, i) => ({
          id: `test-${i}`,
          question: `Question ${i}?`,
          skill: 'Python',
          retrievedCourses: [course],
        })),
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - should only evaluate once (one skill)
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(1);

      // Should have 1 record with all 5 question IDs
      const recordsPath = path.join(
        tempDir,
        'test-all-same',
        'records',
        'records-iteration-1.json',
      );
      const records =
        await FileHelper.loadJson<
          Array<{ questionIds: string[]; skill: string }>
        >(recordsPath);
      expect(records).toHaveLength(1);
      expect(records[0].questionIds).toHaveLength(5);
      expect(records[0].skill).toBe('Python');
    });

    it('should handle all test cases with different (skill, courses)', async () => {
      // Arrange - all 5 test cases have different skill/courses
      const testSet: CourseRetrieverTestSet = {
        version: 1,
        name: 'test-all-different',
        description: 'Test all different dedupe',
        cases: Array.from({ length: 5 }, (_, i) => ({
          id: `test-${i}`,
          question: `Question ${i}?`,
          skill: `Skill ${i}`,
          retrievedCourses: [
            createMockCourseInfo({
              subjectCode: `CS${i}`,
              subjectName: `Course ${i}`,
            }),
          ],
        })),
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber: 1 });

      // Assert - should evaluate all 5 (no deduplication possible)
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(5);
    });
  });
});
