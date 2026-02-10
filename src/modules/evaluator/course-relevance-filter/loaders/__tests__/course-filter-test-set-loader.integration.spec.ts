/**
 * Integration Test for CourseFilterTestSetLoaderService
 *
 * This test validates the file I/O behavior of the loader service:
 * - Loading JSON test set files from disk
 * - Filtering by queryLogId
 * - Transforming to evaluation samples via the transformer
 *
 * Test approach:
 * 1. Create temporary test set JSON files with various scenarios
 * 2. Load through the loader service
 * 3. Verify correct transformation and filtering behavior
 */
import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { CourseFilterTestSetSerialized } from '../../../shared/services/test-set.types';
import { CourseFilterTestSetLoaderService } from '../course-filter-test-set-loader.service';
import { CourseFilterTestSetTransformer } from '../course-filter-test-set-transformer.service';
import {
  createMockCourse,
  createMockTestSetEntry,
} from './fixtures/course-filter-test-set-transformer.fixtures';

// ============================================================================
// TEST CONSTANTS & HELPERS
// ============================================================================

const TEST_DIR = path.join(__dirname, '.temp-course-filter-loader-test');
const TEST_SET_FILENAME = 'course-filter-test-set-integration.json';

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
  testSet: CourseFilterTestSetSerialized[],
): Promise<void> => {
  // Ensure test directory exists
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const filePath = path.join(TEST_DIR, TEST_SET_FILENAME);
  await FileHelper.saveJson(filePath, testSet);
};

/**
 * Create a mock test set with multiple entries
 */
