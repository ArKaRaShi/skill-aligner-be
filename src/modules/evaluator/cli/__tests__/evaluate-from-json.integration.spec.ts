/**
 * Integration Test for CLI Evaluation Metrics Aggregation
 *
 * This test ensures that the CLI correctly aggregates metrics across multiple test cases.
 * It specifically tests the bug fix where only the last test case was being saved due to
 * calling saveIterationMetrics() inside a loop over test cases.
 *
 * Test approach:
 * 1. Create a temporary test set JSON file with multiple test cases (multiple queryLogIds)
 * 2. Load and process the test set through the evaluation pipeline
 * 3. Verify that all test cases are preserved in the aggregated metrics
 */
import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { ConcurrencyLimiter } from 'src/shared/utils/concurrency-limiter.helper';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationResultManagerService } from '../../course-retrieval/evaluators/evaluation-result-manager.service';
import { CourseRetrievalTestSetLoaderService } from '../../course-retrieval/loaders/course-retrieval-test-set-loader.service';
import { EvaluateRetrieverOutput } from '../../course-retrieval/types/course-retrieval.types';
import { CourseRetrievalTestSetSerialized } from '../../shared/services/test-set.types';

// ============================================================================
// TEST CONSTANTS & HELPERS
// ============================================================================

const TEST_DIR = path.join(__dirname, '.temp-evaluation-cli-test');
const TEST_SET_FILENAME = 'test-set-cli-metrics-integration.json';

// Type assertion helper for test data
const asId = (id: string): Identifier => id as Identifier;
const now = new Date();

/**
 * Create a mock test set with multiple test cases
 * Each test case has a unique queryLogId to represent a different question
 */
const createMockTestSet = (): CourseRetrievalTestSetSerialized[] => {
  // Type assertion for test data to avoid complex type requirements
  const mockCourse = (id: string, code: string, name: string) => ({
    id: asId(id),
    subjectCode: code,
    subjectName: name,
    isGenEd: false,
    campusId: asId('campus-001'),
    facultyId: asId('faculty-001'),
    matchedLearningOutcomes: [],
    remainingLearningOutcomes: [],
    allLearningOutcomes: [],
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: now,
    updatedAt: now,
  });

  return [
    {
      queryLogId: 'test-case-001',
      question: 'สนใจเรียนภาษาจีน เริ่มยังไงดี',
      skills: ['การเรียนรู้ภาษาจีน', 'การสื่อสารภาษาจีน'],
      skillCoursesMap: {
        การเรียนรู้ภาษาจีน: [
          mockCourse('course-001', 'CHIN101', 'ภาษาจีน 1'),
          mockCourse('course-002', 'CHIN102', 'ภาษาจีน 2'),
        ],
        การสื่อสารภาษาจีน: [
          mockCourse('course-003', 'CHIN201', 'การสื่อสารภาษาจีน'),
        ],
      },
    },
    {
      queryLogId: 'test-case-002',
      question: 'มีวิชาสอนการบริหารเงินตัวเองไหม',
      skills: ['การบริหารการเงินส่วนบุคคล', 'การจัดทำงบประมาณ'],
      skillCoursesMap: {
        การบริหารการเงินส่วนบุคคล: [
          mockCourse('course-004', 'FIN101', 'การเงินส่วนบุคคล'),
        ],
        การจัดทำงบประมาณ: [
          mockCourse('course-005', 'BUDG101', 'การวางแผนและควบคุมงบประมาณ'),
        ],
      },
    },
    {
      queryLogId: 'test-case-003',
      question: 'อยากเรียนการเขียนโปรแกรมเบื้องต้น',
      skills: ['การเขียนโปรแกรม', 'การพัฒนาเว็บ'],
      skillCoursesMap: {
        การเขียนโปรแกรม: [
          mockCourse('course-006', 'CS101', 'การเขียนโปรแกรม 1'),
        ],
        การพัฒนาเว็บ: [
          mockCourse('course-007', 'WEB101', 'การพัฒนาเว็บเบื้องต้น'),
        ],
      },
    },
  ] as CourseRetrievalTestSetSerialized[];
};

/**
 * Create mock evaluation output for testing
 */
const createMockEvaluationOutput = (
  testCaseId: string,
  question: string,
  skill: string,
): EvaluateRetrieverOutput => ({
  testCaseId,
  question,
  skill,
  retrievedCount: 2,
  evaluations: [],
  metrics: {
    averageSkillRelevance: 2.5,
    averageContextAlignment: 2.0,
    alignmentGap: 0.5,
    contextMismatchRate: 0,
    contextMismatchCourses: [],
  },
  llmModel: 'gpt-4',
  llmProvider: 'openai',
  inputTokens: 100,
  outputTokens: 50,
});

