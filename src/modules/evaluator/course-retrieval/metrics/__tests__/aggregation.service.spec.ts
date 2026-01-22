import {
  createMockEvaluationItem,
  createMockSkillMetrics,
  createMockTestCaseMetrics,
} from '../../__tests__/course-retrieval.fixture';
import { AggregationService } from '../aggregation.service';

describe('AggregationService', () => {
  describe('aggregateToTestCaseLevel', () => {
    it('should aggregate single skill to test case level', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'python',
          courseCount: 3,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.aggregateToTestCaseLevel(
        'test-case-1',
        'How do I learn Python?',
        skillMetrics,
      );

      // Assert
      expect(result.testCaseId).toBe('test-case-1');
      expect(result.question).toBe('How do I learn Python?');
      expect(result.totalSkills).toBe(1);
      expect(result.totalCourses).toBe(3);
      expect(result.macroAvg.averageSkillRelevance).toBe(2);
      expect(result.microAvg.averageSkillRelevance).toBe(2);
    });

    it('should aggregate multiple skills with equal weight (macro)', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'python',
          courseCount: 1,
          averageSkillRelevance: 2,
          averageContextAlignment: 2,
          alignmentGap: 0,
          contextMismatchRate: 0,
        }),
        createMockSkillMetrics({
          skillName: 'java',
          courseCount: 2,
          averageSkillRelevance: 3,
          averageContextAlignment: 3,
          alignmentGap: 0,
          contextMismatchRate: 0,
        }),
        createMockSkillMetrics({
          skillName: 'data analysis',
          courseCount: 3,
          averageSkillRelevance: 1,
          averageContextAlignment: 1,
          alignmentGap: 0,
          contextMismatchRate: 0,
        }),
      ];

      // Act
      const result = AggregationService.aggregateToTestCaseLevel(
        'test-case-2',
        'Test question?',
        skillMetrics,
      );

      // Assert: macro avg = (2 + 3 + 1) / 3 = 2
      expect(result.macroAvg.averageSkillRelevance).toBe(2);
      expect(result.macroAvg.averageContextAlignment).toBe(2);
    });

    it('should aggregate multiple skills weighted by count (micro)', () => {
      // Arrange: Create skillMetrics with proper structure
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'python',
          courseCount: 1,
          averageSkillRelevance: 2,
          averageContextAlignment: 2,
          alignmentGap: 0,
          contextMismatchRate: 0,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
        createMockSkillMetrics({
          skillName: 'java',
          courseCount: 2,
          averageSkillRelevance: 3,
          averageContextAlignment: 3,
          alignmentGap: 0,
          contextMismatchRate: 0,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 3,
              contextAlignment: 3,
            }),
            createMockEvaluationItem({
              skillRelevance: 3,
              contextAlignment: 3,
            }),
          ],
        }),
        createMockSkillMetrics({
          skillName: 'data analysis',
          courseCount: 3,
          averageSkillRelevance: 2,
          averageContextAlignment: 2,
          alignmentGap: 0,
          contextMismatchRate: 0,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.aggregateToTestCaseLevel(
        'test-case-3',
        'Test question?',
        skillMetrics,
      );

      // Assert: micro avg = (2*1 + 3*2 + 2*3) / 6 = 14/6 ≈ 2.333
      expect(result.microAvg.averageSkillRelevance).toBeCloseTo(2.333, 3);
    });

    it('should handle empty skill metrics array', () => {
      // Arrange
      const skillMetrics: any[] = [];

      // Act
      const result = AggregationService.aggregateToTestCaseLevel(
        'test-case-4',
        'Test question?',
        skillMetrics,
      );

      // Assert
      expect(result.totalSkills).toBe(0);
      expect(result.totalCourses).toBe(0);
      expect(result.macroAvg.averageSkillRelevance).toBe(0);
      expect(result.microAvg.averageSkillRelevance).toBe(0);
      expect(result.pooled.skillRelevanceDistribution).toEqual([]);
      expect(result.pooled.contextAlignmentDistribution).toEqual([]);
    });
  });

  describe('calculateMacroAverage', () => {
    it('should calculate macro average (equal weight per skill)', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({
          averageSkillRelevance: 2,
          averageContextAlignment: 2,
          alignmentGap: 0,
          contextMismatchRate: 10,
        }),
        createMockSkillMetrics({
          averageSkillRelevance: 2.5,
          averageContextAlignment: 3,
          alignmentGap: -0.5,
          contextMismatchRate: 20,
        }),
        createMockSkillMetrics({
          averageSkillRelevance: 3,
          averageContextAlignment: 1,
          alignmentGap: 2,
          contextMismatchRate: 30,
        }),
      ];

      // Act
      const result = AggregationService.calculateMacroAverage(skillMetrics);

      // Assert: (2 + 2.5 + 3) / 3 = 2.5
      expect(result.averageSkillRelevance).toBe(2.5);
      expect(result.averageContextAlignment).toBe(2);
      expect(result.alignmentGap).toBe(0.5);
      expect(result.contextMismatchRate).toBe(20);
    });

    it('should handle empty array for macro average', () => {
      // Arrange
      const skillMetrics: any[] = [];

      // Act
      const result = AggregationService.calculateMacroAverage(skillMetrics);

      // Assert
      expect(result.averageSkillRelevance).toBe(0);
      expect(result.averageContextAlignment).toBe(0);
      expect(result.alignmentGap).toBe(0);
      expect(result.contextMismatchRate).toBe(0);
    });

    it('should round macro average to 3 decimal places', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({ averageSkillRelevance: 2.3333333 }),
        createMockSkillMetrics({ averageSkillRelevance: 2.6666666 }),
      ];

      // Act
      const result = AggregationService.calculateMacroAverage(skillMetrics);

      // Assert: (2.3333333 + 2.6666666) / 3 = 2.5
      expect(result.averageSkillRelevance).toBeCloseTo(2.5, 3);
      expect(result.averageSkillRelevance).toBe(2.5);
    });
  });

  describe('calculateMicroAverage', () => {
    it('should calculate micro average weighted by course count', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'python',
          courseCount: 2,
          averageSkillRelevance: 2,
          averageContextAlignment: 2,
          alignmentGap: 0,
          contextMismatchRate: 0,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
        createMockSkillMetrics({
          skillName: 'java',
          courseCount: 1,
          averageSkillRelevance: 3,
          averageContextAlignment: 3,
          alignmentGap: 0,
          contextMismatchRate: 0,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 3,
              contextAlignment: 3,
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.calculateMicroAverage(skillMetrics);

      // Assert: (2*2 + 3*1) / 3 = 7/3 ≈ 2.333
      expect(result.averageSkillRelevance).toBeCloseTo(2.333, 3);
    });

    it('should handle zero total courses for micro average', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({ courseCount: 0, evaluations: [] }),
      ];

      // Act
      const result = AggregationService.calculateMicroAverage(skillMetrics);

      // Assert
      expect(result.averageSkillRelevance).toBe(0);
      expect(result.averageContextAlignment).toBe(0);
    });

    it('should pool mismatch rate across all courses', () => {
      // Arrange: Create skillMetrics with proper structure
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'machine learning',
          courseCount: 5,
          averageSkillRelevance: 2.2,
          averageContextAlignment: 0.8,
          alignmentGap: 1.4,
          contextMismatchRate: 60,
          evaluations: [
            // Mismatch: skill=3, context=1
            createMockEvaluationItem({
              subjectCode: 'ML101',
              skillRelevance: 3,
              contextAlignment: 1,
            }),
            // Mismatch: skill=2, context=0
            createMockEvaluationItem({
              subjectCode: 'ML102',
              skillRelevance: 2,
              contextAlignment: 0,
            }),
            // Mismatch: skill=3, context=1
            createMockEvaluationItem({
              subjectCode: 'ML103',
              skillRelevance: 3,
              contextAlignment: 1,
            }),
            // Not mismatch: skill=1, context=0 (skill < 2)
            createMockEvaluationItem({
              subjectCode: 'ML104',
              skillRelevance: 1,
              contextAlignment: 0,
            }),
            // Not mismatch: skill=2, context=2 (context > 1)
            createMockEvaluationItem({
              subjectCode: 'ML105',
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.calculateMicroAverage(skillMetrics);

      // Assert: 3 out of 5 are mismatches
      expect(result.contextMismatchRate).toBe(60);
    });
  });

  describe('poolDistributions', () => {
    it('should pool distributions across skills', () => {
      // Arrange
      const skillMetrics = [
        createMockSkillMetrics({
          skillName: 'skill1',
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 3,
              contextAlignment: 3,
            }),
            createMockEvaluationItem({
              skillRelevance: 3,
              contextAlignment: 3,
            }),
          ],
        }),
        createMockSkillMetrics({
          skillName: 'skill2',
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 1,
              contextAlignment: 1,
            }),
            createMockEvaluationItem({
              skillRelevance: 1,
              contextAlignment: 1,
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.poolDistributions(skillMetrics);

      // Assert
      expect(result.skillRelevanceDistribution).toHaveLength(2);
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 3,
        count: 2,
        percentage: 50,
      });
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 1,
        count: 2,
        percentage: 50,
      });
    });

    it('should handle empty skill metrics for pooling', () => {
      // Arrange
      const skillMetrics: any[] = [];

      // Act
      const result = AggregationService.poolDistributions(skillMetrics);

      // Assert
      expect(result.skillRelevanceDistribution).toEqual([]);
      expect(result.contextAlignmentDistribution).toEqual([]);
    });
  });

  describe('aggregateToIterationLevel', () => {
    it('should aggregate test cases to iteration level', () => {
      // Arrange
      const testCaseMetrics = [
        createMockTestCaseMetrics({
          testCaseId: 'tc1',
          totalCourses: 3,
          macroAvg: {
            averageSkillRelevance: 2,
            averageContextAlignment: 2,
            alignmentGap: 0,
            contextMismatchRate: 0,
          },
          microAvg: {
            averageSkillRelevance: 2,
            averageContextAlignment: 2,
            alignmentGap: 0,
            contextMismatchRate: 0,
          },
        }),
        createMockTestCaseMetrics({
          testCaseId: 'tc2',
          totalCourses: 5,
          macroAvg: {
            averageSkillRelevance: 3,
            averageContextAlignment: 3,
            alignmentGap: 0,
            contextMismatchRate: 0,
          },
          microAvg: {
            averageSkillRelevance: 3,
            averageContextAlignment: 3,
            alignmentGap: 0,
            contextMismatchRate: 0,
          },
        }),
      ];

      // Act
      const result = AggregationService.aggregateToIterationLevel(
        1,
        testCaseMetrics,
      );

      // Assert: macro avg = (2 + 3) / 2 = 2.5
      expect(result.macroAvg.averageSkillRelevance).toBe(2.5);
    });

    it('should calculate total context mismatches', () => {
      // Arrange
      const testCaseMetrics = [
        createMockTestCaseMetrics({
          skillMetrics: [
            createMockSkillMetrics({
              contextMismatchCourses: [
                createMockEvaluationItem({ subjectCode: 'CS101' }),
              ],
            }),
          ],
        }),
        createMockTestCaseMetrics({
          skillMetrics: [
            createMockSkillMetrics({
              contextMismatchCourses: [
                createMockEvaluationItem({ subjectCode: 'CS201' }),
                createMockEvaluationItem({ subjectCode: 'CS301' }),
              ],
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.aggregateToIterationLevel(
        1,
        testCaseMetrics,
      );

      // Assert
      expect(result.totalContextMismatches).toBe(3);
    });

    it('should pool distributions across test cases', () => {
      // Arrange
      const testCaseMetrics = [
        createMockTestCaseMetrics({
          skillMetrics: [
            createMockSkillMetrics({
              evaluations: [
                createMockEvaluationItem({
                  skillRelevance: 3,
                  contextAlignment: 3,
                }),
              ],
            }),
          ],
        }),
        createMockTestCaseMetrics({
          skillMetrics: [
            createMockSkillMetrics({
              evaluations: [
                createMockEvaluationItem({
                  skillRelevance: 1,
                  contextAlignment: 1,
                }),
              ],
            }),
          ],
        }),
      ];

      // Act
      const result = AggregationService.aggregateToIterationLevel(
        1,
        testCaseMetrics,
      );

      // Assert
      expect(result.pooled.skillRelevanceDistribution).toHaveLength(2);
    });

    it('should handle empty test case metrics', () => {
      // Arrange
      const testCaseMetrics: any[] = [];

      // Act
      const result = AggregationService.aggregateToIterationLevel(
        1,
        testCaseMetrics,
      );

      // Assert
      expect(result.macroAvg.averageSkillRelevance).toBe(0);
      expect(result.microAvg.averageSkillRelevance).toBe(0);
      expect(result.pooled.skillRelevanceDistribution).toEqual([]);
      expect(result.pooled.contextAlignmentDistribution).toEqual([]);
      expect(result.totalContextMismatches).toBe(0);
    });
  });
});
