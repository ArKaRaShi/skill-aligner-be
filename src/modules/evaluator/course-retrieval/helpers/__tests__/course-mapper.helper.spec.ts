import {
  createId,
  createMockCourseWithLOMatch,
  createMockLearningOutcome,
} from '../../__tests__/course-retrieval.fixture';
import { CourseMapperHelper } from '../course-mapper.helper';

describe('CourseMapperHelper', () => {
  describe('toCourseInfo', () => {
    it('should map basic course correctly', () => {
      // Arrange
      const lo1 = createMockLearningOutcome({
        loId: createId('lo-1'),
        cleanedName: 'Learn Python basics',
      });
      const lo2 = createMockLearningOutcome({
        loId: createId('lo-2'),
        cleanedName: 'Understand variables',
      });
      const course = createMockCourseWithLOMatch({
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        allLearningOutcomes: [lo1, lo2],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result).toEqual({
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        cleanedLearningOutcomes: [
          'Learn Python basics',
          'Understand variables',
        ],
      });
    });

    it('should map course with single learning outcome', () => {
      // Arrange
      const lo = createMockLearningOutcome({
        loId: createId('lo-1'),
        cleanedName: 'Learn Python programming',
      });
      const course = createMockCourseWithLOMatch({
        subjectCode: 'CS201',
        subjectName: 'Advanced Python',
        allLearningOutcomes: [lo],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result).toEqual({
        subjectCode: 'CS201',
        subjectName: 'Advanced Python',
        cleanedLearningOutcomes: ['Learn Python programming'],
      });
    });

    it('should map course with multiple learning outcomes', () => {
      // Arrange
      const lo1 = createMockLearningOutcome({ cleanedName: 'LO 1' });
      const lo2 = createMockLearningOutcome({ cleanedName: 'LO 2' });
      const lo3 = createMockLearningOutcome({ cleanedName: 'LO 3' });
      const lo4 = createMockLearningOutcome({ cleanedName: 'LO 4' });
      const lo5 = createMockLearningOutcome({ cleanedName: 'LO 5' });
      const course = createMockCourseWithLOMatch({
        allLearningOutcomes: [lo1, lo2, lo3, lo4, lo5],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result.cleanedLearningOutcomes).toHaveLength(5);
      expect(result.cleanedLearningOutcomes).toEqual([
        'LO 1',
        'LO 2',
        'LO 3',
        'LO 4',
        'LO 5',
      ]);
    });

    it('should map course with empty learning outcomes', () => {
      // Arrange
      const course = createMockCourseWithLOMatch({
        subjectCode: 'CS999',
        subjectName: 'Empty Course',
        allLearningOutcomes: [],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result).toEqual({
        subjectCode: 'CS999',
        subjectName: 'Empty Course',
        cleanedLearningOutcomes: [],
      });
    });

    it('should preserve course code exactly', () => {
      // Arrange
      const course = createMockCourseWithLOMatch({
        subjectCode: 'CS101-A',
        subjectName: 'Test Course',
        allLearningOutcomes: [],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result.subjectCode).toBe('CS101-A');
    });

    it('should preserve course name exactly', () => {
      // Arrange
      const course = createMockCourseWithLOMatch({
        subjectCode: 'CS101',
        subjectName: 'Introduction to C++ Programming: Advanced Topics',
        allLearningOutcomes: [],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result.subjectName).toBe(
        'Introduction to C++ Programming: Advanced Topics',
      );
    });

    it('should extract only cleanedName from learning outcomes', () => {
      // Arrange
      const lo = createMockLearningOutcome({
        loId: createId('lo-123'),
        originalName: 'Understand Object-Oriented Programming Concepts',
        cleanedName: 'understand object-oriented programming concepts',
        hasEmbedding768: true,
        hasEmbedding1536: false,
      });
      const course = createMockCourseWithLOMatch({
        allLearningOutcomes: [lo],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result.cleanedLearningOutcomes).toEqual([
        'understand object-oriented programming concepts',
      ]);
      expect(result.cleanedLearningOutcomes[0]).not.toContain(
        'Object-Oriented',
      );
    });

    it('should handle special characters in learning outcomes', () => {
      // Arrange
      const lo1 = createMockLearningOutcome({
        cleanedName: 'Learn about "quotes" and \'apostrophes\'',
      });
      const lo2 = createMockLearningOutcome({
        cleanedName: 'Understand C++ templates <T> and special characters: @#$',
      });
      const lo3 = createMockLearningOutcome({
        cleanedName: 'Multi-line\nlearning outcome\nwith newlines',
      });
      const course = createMockCourseWithLOMatch({
        allLearningOutcomes: [lo1, lo2, lo3],
      });

      // Act
      const result = CourseMapperHelper.toCourseInfo(course);

      // Assert
      expect(result.cleanedLearningOutcomes).toEqual([
        'Learn about "quotes" and \'apostrophes\'',
        'Understand C++ templates <T> and special characters: @#$',
        'Multi-line\nlearning outcome\nwith newlines',
      ]);
    });
  });
});