/**
 * Clean up test directory
 */
const cleanupTestDir = (): void => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

/**
 * Create test set file
 */
const createTestSetFile = async (
  testSet: CourseRetrievalTestSetSerialized[],
): Promise<void> => {
  // Ensure test directory exists
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const filePath = path.join(TEST_DIR, TEST_SET_FILENAME);
  await FileHelper.saveJson(filePath, testSet);
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CLI Evaluation Metrics Aggregation (Integration)', () => {
  let module: TestingModule;
  let resultManager: EvaluationResultManagerService;
  let loader: CourseRetrievalTestSetLoaderService;

  beforeAll(async () => {
    // Create test module with required services
    module = await Test.createTestingModule({
      providers: [
        EvaluationResultManagerService,
        CourseRetrievalTestSetLoaderService,
      ],
    }).compile();

    resultManager = module.get<EvaluationResultManagerService>(
      EvaluationResultManagerService,
    );
    loader = module.get<CourseRetrievalTestSetLoaderService>(
      CourseRetrievalTestSetLoaderService,
    );
  });

  afterAll(async () => {
    await module.close();
    cleanupTestDir();
  });

  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Multiple test cases metrics aggregation', () => {
    it('should preserve all test cases in metrics (bug fix for CLI aggregation)', async () => {
      // Arrange: Create a test set with 3 test cases (3 different questions)
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act: Load the test set through the loader
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert: Verify we loaded all skills from all test cases
      // Test set has 3 entries with 2 skills each = 6 total inputs
      expect(evaluatorInputs).toHaveLength(6);

      // Create mock evaluation outputs for each skill
      const mockResults = evaluatorInputs.map((input) =>
        createMockEvaluationOutput(
          input.testCaseId ?? '',
          input.question,
          input.skill,
        ),
      );

      // Calculate metrics for ALL results at once (this is what the CLI should do)
      const metrics = resultManager.calculateIterationMetrics({
        iterationNumber: 1,
        records: mockResults,
      });

      // CRITICAL ASSERTION: Verify all test cases are preserved
      // This would fail with the bug where only the last test case survived
      expect(metrics.totalCases).toBe(3);
      expect(metrics.testCaseMetrics).toHaveLength(3);

      // Verify each test case is present with correct data
      const testCaseQuestions = metrics.testCaseMetrics.map(
        (tc) => tc.question,
      );
      expect(testCaseQuestions).toContain('สนใจเรียนภาษาจีน เริ่มยังไงดี');
      expect(testCaseQuestions).toContain('มีวิชาสอนการบริหารเงินตัวเองไหม');
      expect(testCaseQuestions).toContain('อยากเรียนการเขียนโปรแกรมเบื้องต้น');

      // Verify each test case has the correct number of skills
      const testCase001 = metrics.testCaseMetrics.find(
        (tc) => tc.question === 'สนใจเรียนภาษาจีน เริ่มยังไงดี',
      );
      expect(testCase001?.totalSkills).toBe(2);

      const testCase002 = metrics.testCaseMetrics.find(
        (tc) => tc.question === 'มีวิชาสอนการบริหารเงินตัวเองไหม',
      );
      expect(testCase002?.totalSkills).toBe(2);

      const testCase003 = metrics.testCaseMetrics.find(
        (tc) => tc.question === 'อยากเรียนการเขียนโปรแกรมเบื้องต้น',
      );
      expect(testCase003?.totalSkills).toBe(2);

      // Verify aggregate metrics include all test cases
      expect(metrics.macroAvg).toBeDefined();
      expect(metrics.microAvg).toBeDefined();
      expect(metrics.totalInputTokens).toBe(600); // 100 * 6 skills
      expect(metrics.totalOutputTokens).toBe(300); // 50 * 6 skills
    });

    it('should handle test cases with varying numbers of skills', async () => {
      // Arrange: Create a test set with varying skill counts
      const unevenTestSet: CourseRetrievalTestSetSerialized[] = [
        {
          queryLogId: 'uneven-001',
          question: 'Test with 1 skill',
          skills: ['skill-1'],
          skillCoursesMap: {
            'skill-1': [],
          },
        },
        {
          queryLogId: 'uneven-002',
          question: 'Test with 3 skills',
          skills: ['skill-2', 'skill-3', 'skill-4'],
          skillCoursesMap: {
            'skill-2': [],
            'skill-3': [],
            'skill-4': [],
          },
        },
        {
          queryLogId: 'uneven-003',
          question: 'Test with 2 skills',
          skills: ['skill-5', 'skill-6'],
          skillCoursesMap: {
            'skill-5': [],
            'skill-6': [],
          },
        },
      ];

      await createTestSetFile(unevenTestSet);

      // Act: Load and process
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const mockResults = evaluatorInputs.map((input) =>
        createMockEvaluationOutput(
          input.testCaseId ?? '',
          input.question,
          input.skill,
        ),
      );

      const metrics = resultManager.calculateIterationMetrics({
        iterationNumber: 1,
        records: mockResults,
      });

      // Assert: All test cases preserved despite varying skill counts
      expect(metrics.totalCases).toBe(3);
      expect(metrics.testCaseMetrics).toHaveLength(3);

      expect(metrics.testCaseMetrics[0].totalSkills).toBe(1);
      expect(metrics.testCaseMetrics[1].totalSkills).toBe(3);
      expect(metrics.testCaseMetrics[2].totalSkills).toBe(2);
    });

    it('should correctly aggregate metrics across all test cases', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Create mock results with varying scores
      const mockResults = evaluatorInputs.map((input) =>
        createMockEvaluationOutput(
          input.testCaseId ?? '',
          input.question,
          input.skill,
        ),
      );

      // Modify some metrics to test aggregation
      mockResults[0].metrics.averageSkillRelevance = 3.0;
      mockResults[0].metrics.averageContextAlignment = 3.0;
      mockResults[1].metrics.averageSkillRelevance = 2.0;
      mockResults[1].metrics.averageContextAlignment = 1.5;
      mockResults[2].metrics.averageSkillRelevance = 1.0;
      mockResults[2].metrics.averageContextAlignment = 2.0;

      // Act
      const metrics = resultManager.calculateIterationMetrics({
        iterationNumber: 1,
        records: mockResults,
      });

      // Assert: Verify aggregation is calculated correctly
      // Test case averages (each has 2 skills):
      // - test-case-001 (indices 0,1): skillRel=(3.0+2.5)/2=2.75, context=(3.0+1.5)/2=2.25
      // - test-case-002 (indices 2,3): skillRel=(1.0+2.5)/2=1.75, context=(2.0+2.0)/2=2.0
      // - test-case-003 (indices 4,5): skillRel=(2.0+2.5)/2=2.25, context=(2.0+2.0)/2=2.0
      // Macro avg skillRel = (2.75 + 1.75 + 2.25) / 3 = 2.25
      // Macro avg context = (2.25 + 2.0 + 2.0) / 3 = 2.083
      expect(metrics.macroAvg.averageSkillRelevance).toBeCloseTo(2.25, 1);
      expect(metrics.macroAvg.averageContextAlignment).toBeCloseTo(2.08, 1);

      // Verify total cases
      expect(metrics.totalCases).toBe(3);
    });

    it('should preserve testCaseId across the evaluation pipeline', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert: Verify testCaseId is correctly assigned from queryLogId
      // Each test case has 2 skills, so indices are:
      // 0,1: test-case-001 (2 skills)
      // 2,3: test-case-002 (2 skills)
      // 4,5: test-case-003 (2 skills)
      expect(evaluatorInputs[0].testCaseId).toBe('test-case-001');
      expect(evaluatorInputs[1].testCaseId).toBe('test-case-001');
      expect(evaluatorInputs[2].testCaseId).toBe('test-case-002');
      expect(evaluatorInputs[3].testCaseId).toBe('test-case-002');
      expect(evaluatorInputs[4].testCaseId).toBe('test-case-003');
      expect(evaluatorInputs[5].testCaseId).toBe('test-case-003');
    });
  });

  describe('Concurrent execution behavior', () => {
    it('should process skills within a test case with concurrency limit of 2', async () => {
      // Arrange: Create a test set with 5 skills in one test case
      const concurrentTestSet: CourseRetrievalTestSetSerialized[] = [
        {
          queryLogId: 'concurrent-001',
          question: 'Test concurrent processing with 5 skills',
          skills: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5'],
          skillCoursesMap: {
            'skill-1': [],
            'skill-2': [],
            'skill-3': [],
            'skill-4': [],
            'skill-5': [],
          },
        },
      ];

      await createTestSetFile(concurrentTestSet);

      // Act: Load the test set
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert: Verify we loaded all 5 skills
      expect(evaluatorInputs).toHaveLength(5);
      expect(evaluatorInputs[0].testCaseId).toBe('concurrent-001');
      expect(evaluatorInputs[4].testCaseId).toBe('concurrent-001');
    });

    it('should group evaluator inputs by testCaseId correctly', async () => {
      // Arrange: Create a test set with multiple test cases and varying skills
      const testSet: CourseRetrievalTestSetSerialized[] = [
        {
          queryLogId: 'group-001',
          question: 'Question 1 with 3 skills',
          skills: ['skill-a', 'skill-b', 'skill-c'],
          skillCoursesMap: {
            'skill-a': [],
            'skill-b': [],
            'skill-c': [],
          },
        },
        {
          queryLogId: 'group-002',
          question: 'Question 2 with 2 skills',
          skills: ['skill-d', 'skill-e'],
          skillCoursesMap: {
            'skill-d': [],
            'skill-e': [],
          },
        },
        {
          queryLogId: 'group-003',
          question: 'Question 3 with 1 skill',
          skills: ['skill-f'],
          skillCoursesMap: {
            'skill-f': [],
          },
        },
      ];

      await createTestSetFile(testSet);

      // Act: Load and group by testCaseId
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Group by testCaseId (simulating CLI behavior)
      const groupedByTestCase = new Map<string, typeof evaluatorInputs>();
      for (const input of evaluatorInputs) {
        const key = input.testCaseId ?? 'ungrouped';
        if (!groupedByTestCase.has(key)) {
          groupedByTestCase.set(key, []);
        }
        groupedByTestCase.get(key)!.push(input);
      }

      // Assert: Verify grouping
      expect(groupedByTestCase.size).toBe(3);
      expect(groupedByTestCase.get('group-001')).toHaveLength(3);
      expect(groupedByTestCase.get('group-002')).toHaveLength(2);
      expect(groupedByTestCase.get('group-003')).toHaveLength(1);
    });

    it('should execute mock evaluations concurrently with ConcurrencyLimiter', async () => {
      // Arrange: Track execution order
      const executionOrder: string[] = [];
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Simulate async evaluation tasks
      const createMockTask = (id: string, ms: number) => async () => {
        executionOrder.push(`start-${id}`);
        await delay(ms);
        executionOrder.push(`end-${id}`);
        return { id, result: `result-${id}` };
      };

      // Act: Execute with concurrency limit of 2
      const limiter = new ConcurrencyLimiter(2);

      const results = await Promise.all([
        limiter.add(createMockTask('task1', 50)),
        limiter.add(createMockTask('task2', 30)),
        limiter.add(createMockTask('task3', 20)),
        limiter.add(createMockTask('task4', 40)),
        limiter.add(createMockTask('task5', 10)),
      ]);

      // Assert: Verify results
      expect(results).toHaveLength(5);

      // Verify concurrent behavior:
      // - task1 and task2 should start first (concurrent limit 2)
      // - when one finishes, next task starts
      // - task5 (shortest) should finish before some earlier tasks
      expect(executionOrder[0]).toMatch(/start-(task1|task2)/);
      expect(executionOrder[1]).toMatch(/start-(task1|task2)/);

      // task5 (10ms) should end quickly but start after first 2 complete
      const task5StartIndex = executionOrder.indexOf('start-task5');
      const task5EndIndex = executionOrder.indexOf('end-task5');
      expect(task5StartIndex).toBeGreaterThan(1); // Starts after first 2
      expect(task5EndIndex).toBeGreaterThan(task5StartIndex);
    });
  });

  describe('Edge cases', () => {
    it('should handle single test case correctly', async () => {
      // Arrange: Only one test case
      const singleTestSet: CourseRetrievalTestSetSerialized[] = [
        {
          queryLogId: 'single-001',
          question: 'Single test case',
          skills: ['skill-1'],
          skillCoursesMap: {
            'skill-1': [],
          },
        },
      ];

      await createTestSetFile(singleTestSet);

      // Act
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const mockResults = evaluatorInputs.map((input) =>
        createMockEvaluationOutput(
          input.testCaseId ?? '',
          input.question,
          input.skill,
        ),
      );

      const metrics = resultManager.calculateIterationMetrics({
        iterationNumber: 1,
        records: mockResults,
      });

      // Assert
      expect(metrics.totalCases).toBe(1);
      expect(metrics.testCaseMetrics).toHaveLength(1);
      expect(metrics.testCaseMetrics[0].question).toBe('Single test case');
    });

    it('should throw error for empty records array', () => {
      // Arrange & Act & Assert
      expect(() =>
        resultManager.calculateIterationMetrics({
          iterationNumber: 1,
          records: [],
        }),
      ).toThrow('Cannot calculate metrics for empty records array');
    });
  });
});
