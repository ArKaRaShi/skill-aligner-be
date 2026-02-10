import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { SkillExpansionTestSet } from '../../../types/skill-expansion.types';
import { SkillExpansionTestSetLoaderService } from '../../skill-expansion-test-set-loader.service';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Integration tests for SkillExpansionTestSetLoaderService
 *
 * Tests real file I/O with actual JSON files.
 */
describe('SkillExpansionTestSetLoaderService Integration', () => {
  let service: SkillExpansionTestSetLoaderService;
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `skill-expansion-test-${Date.now()}`);
  });

  beforeEach(() => {
    service = new SkillExpansionTestSetLoaderService();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await FileHelper.deleteDirectory(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('load with real file I/O', () => {
    it('should load actual JSON file from disk', async () => {
      // Arrange - Create a test file
      const testSet: SkillExpansionTestSet = {
        name: 'integration-test-set',
        cases: [
          {
            queryLogId: 'ql-integration-1',
            question: 'What is recursion?',
            rawOutput: {
              skillItems: [
                {
                  skill: 'Recursive Algorithms',
                  reason: 'User asked about recursion',
                },
              ],
            },
          },
        ],
      };
      const testFilePath = path.join(tempDir, 'test-set.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act
      const result = await service.load('test-set.json', tempDir);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe('ql-integration-1');
      expect(result[0].question).toBe('What is recursion?');
      expect(result[0].systemSkills).toEqual([
        {
          skill: 'Recursive Algorithms',
          reason: 'User asked about recursion',
        },
      ]);
    });

    it('should handle large test sets (100+ entries)', async () => {
      // Arrange - Create a large test set
      const cases = Array.from({ length: 150 }, (_, i) => ({
        queryLogId: `ql-large-${i}`,
        question: `Question ${i + 1}`,
        rawOutput: {
          skillItems: [
            {
              skill: `Skill ${i + 1}`,
              reason: `Reason ${i + 1}`,
            },
          ],
        },
      }));

      const testSet: SkillExpansionTestSet = {
        name: 'large-test-set',
        cases,
      };
      const testFilePath = path.join(tempDir, 'large-test-set.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act
      const result = await service.load('large-test-set.json', tempDir);

      // Assert
      expect(result).toHaveLength(150);
      expect(result[0].queryLogId).toBe('ql-large-0');
      expect(result[149].queryLogId).toBe('ql-large-149');
    });

    it('should filter and save to new file', async () => {
      // Arrange - Create a test set with multiple entries
      const testSet: SkillExpansionTestSet = {
        name: 'filter-test-set',
        cases: [
          {
            queryLogId: 'ql-1',
            question: 'Question 1',
            rawOutput: {
              skillItems: [{ skill: 'Skill 1', reason: 'Reason 1' }],
            },
          },
          {
            queryLogId: 'ql-2',
            question: 'Question 2',
            rawOutput: {
              skillItems: [{ skill: 'Skill 2', reason: 'Reason 2' }],
            },
          },
          {
            queryLogId: 'ql-3',
            question: 'Question 3',
            rawOutput: {
              skillItems: [{ skill: 'Skill 3', reason: 'Reason 3' }],
            },
          },
        ],
      };
      const testFilePath = path.join(tempDir, 'original-test-set.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act - Load with filter
      const result = await service.load('original-test-set.json', tempDir, {
        queryLogId: 'ql-2',
      });

      // Assert - Should only return the filtered entry
      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe('ql-2');

      // Verify original file still has all entries
      const originalData =
        await FileHelper.loadJson<SkillExpansionTestSet>(testFilePath);
      expect(originalData.cases).toHaveLength(3);
    });

    it('should throw error for non-existent file', async () => {
      // Act & Assert
      await expect(
        service.load('non-existent.json', tempDir),
      ).rejects.toThrow();
    });

    it('should handle file without .json extension', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = {
        name: 'no-extension-test',
        cases: [
          {
            queryLogId: 'ql-1',
            question: 'Test question',
            rawOutput: {
              skillItems: [{ skill: 'Test Skill', reason: 'Test reason' }],
            },
          },
        ],
      };
      const testFilePath = path.join(tempDir, 'no-extension.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act - Call without .json extension
      const result = await service.load('no-extension', tempDir);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Test question');
    });

    it('should handle files with multiple skills per question', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = {
        name: 'multi-skill-test',
        cases: [
          {
            queryLogId: 'ql-multi',
            question: 'What programming concepts should I learn?',
            rawOutput: {
              skillItems: [
                { skill: 'Data Structures', reason: 'Fundamental CS' },
                { skill: 'Algorithms', reason: 'Problem solving' },
                {
                  skill: 'Object-Oriented Programming',
                  reason: 'Software design',
                },
                {
                  skill: 'Design Patterns',
                  reason: 'Best practices',
                  learningOutcome: 'Apply Gang of Four patterns',
                },
              ],
            },
          },
        ],
      };
      const testFilePath = path.join(tempDir, 'multi-skill.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act
      const result = await service.load('multi-skill.json', tempDir);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].systemSkills).toHaveLength(4);
      expect(result[0].systemSkills[3]).toEqual({
        skill: 'Design Patterns',
        reason: 'Best practices',
        learningOutcome: 'Apply Gang of Four patterns',
      });
    });

    it('should preserve learning outcome field when present', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = {
        name: 'lo-test',
        cases: [
          {
            queryLogId: 'ql-lo',
            question: 'What will I learn?',
            rawOutput: {
              skillItems: [
                {
                  skill: 'Machine Learning',
                  reason: 'AI topic',
                  learningOutcome:
                    'Understand supervised and unsupervised learning algorithms',
                },
              ],
            },
          },
        ],
      };
      const testFilePath = path.join(tempDir, 'lo-test.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act
      const result = await service.load('lo-test.json', tempDir);

      // Assert
      expect(result[0].systemSkills[0].learningOutcome).toBe(
        'Understand supervised and unsupervised learning algorithms',
      );
    });

    it('should handle empty test set file', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = {
        name: 'empty-test',
        cases: [],
      };
      const testFilePath = path.join(tempDir, 'empty.json');
      await FileHelper.saveJson(testFilePath, testSet);

      // Act
      const result = await service.load('empty.json', tempDir);

      // Assert
      expect(result).toEqual([]);
    });

    it('should validate file structure and throw for invalid format', async () => {
      // Arrange - Create invalid file (missing cases)
      const invalidData = { name: 'invalid-test' }; // Missing 'cases'
      const testFilePath = path.join(tempDir, 'invalid.json');
      await FileHelper.saveJson(testFilePath, invalidData);

      // Act & Assert
      await expect(service.load('invalid.json', tempDir)).rejects.toThrow(
        'Invalid test set format: expected "cases" array',
      );
    });

    it('should validate that cases is an array', async () => {
      // Arrange - Create invalid file (cases is not array)
      const invalidData: any = {
        name: 'invalid-test',
        cases: 'not-an-array',
      };
      const testFilePath = path.join(tempDir, 'invalid-cases.json');
      await FileHelper.saveJson(testFilePath, invalidData);

      // Act & Assert
      await expect(service.load('invalid-cases.json', tempDir)).rejects.toThrow(
        'Invalid test set format: expected "cases" array',
      );
    });
  });
});
