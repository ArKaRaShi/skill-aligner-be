import { describe, expect, it } from '@jest/globals';
import { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseAggregationInput } from '../../../types/course-aggregation.type';
import { CourseAggregationService } from '../course-aggregation.service';

/**
 * Helper to create a test course with relevance score
 */
const createTestCourseWithScore = (
  subjectCode: string,
  subjectName: string,
  score: number,
  _skill: string,
) => {
  const learningOutcome = {
    loId: 'lo1' as Identifier,
    cleanedName: 'Understand programming concepts',
    originalName: 'Understand programming concepts',
    skipEmbedding: false,
    hasEmbedding768: true,
    hasEmbedding1536: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    similarityScore: 0.85,
  };

  const matchedLearningOutcome = {
    matchedLearningOutcomes: [learningOutcome],
    remainingLearningOutcomes: [],
    allLearningOutcomes: [learningOutcome],
  };

  return {
    id: `course-${subjectCode}` as Identifier,
    campusId: 'campus-1' as Identifier,
    facultyId: 'faculty-1' as Identifier,
    subjectCode,
    subjectName,
    isGenEd: false,
    courseLearningOutcomes: [learningOutcome],
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...matchedLearningOutcome,
    score,
    reason: 'Test reason',
  };
};

describe('CourseAggregationService', () => {
  let service: CourseAggregationService;

  beforeEach(() => {
    service = new CourseAggregationService();
  });

  describe('aggregate with filtered courses (with scores)', () => {
    it('should deduplicate courses by subjectCode and keep highest score', () => {
      // Arrange - Same course from 2 skills with different scores
      const input: CourseAggregationInput = {
        filteredSkillCoursesMap: new Map([
          [
            'python',
            [createTestCourseWithScore('CS101', 'Intro to CS', 3, 'python')],
          ],
          [
            'programming',
            [
              createTestCourseWithScore(
                'CS101',
                'Intro to CS',
                2,
                'programming',
              ),
            ],
          ],
        ]),
        rawSkillCoursesMap: new Map(),
      };

      // Act
      const result = service.aggregate(input);

      // Assert
      expect(result.rankedCourses).toHaveLength(1);
      expect(result.rankedCourses[0].subjectCode).toBe('CS101');
      expect(result.rankedCourses[0].maxRelevanceScore).toBe(3); // Max of 3 and 2
      expect(result.rankedCourses[0].matchedSkills).toHaveLength(2);
      expect(result.rankedCourses[0].matchedSkills[0].skill).toBe('python');
      expect(result.rankedCourses[0].matchedSkills[1].skill).toBe(
        'programming',
      );
    });

    it('should rank courses by relevance score descending', () => {
      // Arrange
      const input: CourseAggregationInput = {
        filteredSkillCoursesMap: new Map([
          [
            'python',
            [
              createTestCourseWithScore('CS101', 'Intro to CS', 1, 'python'),
              createTestCourseWithScore(
                'CS201',
                'Data Structures',
                3,
                'python',
              ),
              createTestCourseWithScore('CS301', 'Algorithms', 2, 'python'),
            ],
          ],
        ]),
        rawSkillCoursesMap: new Map(),
      };

      // Act
      const result = service.aggregate(input);

      // Assert - Should be ranked: CS201 (3), CS301 (2), CS101 (1)
      expect(result.rankedCourses).toHaveLength(3);
      expect(result.rankedCourses[0].subjectCode).toBe('CS201');
      expect(result.rankedCourses[0].maxRelevanceScore).toBe(3);
      expect(result.rankedCourses[1].subjectCode).toBe('CS301');
      expect(result.rankedCourses[1].maxRelevanceScore).toBe(2);
      expect(result.rankedCourses[2].subjectCode).toBe('CS101');
      expect(result.rankedCourses[2].maxRelevanceScore).toBe(1);
    });
  });

  describe('aggregate with raw courses (without scores)', () => {
    it('should use default score of 3 when no filter results', () => {
      // Arrange
      const input: CourseAggregationInput = {
        filteredSkillCoursesMap: undefined,
        rawSkillCoursesMap: new Map([
          [
            'python',
            [
              createTestCourseWithScore('CS101', 'Intro to CS', 0, 'python'), // Score ignored
            ],
          ],
        ]),
      };

      // Act
      const result = service.aggregate(input);

      // Assert
      expect(result.rankedCourses).toHaveLength(1);
      expect(result.rankedCourses[0].subjectCode).toBe('CS101');
      expect(result.rankedCourses[0].maxRelevanceScore).toBe(3); // Default score
    });
  });

  describe('edge cases', () => {
    it('should handle empty input gracefully', () => {
      // Arrange
      const input: CourseAggregationInput = {
        filteredSkillCoursesMap: new Map(),
        rawSkillCoursesMap: new Map(),
      };

      // Act
      const result = service.aggregate(input);

      // Assert
      expect(result.rankedCourses).toHaveLength(0);
    });

    it('should handle single skill with single course', () => {
      // Arrange
      const input: CourseAggregationInput = {
        filteredSkillCoursesMap: new Map([
          [
            'python',
            [createTestCourseWithScore('CS101', 'Intro to CS', 3, 'python')],
          ],
        ]),
        rawSkillCoursesMap: new Map(),
      };

      // Act
      const result = service.aggregate(input);

      // Assert
      expect(result.rankedCourses).toHaveLength(1);
    });
  });
});
