import { Test, TestingModule } from '@nestjs/testing';

import { FileHelper } from 'src/shared/utils/file';

import { SkillExpansionTestSetLoaderService } from '../../skill-expansion-test-set-loader.service';
import {
  createEmptyTestSet,
  createInvalidTestSet,
  createMockTestSet,
  createMockTestSetEntry,
  createMockTestSetWithLearningOutcomes,
  createMockTestSetWithMultipleSkills,
} from '../fixtures/skill-expansion-test-set.fixtures';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Unit tests for SkillExpansionTestSetLoaderService
 *
 * Tests the loading and transformation of skill expansion test sets.
 * Key focus areas:
 * - JSON file loading with FileHelper
 * - Data structure validation (cases array)
 * - Transformation to QuestionEvalSample format
 * - Filtering by queryLogId
 * - Filename normalization (.json extension)
 */
describe('SkillExpansionTestSetLoaderService', () => {
  let service: SkillExpansionTestSetLoaderService;
  let mockLoadJson: jest.SpiedFunction<typeof FileHelper.loadJson>;

  beforeEach(async () => {
    // Mock FileHelper.loadJson static method
    mockLoadJson = jest.spyOn(FileHelper, 'loadJson');

    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillExpansionTestSetLoaderService],
    }).compile();

    service = module.get<SkillExpansionTestSetLoaderService>(
      SkillExpansionTestSetLoaderService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('load', () => {
    describe('happy path', () => {
      it('should load and transform test set correctly', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set-skill-expansion.json');

        // Assert
        expect(mockLoadJson).toHaveBeenCalledWith(
          'data/evaluation/test-sets/test-set-skill-expansion.json',
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          queryLogId: 'ql-1',
          question: 'What is OOP?',
          systemSkills: mockTestSet.cases[0].rawOutput.skillItems,
        });
      });

      it('should normalize filename with .json extension', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        await service.load('test-set-skill-expansion.json');

        // Assert - should use the exact path with .json
        expect(mockLoadJson).toHaveBeenCalledWith(
          'data/evaluation/test-sets/test-set-skill-expansion.json',
        );
      });

      it('should add .json extension if not provided', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        await service.load('test-set-skill-expansion');

        // Assert - should append .json
        expect(mockLoadJson).toHaveBeenCalledWith(
          'data/evaluation/test-sets/test-set-skill-expansion.json',
        );
      });

      it('should use default directory when not specified', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        await service.load('test-set.json');

        // Assert
        expect(mockLoadJson).toHaveBeenCalledWith(
          'data/evaluation/test-sets/test-set.json',
        );
      });

      it('should use custom directory when specified', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        await service.load('test-set.json', 'custom/path');

        // Assert
        expect(mockLoadJson).toHaveBeenCalledWith('custom/path/test-set.json');
      });

      it('should preserve queryLogId, question, and systemSkills', async () => {
        // Arrange
        const mockTestSet = createMockTestSetWithMultipleSkills();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set.json');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].queryLogId).toBe('ql-1');
        expect(result[0].question).toBe(
          'What are the best programming courses?',
        );
        expect(result[0].systemSkills).toEqual([
          {
            skill: 'Python Programming',
            reason: 'User wants programming courses',
          },
          {
            skill: 'Java Programming',
            reason: 'User wants programming courses',
          },
          {
            skill: 'Data Structures',
            reason: 'Fundamental CS concept',
          },
        ]);
      });

      it('should handle learning outcome field', async () => {
        // Arrange
        const mockTestSet = createMockTestSetWithLearningOutcomes();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set.json');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].systemSkills[0]).toEqual({
          skill: 'Object-Oriented Programming',
          reason: 'Core concept',
          learningOutcome:
            'Master encapsulation, abstraction, inheritance, and polymorphism',
        });
        expect(result[0].systemSkills[1]).toEqual({
          skill: 'Design Patterns',
          reason: 'Advanced OOP',
          learningOutcome:
            'Apply Gang of Four design patterns in real projects',
        });
      });

      it('should transform to QuestionEvalSample format', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set.json');

        // Assert - verify structure
        result.forEach((sample) => {
          expect(sample).toHaveProperty('queryLogId');
          expect(sample).toHaveProperty('question');
          expect(sample).toHaveProperty('systemSkills');
          expect(sample.systemSkills).toBeInstanceOf(Array);
        });
      });
    });

    describe('filtering', () => {
      it('should filter by queryLogId when provided', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load(
          'test-set.json',
          'data/evaluation/test-sets',
          {
            queryLogId: 'ql-1',
          },
        );

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].queryLogId).toBe('ql-1');
      });

      it('should return empty array when filter matches nothing', async () => {
        // Arrange
        const mockTestSet = createMockTestSet();
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load(
          'test-set.json',
          'data/evaluation/test-sets',
          {
            queryLogId: 'non-existent-id',
          },
        );

        // Assert
        expect(result).toEqual([]);
      });

      it('should filter correctly with multiple entries', async () => {
        // Arrange
        const mockTestSet: any = {
          name: 'multi-entry-test',
          cases: [
            createMockTestSetEntry({
              queryLogId: 'ql-1',
              question: 'Question 1',
            }),
            createMockTestSetEntry({
              queryLogId: 'ql-2',
              question: 'Question 2',
            }),
            createMockTestSetEntry({
              queryLogId: 'ql-3',
              question: 'Question 3',
            }),
            createMockTestSetEntry({
              queryLogId: 'ql-2',
              question: 'Question 2 duplicate',
            }),
          ],
        };
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load(
          'test-set.json',
          'data/evaluation/test-sets',
          {
            queryLogId: 'ql-2',
          },
        );

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].queryLogId).toBe('ql-2');
        expect(result[1].queryLogId).toBe('ql-2');
      });
    });

    describe('validation errors', () => {
      it('should throw when file not found', async () => {
        // Arrange
        mockLoadJson.mockRejectedValue(new Error('File not found'));

        // Act & Assert
        await expect(service.load('non-existent.json')).rejects.toThrow(
          'File not found',
        );
      });

      it('should throw when cases array is missing', async () => {
        // Arrange
        const invalidTestSet = createInvalidTestSet();
        mockLoadJson.mockResolvedValue(invalidTestSet);

        // Act & Assert
        await expect(service.load('invalid.json')).rejects.toThrow(
          'Invalid test set format: expected "cases" array',
        );
      });

      it('should throw when cases is not an array', async () => {
        // Arrange
        const invalidTestSet: any = {
          name: 'invalid-test',
          cases: 'not-an-array',
        };
        mockLoadJson.mockResolvedValue(invalidTestSet);

        // Act & Assert
        await expect(service.load('invalid.json')).rejects.toThrow(
          'Invalid test set format: expected "cases" array',
        );
      });

      it('should throw error with filepath in message', async () => {
        // Arrange
        const invalidTestSet = createInvalidTestSet();
        mockLoadJson.mockResolvedValue(invalidTestSet);

        // Act & Assert
        await expect(
          service.load('test-set.json', 'custom/dir'),
        ).rejects.toThrow('custom/dir/test-set.json');
      });
    });

    describe('edge cases', () => {
      it('should handle empty test set', async () => {
        // Arrange
        const emptyTestSet = createEmptyTestSet();
        mockLoadJson.mockResolvedValue(emptyTestSet);

        // Act
        const result = await service.load('empty.json');

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle test set with no skills', async () => {
        // Arrange
        const mockTestSet: any = {
          name: 'no-skills-test',
          cases: [
            createMockTestSetEntry({
              rawOutput: { skillItems: [] },
            }),
          ],
        };
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set.json');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].systemSkills).toEqual([]);
      });

      it('should handle test set with missing skill fields', async () => {
        // Arrange
        const mockTestSet: any = {
          name: 'partial-skills-test',
          cases: [
            createMockTestSetEntry({
              rawOutput: {
                skillItems: [
                  {
                    skill: 'Python Programming',
                    reason: 'Good language',
                    // learningOutcome is optional
                  },
                ],
              },
            }),
          ],
        };
        mockLoadJson.mockResolvedValue(mockTestSet);

        // Act
        const result = await service.load('test-set.json');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].systemSkills[0]).toEqual({
          skill: 'Python Programming',
          reason: 'Good language',
        });
      });
    });
  });
});
