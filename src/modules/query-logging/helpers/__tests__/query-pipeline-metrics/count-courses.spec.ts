import { QueryPipelineMetrics } from '../../query-pipeline-metrics.helper';
import {
  createEmptySkillCoursesMap,
  createMockCourseWithLearningOutcomeV2Match,
  createMockSkillCoursesMap,
} from './fixtures/query-pipeline-metrics.helper.fixture';

describe('QueryPipelineMetrics', () => {
  describe('countCourses', () => {
    it('should return zero when map is empty', () => {
      // Arrange
      const skillCoursesMap = createEmptySkillCoursesMap();

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      expect(result).toBe(0);
    });

    it('should count unique courses when each skill has different courses', () => {
      // Arrange
      const skillCoursesMap = createMockSkillCoursesMap(false);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      expect(result).toBe(3);
    });

    it('should dseduplicate courses that appear under multiple skills', () => {
      // Arrange
      const skillCoursesMap = createMockSkillCoursesMap(true);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      // CS101 appears in both 'data analysis' and 'statistics', should be counted once
      expect(result).toBe(3);
    });

    it('should handle single skill with single course', () => {
      // Arrange
      const course = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS101',
      });
      const skillCoursesMap = new Map([['data analysis', [course]]]);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      expect(result).toBe(1);
    });

    it('should handle single skill with multiple courses', () => {
      // Arrange
      const course1 = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS101',
      });
      const course2 = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS102',
      });
      const course3 = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS103',
      });
      const skillCoursesMap = new Map([
        ['data analysis', [course1, course2, course3]],
      ]);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      expect(result).toBe(3);
    });

    it('should deduplicate courses with same subject code within same skill', () => {
      // Arrange
      const course1 = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS101',
      });
      const course2 = createMockCourseWithLearningOutcomeV2Match({
        subjectCode: 'CS101',
      });
      const skillCoursesMap = new Map([['data analysis', [course1, course2]]]);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      // Same subject code should be counted once
      expect(result).toBe(1);
    });

    it('should handle empty course arrays for skills', () => {
      // Arrange
      const skillCoursesMap = new Map([
        ['data analysis', []],
        ['statistics', []],
      ]);

      // Act
      const result = QueryPipelineMetrics.countCourses(skillCoursesMap);

      // Assert
      expect(result).toBe(0);
    });
  });
});
