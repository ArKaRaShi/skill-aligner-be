import { FileHelper } from 'src/shared/utils/file';

import {
  createMockCourseRetrievalTestSetSerialized,
  createMockCourseWithLOMatch,
} from '../../__tests__/course-retrieval.fixture';
import { CourseMapperHelper } from '../../helpers/course-mapper.helper';
import { CourseRetrievalTestSetLoaderService } from '../course-retrieval-test-set-loader.service';

// Mock FileHelper
jest.mock('src/shared/utils/file');

// Mock CourseMapperHelper
jest.mock('../../helpers/course-mapper.helper');

describe('CourseRetrievalTestSetLoaderService', () => {
  let loader: CourseRetrievalTestSetLoaderService;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create loader instance
    loader = new CourseRetrievalTestSetLoaderService();
    (loader as any).logger = mockLogger;

    // Mock CourseMapperHelper.toCourseInfo
    (CourseMapperHelper.toCourseInfo as jest.Mock).mockImplementation(
      (course: {
        subjectCode: string;
        subjectName: string;
        allLearningOutcomes: Array<{ cleanedName: string }>;
      }) => ({
        subjectCode: course.subjectCode,
        subjectName: course.subjectName,
        cleanedLearningOutcomes: course.allLearningOutcomes.map(
          (lo) => lo.cleanedName,
        ),
      }),
    );
  });

  describe('loadForEvaluator', () => {
    const mockCourse1 = createMockCourseWithLOMatch({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
    });
    const mockCourse2 = createMockCourseWithLOMatch({
      subjectCode: 'CS201',
      subjectName: 'Advanced Python',
    });

    const mockTestSet = [
      createMockCourseRetrievalTestSetSerialized({
        queryLogId: 'query-1',
        question: 'How do I learn Python?',
        skills: ['python programming', 'data analysis'],
        skillCoursesMap: {
          'python programming': [mockCourse1, mockCourse2],
          'data analysis': [mockCourse1],
        },
      }),
      createMockCourseRetrievalTestSetSerialized({
        queryLogId: 'query-2',
        question: 'How do I learn Java?',
        skills: ['java programming'],
        skillCoursesMap: {
          'java programming': [mockCourse1],
        },
      }),
    ];

    it('should load test set and map to evaluator inputs', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      const result = await loader.loadForEvaluator('test-set-v1.json');

      // Assert
      expect(FileHelper.loadJson).toHaveBeenCalledWith(
        'data/evaluation/test-sets/test-set-v1.json',
      );
      expect(result).toHaveLength(3); // 2 skills from query-1, 1 skill from query-2
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 2 test entries'),
      );
    });

    it('should filter by queryLogId when provided', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      const result = await loader.loadForEvaluator(
        'test-set-v1.json',
        'data/evaluation/test-sets',
        {
          queryLogId: 'query-1',
        },
      );

      // Assert
      expect(result).toHaveLength(2); // Only query-1 has 2 skills
      expect(result[0]).toMatchObject({
        testCaseId: 'query-1',
        question: 'How do I learn Python?',
      });
    });

    it('should filter by skill when provided', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      const result = await loader.loadForEvaluator(
        'test-set-v1.json',
        'data/evaluation/test-sets',
        {
          queryLogId: 'query-1',
          skill: 'data analysis',
        },
      );

      // Assert
      expect(result).toHaveLength(1); // Only data analysis skill
      expect(result[0]).toMatchObject({
        testCaseId: 'query-1',
        skill: 'data analysis',
      });
    });

    it('should return empty array when skill not found', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      const result = await loader.loadForEvaluator(
        'test-set-v1.json',
        'data/evaluation/test-sets',
        {
          queryLogId: 'query-1',
          skill: 'nonexistent skill',
        },
      );

      // Assert
      expect(result).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skill "nonexistent skill" not found'),
      );
    });

    it('should handle filename with .json extension', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      await loader.loadForEvaluator('test-set-v1.json');

      // Assert
      expect(FileHelper.loadJson).toHaveBeenCalledWith(
        'data/evaluation/test-sets/test-set-v1.json',
      );
    });

    it('should handle filename without .json extension', async () => {
      // Arrange
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(mockTestSet);

      // Act
      await loader.loadForEvaluator('test-set-v1');

      // Assert
      expect(FileHelper.loadJson).toHaveBeenCalledWith(
        'data/evaluation/test-sets/test-set-v1.json',
      );
    });
  });

  describe('mapToEvaluatorInputs (private behavior tested via loadForEvaluator)', () => {
    const mockCourse1 = createMockCourseWithLOMatch({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
    });
    const mockCourse2 = createMockCourseWithLOMatch({
      subjectCode: 'CS201',
      subjectName: 'Advanced Python',
    });

    it('should create one input per skill', async () => {
      // Arrange
      const testSet = [
        createMockCourseRetrievalTestSetSerialized({
          queryLogId: 'query-1',
          question: 'Test question?',
          skills: ['python', 'java', 'data analysis'],
          skillCoursesMap: {
            python: [mockCourse1],
            java: [mockCourse2],
            'data analysis': [mockCourse1, mockCourse2],
          },
        }),
      ];
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(testSet);

      // Act
      const result = await loader.loadForEvaluator('test-set.json');

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.skill)).toEqual([
        'python',
        'java',
        'data analysis',
      ]);
    });

    it('should map courses using CourseMapperHelper', async () => {
      // Arrange
      const testSet = [
        createMockCourseRetrievalTestSetSerialized({
          queryLogId: 'query-1',
          skills: ['python'],
          skillCoursesMap: {
            python: [mockCourse1, mockCourse2],
          },
        }),
      ];
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(testSet);

      // Act
      await loader.loadForEvaluator('test-set.json');

      // Assert
      expect(CourseMapperHelper.toCourseInfo).toHaveBeenCalledTimes(2);
    });

    it('should populate testCaseId, question, and skill', async () => {
      // Arrange
      const testSet = [
        createMockCourseRetrievalTestSetSerialized({
          queryLogId: 'abc123',
          question: 'How do I learn Python?',
          skills: ['python programming'],
          skillCoursesMap: {
            'python programming': [mockCourse1],
          },
        }),
      ];
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(testSet);

      // Act
      const result = await loader.loadForEvaluator('test-set.json');

      // Assert
      expect(result[0]).toMatchObject({
        testCaseId: 'abc123',
        question: 'How do I learn Python?',
        skill: 'python programming',
      });
    });

    it('should skip skills with no courses', async () => {
      // Arrange: skillCoursesMap with undefined (not empty array) to test skip behavior
      const testSet = [
        createMockCourseRetrievalTestSetSerialized({
          queryLogId: 'query-1',
          skills: ['python', 'java', 'data analysis'],
          skillCoursesMap: {
            python: [mockCourse1],
            // Note: java key missing entirely to simulate undefined
            'data analysis': [mockCourse2],
          } as any, // Cast to allow missing key
        }),
      ];
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(testSet);

      // Act
      const result = await loader.loadForEvaluator('test-set.json');

      // Assert: java is skipped because the key doesn't exist
      expect(result).toHaveLength(2); // Only python and data analysis
      expect(result.map((r) => r.skill)).not.toContain('java');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No courses found for skill "java"'),
      );
    });

    it('should handle multiple skills for same entry', async () => {
      // Arrange
      const testSet = [
        createMockCourseRetrievalTestSetSerialized({
          queryLogId: 'query-1',
          skills: ['python', 'java'],
          skillCoursesMap: {
            python: [mockCourse1],
            java: [mockCourse2],
          },
        }),
      ];
      (FileHelper.loadJson as jest.Mock).mockResolvedValue(testSet);

      // Act
      const result = await loader.loadForEvaluator('test-set.json');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        testCaseId: 'query-1',
        skill: 'python',
      });
      expect(result[1]).toMatchObject({
        testCaseId: 'query-1',
        skill: 'java',
      });
    });
  });
});
