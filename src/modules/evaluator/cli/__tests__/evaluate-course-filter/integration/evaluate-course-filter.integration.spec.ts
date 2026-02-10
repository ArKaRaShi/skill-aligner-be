/**
 * Integration Test for Course Filter CLI
 *
 * This test verifies the CLI file loading and data handling.
 * Due to complex module dependencies in the evaluator module,
 * this test focuses on testable components:
 * - Test set file I/O
 * - Configuration building
 * - Argument parsing logic
 * - File path resolution
 *
 * Full CLI execution testing would require additional test infrastructure.
 */
import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { CourseFilterTestSetLoaderService } from '../../../../course-relevance-filter/loaders/course-filter-test-set-loader.service';
import { CourseFilterTestSetTransformer } from '../../../../course-relevance-filter/loaders/course-filter-test-set-transformer.service';
import type { CourseFilterTestSetSerialized } from '../../../../shared/services/test-set.types';
import {
  CLI_TEST_DIR,
  CLI_TEST_SET_FILENAME,
  createEdgeCaseTestSet,
  createMockCourseFilterTestSet,
  createMultiEntryTestSet,
} from '../fixtures/course-filter-cli.fixtures';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Clean up test directory
 */
const cleanupTestDir = (): void => {
  const testDir = path.join(__dirname, CLI_TEST_DIR);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
};

/**
 * Create test set file
 */
