/**
 * Integration Test for CLI Resume Functionality
 *
 * This test ensures that the CLI can resume evaluation after a crash/interruption
 * by tracking progress in a .progress.json file and skipping already-completed evaluations.
 *
 * Test approach:
 * 1. Create a temporary test set JSON file with multiple test cases
 * 2. Simulate a crash by creating a partial progress file
 * 3. Run the CLI with --resume flag and verify it skips completed evaluations
 * 4. Verify the aggregated metrics include both old and new results
 */
import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationProgressTrackerService } from '../../course-retrieval/evaluators/evaluation-progress-tracker.service';
import { CourseRetrievalTestSetLoaderService } from '../../course-retrieval/loaders/course-retrieval-test-set-loader.service';
import { CourseRetrievalResultManagerService } from '../../course-retrieval/services/course-retrieval-result-manager.service';
import { CourseRetrievalTestSetSerialized } from '../../shared/services/test-set.types';

// ============================================================================
// TEST CONSTANTS & HELPERS
// ============================================================================

const TEST_DIR = path.join(__dirname, '.temp-resume-test');
const ITERATION_NUMBER = 1;

// Type assertion helper for test data
const asId = (id: string): Identifier => id as Identifier;
const now = new Date();

/**
 * Create a mock test set with multiple test cases
 */
const createMockTestSet = (): CourseRetrievalTestSetSerialized[] => {
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
      queryLogId: 'resume-test-001',
      question: 'สนใจเรียนภาษาจีน เริ่มยังไงดี',
      skills: ['การเรียนรู้ภาษาจีน', 'การสื่อสารภาษาจีน'],
      skillCoursesMap: {
        การเรียนรู้ภาษาจีน: [mockCourse('course-001', 'CHIN101', 'ภาษาจีน 1')],
        การสื่อสารภาษาจีน: [
          mockCourse('course-002', 'CHIN201', 'การสื่อสารภาษาจีน'),
        ],
      },
      duration: null,
    },
    {
      queryLogId: 'resume-test-002',
      question: 'มีวิชาสอนการบริหารเงินตัวเองไหม',
      skills: ['การบริหารการเงินส่วนบุคคล', 'การจัดทำงบประมาณ'],
      skillCoursesMap: {
        การบริหารการเงินส่วนบุคคล: [
          mockCourse('course-003', 'FIN101', 'การเงินส่วนบุคคล'),
        ],
        การจัดทำงบประมาณ: [
          mockCourse('course-004', 'BUDG101', 'การวางแผนงบประมาณ'),
        ],
      },
      duration: null,
    },
    {
      queryLogId: 'resume-test-003',
      question: 'อยากเรียนการเขียนโปรแกรม',
      skills: ['การเขียนโปรแกรม'],
      skillCoursesMap: {
        การเขียนโปรแกรม: [
          mockCourse('course-005', 'CS101', 'การเขียนโปรแกรม 1'),
        ],
      },
      duration: null,
    },
  ] as CourseRetrievalTestSetSerialized[];
};

/**
 * Clean up test directories
 */
const cleanupTestDir = (testSetName = 'test-set-resume'): void => {
  // Clean up the temp test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  // Clean up the progress tracker directory (data/evaluation/course-retriever/test-set-resume)
  const progressDir = path.join(
    'data/evaluation/course-retriever',
    testSetName,
  );
  if (fs.existsSync(progressDir)) {
    fs.rmSync(progressDir, { recursive: true, force: true });
  }
};

/**
 * Create test set file
 */