const createMockTestSet = (): CourseFilterTestSetSerialized[] => {
  const course1 = createMockCourse({
    subjectCode: 'CS101',
    subjectName: 'Intro to CS',
    score: 3,
    reason: 'Direct match',
  });

  const course2 = createMockCourse({
    subjectCode: 'CS102',
    subjectName: 'Data Structures',
    score: 2,
    reason: 'Partial match',
  });

  const course3 = createMockCourse({
    subjectCode: 'ENG101',
    subjectName: 'English Composition',
    score: 0,
    reason: 'Not relevant',
  });

  return [
    createMockTestSetEntry({
      queryLogId: 'query-1',
      question: 'What are the best Python courses?',
      rawOutput: {
        llmAcceptedCoursesBySkill: {
          python: [course1, course2],
        },
        llmRejectedCoursesBySkill: {
          python: [course3],
        },
        llmMissingCoursesBySkill: {},
      },
    }),
    createMockTestSetEntry({
      queryLogId: 'query-2',
      question: 'How to learn web development?',
      rawOutput: {
        llmAcceptedCoursesBySkill: {
          'web development': [course1],
        },
        llmRejectedCoursesBySkill: {
          'web development': [course3],
        },
        llmMissingCoursesBySkill: {},
      },
    }),
    createMockTestSetEntry({
      queryLogId: 'query-3',
      question: 'Teach me machine learning',
      rawOutput: {
        llmAcceptedCoursesBySkill: {
          'machine learning': [course2],
        },
        llmRejectedCoursesBySkill: {},
        llmMissingCoursesBySkill: {},
      },
    }),
  ];
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CourseFilterTestSetLoaderService (Integration)', () => {
  let module: TestingModule;
  let loader: CourseFilterTestSetLoaderService;
  let transformer: CourseFilterTestSetTransformer;

  beforeAll(async () => {
    // Create test module with required services
    module = await Test.createTestingModule({
      providers: [
        CourseFilterTestSetLoaderService,
        CourseFilterTestSetTransformer,
      ],
    }).compile();

    loader = module.get<CourseFilterTestSetLoaderService>(
      CourseFilterTestSetLoaderService,
    );
    transformer = module.get<CourseFilterTestSetTransformer>(
      CourseFilterTestSetTransformer,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('File I/O', () => {
    it('should load JSON test set file from disk', async () => {
      // Arrange: Create test set file
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act: Load through loader
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert: Verify samples loaded correctly
      expect(samples).toHaveLength(3);

      // Verify first sample
      expect(samples[0].queryLogId).toBe('query-1');
      expect(samples[0].question).toBe('What are the best Python courses?');
      expect(samples[0].courses).toHaveLength(3); // 2 accepted + 1 rejected

      // Verify courses were deduplicated by subjectCode
      const subjectCodes = samples[0].courses.map((c) => c.subjectCode);
      expect(subjectCodes).toContain('CS101');
      expect(subjectCodes).toContain('CS102');
      expect(subjectCodes).toContain('ENG101');
    });

    it('should handle filename without .json extension', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act: Load without .json extension
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME.replace('.json', ''),
        TEST_DIR,
      );

      // Assert
      expect(samples).toHaveLength(3);
    });

    it('should throw error for non-existent file', async () => {
      // Arrange & Act & Assert
      await expect(
        loader.loadForEvaluator('non-existent-file.json', TEST_DIR),
      ).rejects.toThrow();
    });
  });

  describe('Filtering', () => {
    it('should filter by queryLogId', async () => {
      // Arrange: Create test set with 3 entries
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act: Load with queryLogId filter
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
        { queryLogId: 'query-2' },
      );

      // Assert: Only query-2 should be returned
      expect(samples).toHaveLength(1);
      expect(samples[0].queryLogId).toBe('query-2');
      expect(samples[0].question).toBe('How to learn web development?');
    });

    it('should return empty array when filter matches no entries', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Act: Load with non-existent queryLogId
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
        { queryLogId: 'non-existent' },
      );

      // Assert
      expect(samples).toHaveLength(0);
    });

    it('should handle empty test set file', async () => {
      // Arrange: Create empty test set
      await createTestSetFile([]);

      // Act
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert
      expect(samples).toHaveLength(0);
    });
  });

  describe('Transformation delegation', () => {
    it('should delegate transformation to transformer service', async () => {
      // Arrange
      const testSet = createMockTestSet();
      await createTestSetFile(testSet);

      // Spy on transformer
      const transformSpy = jest.spyOn(transformer, 'transformTestSet');

      // Act
      await loader.loadForEvaluator(TEST_SET_FILENAME, TEST_DIR);

      // Assert: Verify transformer was called
      expect(transformSpy).toHaveBeenCalledTimes(1);
      // Note: Dates are serialized as strings when loaded from JSON,
      // so we just verify the call was made, not the exact argument
      expect(transformSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            queryLogId: expect.any(String),
            question: expect.any(String),
          }),
        ]),
      );
    });

    it('should correctly transform loaded data to evaluation samples', async () => {
      // Arrange: Create a test set with deduplication scenario
      // Same course (CS101) appears with different scores for different skills
      const courseHighScore = createMockCourse({
        subjectCode: 'CS101',
        subjectName: 'Intro to CS',
        score: 3,
        reason: 'High match',
      });

      const courseLowScore = createMockCourse({
        subjectCode: 'CS101',
        subjectName: 'Intro to CS',
        score: 1,
        reason: 'Low match',
      });

      const testSet: CourseFilterTestSetSerialized[] = [
        createMockTestSetEntry({
          queryLogId: 'dedup-test',
          question: 'Test deduplication',
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              'skill-1': [courseHighScore],
              'skill-2': [courseLowScore],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        TEST_SET_FILENAME,
        TEST_DIR,
      );

      // Assert: Verify deduplication - CS101 should appear once with MAX score
      expect(samples).toHaveLength(1);
      expect(samples[0].courses).toHaveLength(1);
      expect(samples[0].courses[0].subjectCode).toBe('CS101');
      expect(samples[0].courses[0].systemScore).toBe(3); // MAX(3, 1) = 3
      expect(samples[0].courses[0].systemAction).toBe('KEEP');
    });
  });

  describe('Default directory', () => {
    it('should use default directory when not specified', async () => {
      // Arrange: Create test set in default directory
      const defaultDir = 'data/evaluation/test-sets';
      const testSet = createMockTestSet();

      // Create default directory if it doesn't exist
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }

      const filePath = path.join(defaultDir, TEST_SET_FILENAME);
      await FileHelper.saveJson(filePath, testSet);

      // Act: Load without specifying directory
      const samples = await loader.loadForEvaluator(TEST_SET_FILENAME);

      // Assert
      expect(samples).toHaveLength(3);

      // Cleanup: Remove default directory test file
      fs.unlinkSync(filePath);
    });
  });
});