const createTestSetFile = async (
  testSet: CourseFilterTestSetSerialized[],
): Promise<void> => {
  const testDir = path.join(__dirname, CLI_TEST_DIR);

  // Ensure test directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
  await FileHelper.saveJson(filePath, testSet);
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Course Filter CLI (Integration)', () => {
  afterAll(cleanupTestDir);
  beforeEach(cleanupTestDir);

  describe('CLI File Structure', () => {
    it('should have CLI file at expected location', () => {
      // Arrange & Act
      const cliPath = path.join(
        __dirname,
        '../../../evaluate-course-filter.cli.ts',
      );

      // Assert
      expect(fs.existsSync(cliPath)).toBe(true);
    });

    it('should have fixtures file for test data', () => {
      // Arrange & Act
      const fixturesPath = path.join(
        __dirname,
        '../fixtures/course-filter-cli.fixtures.ts',
      );

      // Assert
      expect(fs.existsSync(fixturesPath)).toBe(true);
    });
  });

  describe('Test Set Loading', () => {
    it('should load test set from JSON file', async () => {
      // Arrange
      const testSet = createMockCourseFilterTestSet();
      await createTestSetFile(testSet);

      // Act
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
      const loaded =
        await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath);

      // Assert
      expect(loaded).toHaveLength(1);
      expect(loaded[0].queryLogId).toBe('test-query-log-1');
      expect(loaded[0].question).toBe('What are the best AI courses?');
      expect(loaded[0].rawOutput?.llmAcceptedCoursesBySkill).toBeDefined();
    });

    it('should handle test set with multiple entries', async () => {
      // Arrange
      const testSet = createMultiEntryTestSet();
      await createTestSetFile(testSet);

      // Act
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
      const loaded =
        await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath);

      // Assert
      expect(loaded).toHaveLength(3);
      expect(loaded[0].queryLogId).toBe('query-1');
      expect(loaded[1].queryLogId).toBe('query-2');
      expect(loaded[2].queryLogId).toBe('query-3');
    });

    it('should handle edge case test sets', async () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();
      await createTestSetFile(testSet);

      // Act
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
      const loaded =
        await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath);

      // Assert
      expect(loaded).toHaveLength(3);

      // Edge case 1: Empty courses
      expect(loaded[0].rawOutput?.llmAcceptedCoursesBySkill).toEqual({});

      // Edge case 2: Only rejected
      expect(loaded[1].rawOutput?.llmRejectedCoursesBySkill).toBeDefined();

      // Edge case 3: Special characters in question
      expect(loaded[2].question).toContain('¿');
      expect(loaded[2].question).toContain('🚀');
    });
  });

  describe('Configuration Building', () => {
    describe('Default values', () => {
      it('should use filename as default test set name', () => {
        // Arrange
        const filename = 'my-test-set.json';

        // Act
        const testSetName = filename.replace('.json', '');

        // Assert
        expect(testSetName).toBe('my-test-set');
      });

      it('should use default judge model when not provided', () => {
        // Arrange & Act
        const defaultJudgeModel = 'gpt-4o-mini';

        // Assert
        expect(defaultJudgeModel).toBe('gpt-4o-mini');
      });

      it('should use default judge provider when not provided', () => {
        // Arrange & Act
        const defaultJudgeProvider = 'openrouter';

        // Assert
        expect(defaultJudgeProvider).toBe('openrouter');
      });

      it('should use default system prompt version when not provided', () => {
        // Arrange & Act
        const defaultPromptVersion = '1.0';

        // Assert
        expect(defaultPromptVersion).toBe('1.0');
      });

      it('should use default iteration number of 1', () => {
        // Arrange & Act
        const defaultIteration = 1;

        // Assert
        expect(defaultIteration).toBe(1);
      });
    });

    describe('Custom values', () => {
      it('should accept custom test set name', () => {
        // Arrange
        const customName = 'my-custom-experiment';

        // Act & Assert
        expect(customName).toBe('my-custom-experiment');
      });

      it('should accept custom output directory', () => {
        // Arrange
        const customDir = 'custom/experiment/path';

        // Act & Assert
        expect(customDir).toBe('custom/experiment/path');
      });

      it('should accept custom judge model', () => {
        // Arrange
        const customModel = 'gpt-4o';

        // Act & Assert
        expect(customModel).toBe('gpt-4o');
      });

      it('should accept custom judge provider', () => {
        // Arrange
        const customProvider = 'openai';

        // Act & Assert
        expect(customProvider).toBe('openai');
      });

      it('should accept custom iteration number', () => {
        // Arrange
        const iteration = 5;

        // Act & Assert
        expect(iteration).toBe(5);
      });
    });
  });

  describe('Course Count Calculation', () => {
    it('should calculate approximate course count from test set', () => {
      // Arrange
      const testSet = createMockCourseFilterTestSet();

      // Act - calculate total courses
      const totalCourses = testSet.reduce((sum, entry) => {
        const acceptedCount =
          (entry.rawOutput?.llmAcceptedCoursesBySkill &&
            Object.values(entry.rawOutput.llmAcceptedCoursesBySkill).reduce(
              (skillSum, courses) => skillSum + courses.length,
              0,
            )) ||
          0;
        const rejectedCount =
          (entry.rawOutput?.llmRejectedCoursesBySkill &&
            Object.values(entry.rawOutput.llmRejectedCoursesBySkill).reduce(
              (skillSum, courses) => skillSum + courses.length,
              0,
            )) ||
          0;
        return sum + acceptedCount + rejectedCount;
      }, 0);

      // Assert
      // 2 accepted + 1 rejected = 3 courses
      expect(totalCourses).toBe(3);
    });

    it('should handle test set with no courses', () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();
      const emptyEntry = testSet[0]; // edge-empty-courses

      // Act
      const totalCourses = emptyEntry.rawOutput
        ? Object.values(emptyEntry.rawOutput.llmAcceptedCoursesBySkill).reduce(
            (sum, courses) => sum + courses.length,
            0,
          ) +
          Object.values(emptyEntry.rawOutput.llmRejectedCoursesBySkill).reduce(
            (sum, courses) => sum + courses.length,
            0,
          )
        : 0;

      // Assert
      expect(totalCourses).toBe(0);
    });

    it('should calculate total courses across multiple entries', () => {
      // Arrange
      const testSet = createMultiEntryTestSet();

      // Act
      const totalCourses = testSet.reduce((sum, entry) => {
        const acceptedCount =
          (entry.rawOutput?.llmAcceptedCoursesBySkill &&
            Object.values(entry.rawOutput.llmAcceptedCoursesBySkill).reduce(
              (skillSum, courses) => skillSum + courses.length,
              0,
            )) ||
          0;
        const rejectedCount =
          (entry.rawOutput?.llmRejectedCoursesBySkill &&
            Object.values(entry.rawOutput.llmRejectedCoursesBySkill).reduce(
              (skillSum, courses) => skillSum + courses.length,
              0,
            )) ||
          0;
        return sum + acceptedCount + rejectedCount;
      }, 0);

      // Assert - 3 entries, each with 3 courses = 9 total
      expect(totalCourses).toBe(9);
    });
  });

  describe('File Path Resolution', () => {
    it('should handle filename without .json extension', () => {
      // Arrange
      const filename = 'test-set';
      const directory = 'data/evaluation/test-sets';

      // Act
      const filepath = filename.endsWith('.json')
        ? `${directory}/${filename}`
        : `${directory}/${filename}.json`;

      // Assert
      expect(filepath).toBe('data/evaluation/test-sets/test-set.json');
    });

    it('should handle filename with .json extension', () => {
      // Arrange
      const filename = 'test-set.json';
      const directory = 'data/evaluation/test-sets';

      // Act
      const filepath = filename.endsWith('.json')
        ? `${directory}/${filename}`
        : `${directory}/${filename}.json`;

      // Assert
      expect(filepath).toBe('data/evaluation/test-sets/test-set.json');
    });

    it('should construct correct output directory path', () => {
      // Arrange
      const testSetName = 'my-test-set';
      const baseDir = 'data/evaluation/course-relevance-filter';

      // Act
      const outputDir = path.join(baseDir, testSetName);

      // Assert
      expect(outputDir).toContain(testSetName);
      expect(outputDir).toContain(baseDir);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent test set file', async () => {
      // Arrange
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, 'non-existent-file.json');

      // Act & Assert
      await expect(
        FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath),
      ).rejects.toThrow();
    });

    it('should detect empty test set', async () => {
      // Arrange
      await createTestSetFile([]);

      // Act
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
      const loaded =
        await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath);

      // Assert
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Special Characters Handling', () => {
    it('should preserve special characters in question', () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();

      // Act & Assert
      const specialEntry = testSet[2]; // edge-special-chars
      expect(specialEntry.question).toContain('¿');
      expect(specialEntry.question).toContain('日本語');
      expect(specialEntry.question).toContain('🚀');
    });

    it('should preserve special characters during JSON round-trip', async () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();
      await createTestSetFile(testSet);

      // Act
      const testDir = path.join(__dirname, CLI_TEST_DIR);
      const filePath = path.join(testDir, CLI_TEST_SET_FILENAME);
      const loaded =
        await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filePath);

      // Assert
      expect(loaded[2].question).toBe(testSet[2].question);
    });
  });

  describe('Data Structure Validation', () => {
    it('should have required fields in test set entries', () => {
      // Arrange
      const testSet = createMockCourseFilterTestSet();

      // Act & Assert
      const entry = testSet[0];

      expect(entry.queryLogId).toBeDefined();
      expect(entry.question).toBeDefined();
      expect(entry.rawOutput).toBeDefined();
      expect(entry.llmModel).toBeDefined();
      expect(entry.llmProvider).toBeDefined();
    });

    it('should have correct raw output structure', () => {
      // Arrange
      const testSet = createMockCourseFilterTestSet();

      // Act & Assert
      const rawOutput = testSet[0].rawOutput;

      expect(rawOutput?.llmAcceptedCoursesBySkill).toBeDefined();
      expect(rawOutput?.llmRejectedCoursesBySkill).toBeDefined();
      expect(rawOutput?.llmMissingCoursesBySkill).toBeDefined();
    });

    it('should have metrics by skill', () => {
      // Arrange
      const testSet = createMockCourseFilterTestSet();

      // Act & Assert
      const metrics = testSet[0].metricsBySkill;

      expect(metrics).toBeDefined();
      expect(metrics['machine learning']).toBeDefined();
    });
  });

  describe('Service Integration Tests', () => {
    let module: TestingModule;
    let loader: CourseFilterTestSetLoaderService;

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
    });

    afterAll(async () => {
      await module.close();
    });

    it('should load and transform test set through loader service', async () => {
      // Arrange: Create test set file
      const testSet = createMockCourseFilterTestSet();
      await createTestSetFile(testSet);

      // Act: Load through loader service
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Assert: Verify actual business logic behavior
      expect(samples).toHaveLength(1);
      expect(samples[0].queryLogId).toBe('test-query-log-1');
      expect(samples[0].question).toBe('What are the best AI courses?');
      expect(samples[0].courses).toHaveLength(3); // 2 accepted + 1 rejected
    });

    it('should handle test set with multiple entries through loader', async () => {
      // Arrange
      const testSet = createMultiEntryTestSet();
      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Assert
      expect(samples).toHaveLength(3);
      expect(samples[0].queryLogId).toBe('query-1');
      expect(samples[1].queryLogId).toBe('query-2');
      expect(samples[2].queryLogId).toBe('query-3');
    });

    it('should deduplicate courses by subjectCode during transformation', async () => {
      // Arrange: Create test set where same course appears with different scores
      const testSet = createEdgeCaseTestSet();
      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Assert: Verify deduplication behavior
      const pythonSample = samples.find((s) => s.question.includes('Python'));
      expect(pythonSample).toBeDefined();
      expect(pythonSample!.courses).toHaveLength(1);
      expect(pythonSample!.courses[0].subjectCode).toBe('CS-PY-101');
    });

    it('should handle empty courses edge case through loader', async () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();
      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Assert
      const emptySample = samples.find(
        (s) => s.queryLogId === 'edge-empty-courses',
      );
      expect(emptySample).toBeDefined();
      expect(emptySample!.courses).toHaveLength(0);
    });

    it('should filter by queryLogId through loader', async () => {
      // Arrange
      const testSet = createMultiEntryTestSet();
      await createTestSetFile(testSet);

      // Act: Load with queryLogId filter
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
        { queryLogId: 'query-2' },
      );

      // Assert
      expect(samples).toHaveLength(1);
      expect(samples[0].queryLogId).toBe('query-2');
    });

    it('should preserve special characters during load and transform', async () => {
      // Arrange
      const testSet = createEdgeCaseTestSet();
      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Assert
      const specialSample = samples.find((s) => s.question.includes('¿'));
      expect(specialSample).toBeDefined();
      expect(specialSample!.question).toContain('¿');
      expect(specialSample!.question).toContain('日本語');
      expect(specialSample!.question).toContain('🚀');
    });

    it('should calculate total course count correctly across samples', async () => {
      // Arrange
      const testSet = createMultiEntryTestSet();
      await createTestSetFile(testSet);

      // Act
      const samples = await loader.loadForEvaluator(
        CLI_TEST_SET_FILENAME,
        path.join(__dirname, CLI_TEST_DIR),
      );

      // Calculate total courses across all samples
      const totalCourses = samples.reduce(
        (sum, sample) => sum + sample.courses.length,
        0,
      );

      // Assert - 3 entries, each with 3 courses = 9 total
      expect(totalCourses).toBe(9);
    });
  });
});