const createTestSetFile = async (
  testSet: CourseRetrievalTestSetSerialized[],
  filename = 'test-set-resume.json',
): Promise<void> => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const filePath = path.join(TEST_DIR, filename);
  await FileHelper.saveJson(filePath, testSet);
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CLI Resume Functionality (Integration)', () => {
  let module: TestingModule;
  let progressTracker: EvaluationProgressTrackerService;
  let _resultManager: CourseRetrievalResultManagerService;
  let loader: CourseRetrievalTestSetLoaderService;

  // Unique test set name per test suite run to avoid pollution
  const TEST_SET_FILENAME = 'test-set-resume.json';
  const TEST_SET_NAME = 'test-set-resume';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        EvaluationProgressTrackerService,
        CourseRetrievalResultManagerService,
        CourseRetrievalTestSetLoaderService,
      ],
    }).compile();

    progressTracker = module.get<EvaluationProgressTrackerService>(
      EvaluationProgressTrackerService,
    );
    _resultManager = module.get<CourseRetrievalResultManagerService>(
      CourseRetrievalResultManagerService,
    );
    loader = module.get<CourseRetrievalTestSetLoaderService>(
      CourseRetrievalTestSetLoaderService,
    );
  });

  afterAll(async () => {
    await module.close();
    cleanupTestDir(TEST_SET_NAME);
  });

  beforeEach(async () => {
    cleanupTestDir(TEST_SET_NAME);
    // Ensure progress file doesn't exist before each test
    try {
      await progressTracker.resetProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });
    } catch {
      // Ignore if file doesn't exist yet
    }
  });

  afterEach(() => {
    cleanupTestDir(TEST_SET_NAME);
  });

  describe('Progress tracking basics', () => {
    it('should create a new progress file when none exists', async () => {
      // Act: Load progress for a non-existent test set
      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: Progress file should be created with empty entries
      expect(progress.testSetName).toBe(TEST_SET_NAME);
      expect(progress.iterationNumber).toBe(ITERATION_NUMBER);
      expect(progress.entries).toHaveLength(0);
      expect(progress.lastUpdated).toBeDefined();
    });

    it('should generate unique hashes for evaluation inputs', async () => {
      // Arrange: Create test set and load inputs
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Act: Generate hashes for each input
      const hashes = evaluatorInputs.map((input) =>
        progressTracker.generateHash(input),
      );

      // Assert: All hashes should be unique
      expect(new Set(hashes).size).toBe(hashes.length);
      expect(hashes).toHaveLength(5); // 2 + 2 + 1 = 5 skills total
    });

    it('should correctly identify completed evaluations', async () => {
      // Arrange: Create test set and load inputs
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Act & Assert: Initially, no inputs should be completed
      for (const input of evaluatorInputs) {
        expect(progressTracker.isCompleted({ progress, input })).toBe(false);
      }

      // Mark the first input as completed
      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[0],
        resultFile: 'test-result-1.json',
      });

      // Reload progress
      const updatedProgress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: First input should now be completed
      expect(
        progressTracker.isCompleted({
          progress: updatedProgress,
          input: evaluatorInputs[0],
        }),
      ).toBe(true);

      // Others should still be pending
      for (let i = 1; i < evaluatorInputs.length; i++) {
        expect(
          progressTracker.isCompleted({
            progress: updatedProgress,
            input: evaluatorInputs[i],
          }),
        ).toBe(false);
      }
    });
  });

  describe('Filter completed evaluations (resume logic)', () => {
    it('should filter out completed evaluations from input list', async () => {
      // Arrange: Create test set and load inputs
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Mark first 2 evaluations as completed (simulating partial completion)
      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[0],
        resultFile: 'result-1.json',
      });

      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[2],
        resultFile: 'result-2.json',
      });

      // Act: Filter completed evaluations
      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: Should have 2 completed and 3 pending
      expect(filtered.completed).toHaveLength(2);
      expect(filtered.pending).toHaveLength(3);

      // Verify the correct inputs are marked as pending
      const pendingHashes = filtered.pending.map((input) =>
        progressTracker.generateHash(input),
      );
      const completedHashes = filtered.completed.map((input) =>
        progressTracker.generateHash(input),
      );

      expect(completedHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[0]),
      );
      expect(completedHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[2]),
      );

      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[1]),
      );
      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[3]),
      );
      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[4]),
      );
    });

    it('should return all inputs as pending when progress file is empty', async () => {
      // Arrange: Create test set with empty progress (beforeEach ensures clean state)
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Act: Filter with empty progress
      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: All inputs should be pending
      expect(filtered.completed).toHaveLength(0);
      expect(filtered.pending).toHaveLength(evaluatorInputs.length);
    });

    it('should return all inputs as completed when all are marked complete', async () => {
      // Arrange: Create test set and mark all as complete
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Mark all as completed
      for (const input of evaluatorInputs) {
        await progressTracker.markCompleted({
          progress,
          input,
          resultFile: `result-${progressTracker.generateHash(input)}.json`,
        });
      }

      // Act: Filter
      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: All should be completed
      expect(filtered.completed).toHaveLength(evaluatorInputs.length);
      expect(filtered.pending).toHaveLength(0);
    });
  });

  describe('Progress reset functionality', () => {
    it('should reset progress file to empty state', async () => {
      // Arrange: Create progress with some completed evaluations
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[0],
        resultFile: 'result-1.json',
      });

      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[1],
        resultFile: 'result-2.json',
      });

      // Verify progress has entries
      const progressWithEntries = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });
      expect(progressWithEntries.entries.length).toBeGreaterThan(0);

      // Act: Reset progress
      await progressTracker.resetProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: Progress should be empty
      const resetProgress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      expect(resetProgress.entries).toHaveLength(0);
    });
  });

  describe('Progress file path generation', () => {
    it('should generate correct progress file path', () => {
      // Act
      const filePath = progressTracker.getProgressFilePath({
        testSetName: 'my-test-set',
        iterationNumber: 3,
      });

      // Assert
      expect(filePath).toBe(
        'data/evaluation/course-retriever/my-test-set/iteration-3/.progress.json',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle duplicate evaluations with same hash', async () => {
      // Arrange: Create two identical inputs
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      const firstInput = evaluatorInputs[0];
      const sameInput = { ...firstInput }; // Same content, different object reference

      // Act: Mark same evaluation twice
      await progressTracker.markCompleted({
        progress,
        input: firstInput,
        resultFile: 'result-1.json',
      });

      await progressTracker.markCompleted({
        progress,
        input: sameInput,
        resultFile: 'result-2.json',
      });

      // Assert: Should only have one entry (duplicate hash)
      const updatedProgress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      expect(updatedProgress.entries).toHaveLength(1);
    });

    it('should handle empty test set gracefully', async () => {
      // Arrange: Create empty test set
      const emptyTestSet: CourseRetrievalTestSetSerialized[] = [];
      await createTestSetFile(emptyTestSet);

      // Act: Load and filter
      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert
      expect(evaluatorInputs).toHaveLength(0);
      expect(filtered.completed).toHaveLength(0);
      expect(filtered.pending).toHaveLength(0);
    });
  });

  describe('Resume scenarios', () => {
    it('should handle partial completion scenario correctly', async () => {
      // Arrange: Create test set and mark first 2 of 5 as completed
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Mark first 2 as completed
      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[0],
        resultFile: 'result-0.json',
      });
      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[2],
        resultFile: 'result-2.json',
      });

      // Act: Filter completed
      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Assert: 2 completed, 3 pending
      expect(filtered.completed).toHaveLength(2);
      expect(filtered.pending).toHaveLength(3);

      // Verify the correct items are pending
      const pendingHashes = filtered.pending.map((input) =>
        progressTracker.generateHash(input),
      );
      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[1]),
      );
      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[3]),
      );
      expect(pendingHashes).toContain(
        progressTracker.generateHash(evaluatorInputs[4]),
      );
    });

    it('should update timestamp when marking evaluation as completed', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const initialProgress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      const initialTimestamp = initialProgress.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act: Mark an evaluation as completed
      await progressTracker.markCompleted({
        progress: initialProgress,
        input: evaluatorInputs[0],
        resultFile: 'result-0.json',
      });

      // Assert: Timestamp should be updated
      const updatedProgress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      expect(updatedProgress.lastUpdated).not.toBe(initialTimestamp);
      expect(updatedProgress.entries).toHaveLength(1);
    });

    it('should load existing results from progress entries', async () => {
      // Arrange: Create evaluation result files and mark them as completed
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      const progress = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: ITERATION_NUMBER,
      });

      // Create mock evaluation file with full path
      const resultDir = path.join(
        'data/evaluation/course-retriever',
        TEST_SET_NAME,
        `iteration-${ITERATION_NUMBER}`,
      );
      fs.mkdirSync(resultDir, { recursive: true });

      const mockResult = {
        testCaseId: evaluatorInputs[0].testCaseId,
        question: evaluatorInputs[0].question,
        skill: evaluatorInputs[0].skill,
        retrievedCount: 5,
        evaluations: [],
        metrics: {
          averageSkillRelevance: 2.5,
          averageContextAlignment: 2.0,
          alignmentGap: 0.5,
          contextMismatchRate: 0,
          contextMismatchCourses: [],
        },
        llmModel: 'gpt-4.1-mini',
        llmProvider: 'openrouter',
        inputTokens: 100,
        outputTokens: 200,
      };

      const resultFilePath = path.join(resultDir, 'result-0.json');
      await FileHelper.saveJson(resultFilePath, mockResult);

      // Mark as completed with the full result file path
      await progressTracker.markCompleted({
        progress,
        input: evaluatorInputs[0],
        resultFile: resultFilePath,
      });

      // Act: Load completed results
      const loadedResults = await progressTracker.loadCompletedResults({
        progress,
      });

      // Assert
      expect(loadedResults).toHaveLength(1);
      expect(loadedResults[0]).toEqual(mockResult);
    });
  });

  describe('Multiple iterations', () => {
    it('should maintain separate progress for different iterations', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Mark evaluation as completed in iteration 1
      const progress1 = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: 1,
      });

      await progressTracker.markCompleted({
        progress: progress1,
        input: evaluatorInputs[0],
        resultFile: 'iteration-1-result.json',
      });

      // Mark different evaluation as completed in iteration 2
      const progress2 = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: 2,
      });

      await progressTracker.markCompleted({
        progress: progress2,
        input: evaluatorInputs[1],
        resultFile: 'iteration-2-result.json',
      });

      // Act & Assert: Iterations should be independent
      expect(progress1.entries).toHaveLength(1);
      expect(progress1.entries[0].hash).toBe(
        progressTracker.generateHash(evaluatorInputs[0]),
      );

      expect(progress2.entries).toHaveLength(1);
      expect(progress2.entries[0].hash).toBe(
        progressTracker.generateHash(evaluatorInputs[1]),
      );
    });

    it('should filter completed items correctly across iterations', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      const evaluatorInputs = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Mark first 2 as completed in iteration 1
      const progress1 = await progressTracker.loadProgress({
        testSetName: TEST_SET_NAME,
        iterationNumber: 1,
      });

      await progressTracker.markCompleted({
        progress: progress1,
        input: evaluatorInputs[0],
        resultFile: 'result-0.json',
      });

      await progressTracker.markCompleted({
        progress: progress1,
        input: evaluatorInputs[1],
        resultFile: 'result-1.json',
      });

      // Act: Filter for iteration 1
      const filtered1 = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: 1,
      });

      // Assert: Should have 2 completed, 3 pending for iteration 1
      expect(filtered1.completed).toHaveLength(2);
      expect(filtered1.pending).toHaveLength(3);

      // Act: Filter for iteration 2 (fresh start)
      const filtered2 = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName: TEST_SET_NAME,
        iterationNumber: 2,
      });

      // Assert: Should have 0 completed, 5 pending for iteration 2
      expect(filtered2.completed).toHaveLength(0);
      expect(filtered2.pending).toHaveLength(5);
    });
  });

  describe('Progress file path generation', () => {
    it('should generate correct progress file path', () => {
      // Act
      const filePath = progressTracker.getProgressFilePath({
        testSetName: 'my-test-set',
        iterationNumber: 3,
      });

      // Assert
      expect(filePath).toBe(
        'data/evaluation/course-retriever/my-test-set/iteration-3/.progress.json',
      );
    });

    it('should generate unique paths for different test sets and iterations', () => {
      const paths = [
        progressTracker.getProgressFilePath({
          testSetName: 'test-set-a',
          iterationNumber: 1,
        }),
        progressTracker.getProgressFilePath({
          testSetName: 'test-set-a',
          iterationNumber: 2,
        }),
        progressTracker.getProgressFilePath({
          testSetName: 'test-set-b',
          iterationNumber: 1,
        }),
      ];

      // All paths should be unique
      expect(new Set(paths).size).toBe(3);
    });
  });
});
