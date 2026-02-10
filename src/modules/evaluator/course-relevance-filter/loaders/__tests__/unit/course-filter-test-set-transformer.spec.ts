import { mockIdWithSuffix } from 'test/fixtures';

import { CourseFilterTestSetTransformer } from '../../course-filter-test-set-transformer.service';
import {
  createExpectedAggregatedCourse,
  createExpectedQuestionSample,
  createMockCourse,
  createMockLearningOutcome,
  createMockMatchedLearningOutcome,
  createMockTestSetEntry,
} from '../fixtures/course-filter-test-set-transformer.fixtures';

/**
 * Unit tests for CourseFilterTestSetTransformer
 *
 * Tests the transformation from test set format to evaluation format.
 * Key focus areas:
 * - Deduplication by subjectCode
 * - MAX score preservation across skills
 * - Learning outcome field mapping (loId/cleanedName → id/name)
 * - Ranking by score (descending)
 */
describe('CourseFilterTestSetTransformer', () => {
  let transformer: CourseFilterTestSetTransformer;

  beforeEach(() => {
    transformer = new CourseFilterTestSetTransformer();
  });

  describe('transformTestSet', () => {
    it('should transform empty test set', () => {
      // Arrange
      const testSet: any[] = [];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result).toEqual([]);
    });

    it('should transform single entry with accepted courses', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          queryLogId: mockIdWithSuffix('query', 1),
          question: 'What courses teach AI?',
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              'machine learning': [
                createMockCourse({
                  subjectCode: 'CS101',
                  subjectName: 'Intro to AI',
                  score: 3,
                  reason: 'Perfect match',
                }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        createExpectedQuestionSample({
          queryLogId: mockIdWithSuffix('query', 1),
          question: 'What courses teach AI?',
          courses: [
            createExpectedAggregatedCourse({
              subjectCode: 'CS101',
              subjectName: 'Intro to AI',
              systemScore: 3,
              systemReason: 'Perfect match',
              matchedSkills: [
                {
                  skill: 'machine learning',
                  score: 3,
                  learningOutcomes: [
                    { id: 'lo-1', name: 'Understand AI' },
                    { id: 'lo-2', name: 'Learn ML' },
                  ],
                },
              ],
            }),
          ],
        }),
      );
    });

    it('should deduplicate courses by subjectCode and keep MAX score', () => {
      // Arrange - Same course (CS101) appears in 2 skills with different scores
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              'machine learning': [
                createMockCourse({
                  subjectCode: 'CS101',
                  score: 2,
                  reason: 'Good match',
                  matchedLearningOutcomes: [
                    createMockMatchedLearningOutcome({
                      loId: 'lo-ml-1',
                      cleanedName: 'Learn ML algorithms',
                    }),
                  ],
                }),
              ],
              'deep learning': [
                createMockCourse({
                  subjectCode: 'CS101',
                  score: 3,
                  reason: 'Excellent match',
                  matchedLearningOutcomes: [
                    createMockMatchedLearningOutcome({
                      loId: 'lo-dl-1',
                      cleanedName: 'Deep neural networks',
                    }),
                  ],
                }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - Should have ONE course with MAX score (3)
      expect(result[0].courses).toHaveLength(1);
      const course = result[0].courses[0];
      expect(course.subjectCode).toBe('CS101');
      expect(course.systemScore).toBe(3); // MAX score
      expect(course.systemReason).toBe('Excellent match'); // Reason from MAX score
      expect(course.matchedSkills).toHaveLength(2); // Both skills preserved
      expect(course.matchedSkills).toContainEqual({
        skill: 'machine learning',
        score: 2,
        learningOutcomes: [{ id: 'lo-ml-1', name: 'Learn ML algorithms' }],
      });
      expect(course.matchedSkills).toContainEqual({
        skill: 'deep learning',
        score: 3,
        learningOutcomes: [{ id: 'lo-dl-1', name: 'Deep neural networks' }],
      });
    });

    it('should handle courses from all three maps (accepted, rejected, missing)', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              'machine learning': [
                createMockCourse({
                  subjectCode: 'CS101',
                  score: 3,
                  reason: 'Accepted',
                }),
              ],
            },
            llmRejectedCoursesBySkill: {
              'machine learning': [
                createMockCourse({
                  subjectCode: 'ENG101',
                  score: 0,
                  reason: 'Rejected',
                }),
              ],
            },
            llmMissingCoursesBySkill: {
              'machine learning': [
                createMockCourse({
                  subjectCode: 'MATH201',
                  score: 1,
                  reason: 'Missing',
                }),
              ],
            },
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - All 3 courses should be present
      expect(result[0].courses).toHaveLength(3);
      const subjectCodes = result[0].courses.map((c) => c.subjectCode);
      expect(subjectCodes).toContain('CS101');
      expect(subjectCodes).toContain('ENG101');
      expect(subjectCodes).toContain('MATH201');
    });

    it('should rank courses by system score descending', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [
                createMockCourse({ subjectCode: 'CS101', score: 2 }),
                createMockCourse({ subjectCode: 'CS102', score: 1 }),
                createMockCourse({ subjectCode: 'CS103', score: 3 }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - Should be ranked: 3, 2, 1
      expect(result[0].courses[0].systemScore).toBe(3);
      expect(result[0].courses[1].systemScore).toBe(2);
      expect(result[0].courses[2].systemScore).toBe(1);
    });

    it('should handle missing rawOutput gracefully', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: undefined,
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - Should produce sample with no courses
      expect(result).toHaveLength(1);
      expect(result[0].courses).toEqual([]);
    });

    it('should handle empty skill maps', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {},
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].courses).toEqual([]);
    });

    it('should map learning outcome fields correctly (loId/cleanedName → id/name)', () => {
      // Arrange
      const customLOs = [
        createMockMatchedLearningOutcome({
          loId: 'lo-custom-1',
          cleanedName: 'Custom LO name 1',
        }),
        createMockMatchedLearningOutcome({
          loId: 'lo-custom-2',
          cleanedName: 'Custom LO name 2',
        }),
      ];

      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [
                createMockCourse({
                  subjectCode: 'CS101',
                  matchedLearningOutcomes: customLOs,
                  allLearningOutcomes: [
                    createMockLearningOutcome({
                      loId: 'lo-1',
                      cleanedName: 'All LO 1',
                    }),
                    createMockLearningOutcome({
                      loId: 'lo-2',
                      cleanedName: 'All LO 2',
                    }),
                  ],
                }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - Check field mapping
      const course = result[0].courses[0];
      expect(course.matchedSkills[0].learningOutcomes).toEqual([
        { id: 'lo-custom-1', name: 'Custom LO name 1' },
        { id: 'lo-custom-2', name: 'Custom LO name 2' },
      ]);
      expect(course.allLearningOutcomes).toEqual([
        { id: 'lo-1', name: 'All LO 1' },
        { id: 'lo-2', name: 'All LO 2' },
      ]);
    });

    it('should transform multiple test set entries', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          queryLogId: mockIdWithSuffix('query', 1),
          question: 'Question 1',
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [createMockCourse({ subjectCode: 'CS101', score: 3 })],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
        createMockTestSetEntry({
          queryLogId: mockIdWithSuffix('query', 2),
          question: 'Question 2',
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill2: [createMockCourse({ subjectCode: 'ENG101', score: 2 })],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].queryLogId).toBe(mockIdWithSuffix('query', 1));
      expect(result[0].question).toBe('Question 1');
      expect(result[0].courses[0].subjectCode).toBe('CS101');

      expect(result[1].queryLogId).toBe(mockIdWithSuffix('query', 2));
      expect(result[1].question).toBe('Question 2');
      expect(result[1].courses[0].subjectCode).toBe('ENG101');
    });
  });

  describe('systemAction field', () => {
    it('should set systemAction to KEEP for score 1-3', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [
                createMockCourse({ subjectCode: 'CS101', score: 1 }),
                createMockCourse({ subjectCode: 'CS102', score: 2 }),
                createMockCourse({ subjectCode: 'CS103', score: 3 }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert - All should have KEEP action
      result[0].courses.forEach((course) => {
        expect(course.systemAction).toBe('KEEP');
      });
    });

    it('should set systemAction to DROP for score 0 (rejected)', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {},
            llmRejectedCoursesBySkill: {
              skill1: [createMockCourse({ subjectCode: 'ENG101', score: 0 })],
            },
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result[0].courses[0].systemAction).toBe('DROP');
      expect(result[0].courses[0].systemScore).toBe(0);
    });

    it('should set systemAction to DROP for score 0 (missing)', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {},
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {
              skill1: [createMockCourse({ subjectCode: 'MATH201', score: 0 })],
            },
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result[0].courses[0].systemAction).toBe('DROP');
      expect(result[0].courses[0].systemScore).toBe(0);
    });

    it('should handle mixed KEEP and DROP courses in same question', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [
                createMockCourse({ subjectCode: 'CS101', score: 3 }), // KEEP
                createMockCourse({ subjectCode: 'CS102', score: 1 }), // KEEP
              ],
            },
            llmRejectedCoursesBySkill: {
              skill1: [createMockCourse({ subjectCode: 'ENG101', score: 0 })], // DROP
            },
            llmMissingCoursesBySkill: {
              skill1: [createMockCourse({ subjectCode: 'MATH201', score: 0 })], // DROP
            },
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      const cs101 = result[0].courses.find((c) => c.subjectCode === 'CS101')!;
      const cs102 = result[0].courses.find((c) => c.subjectCode === 'CS102')!;
      const eng101 = result[0].courses.find((c) => c.subjectCode === 'ENG101')!;
      const math201 = result[0].courses.find(
        (c) => c.subjectCode === 'MATH201',
      )!;

      expect(cs101.systemAction).toBe('KEEP');
      expect(cs101.systemScore).toBe(3);

      expect(cs102.systemAction).toBe('KEEP');
      expect(cs102.systemScore).toBe(1);

      expect(eng101.systemAction).toBe('DROP');
      expect(eng101.systemScore).toBe(0);

      expect(math201.systemAction).toBe('DROP');
      expect(math201.systemScore).toBe(0);
    });

    it('should preserve systemReason for debugging', () => {
      // Arrange
      const testSet = [
        createMockTestSetEntry({
          rawOutput: {
            llmAcceptedCoursesBySkill: {
              skill1: [
                createMockCourse({
                  subjectCode: 'CS101',
                  score: 3,
                  reason: 'Highly relevant to machine learning',
                }),
              ],
            },
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        }),
      ];

      // Act
      const result = transformer.transformTestSet(testSet);

      // Assert
      expect(result[0].courses[0].systemReason).toBe(
        'Highly relevant to machine learning',
      );
    });
  });
});
