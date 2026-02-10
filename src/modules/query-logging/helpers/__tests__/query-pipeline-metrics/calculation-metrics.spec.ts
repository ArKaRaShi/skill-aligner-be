import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';

import { QueryPipelineMetrics } from '../../query-pipeline-metrics.helper';
import {
  createEmptySkillCoursesMap,
  createMockAgegratedCoursesWithSameScores,
  createMockAggregatedCourses,
  createMockAggregatedCourseSkills,
  createMockCourseWithRelevance,
  createMockEmbeddingSkillUsage,
  createMockFilterResultMaps,
  createMockSkillCoursesMap,
  createMockSkillCoursesMapWithTies,
  EMBEDDING_COST_TEST_DATA,
  FILTER_METRICS_TEST_DATA,
} from './fixtures/query-pipeline-metrics.helper.fixture';

describe('QueryPipelineMetrics', () => {
  describe('calculateAggregationMetrics', () => {
    it('should return zero counts when no courses are aggregated', () => {
      // Arrange
      const filteredSkillCoursesMap = createEmptySkillCoursesMap();
      const aggregatedCourseSkills: never[] = [];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.rawCourseCount).toBe(0);
      expect(result.uniqueCourseCount).toBe(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.duplicateRate).toBe(0);
      expect(result.courses).toHaveLength(0);
      expect(result.contributingSkills).toEqual([]);
    });

    it('should calculate metrics when each skill has unique courses', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(false);
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      // data analysis: 2 courses, statistics: 1 course, python: 1 course = 4 total
      expect(result.rawCourseCount).toBe(4);
      expect(result.uniqueCourseCount).toBe(3);
      expect(result.duplicateCount).toBe(1); // CS102 appears in both data analysis and python
      expect(result.duplicateRate).toBe(25); // 1/4 * 100
      expect(result.courses).toHaveLength(3);
    });

    it('should calculate duplicate count and rate when courses appear across skills', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(true);
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      // data analysis: 2 courses, statistics: 2 courses, python: 1 course = 5 total
      expect(result.rawCourseCount).toBe(5);
      expect(result.uniqueCourseCount).toBe(3);
      expect(result.duplicateCount).toBe(2);
      expect(result.duplicateRate).toBe(40); // 2/5 * 100
    });

    it('should identify winning skills when there is a single highest score', () => {
      // Arrange
      const filteredSkillCoursesMap = new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              subjectCode: 'CS101',
              score: 3,
              reason: 'High relevance',
            }),
          ],
        ],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.courses[0].winningSkills).toEqual(['data analysis']);
      expect(result.courses[0].otherSkills).toEqual([]);
    });

    it('should handle ties when multiple skills have the same max score', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMapWithTies();
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      // CS101 has score 3 for both 'data analysis' and 'statistics'
      expect(result.courses[0].winningSkills).toHaveLength(2);
      expect(result.courses[0].winningSkills).toContain('data analysis');
      expect(result.courses[0].winningSkills).toContain('statistics');
    });

    it('should separate winning skills from other skills', () => {
      // Arrange
      const filteredSkillCoursesMap = new Map([
        [
          'data analysis',
          [createMockCourseWithRelevance({ subjectCode: 'CS101', score: 3 })],
        ],
        [
          'statistics',
          [createMockCourseWithRelevance({ subjectCode: 'CS101', score: 2 })],
        ],
        [
          'python',
          [createMockCourseWithRelevance({ subjectCode: 'CS101', score: 1 })],
        ],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.courses[0].winningSkills).toEqual(['data analysis']);
      expect(result.courses[0].otherSkills).toContain('statistics');
      expect(result.courses[0].otherSkills).toContain('python');
      expect(result.courses[0].otherSkills).not.toContain('data analysis');
    });

    it('should calculate score distribution across aggregated courses', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(false);
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.scoreDistribution.score1).toBe(1);
      expect(result.scoreDistribution.score2).toBe(1);
      expect(result.scoreDistribution.score3).toBe(1);
    });

    it('should handle all courses with same final score', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(false);
      const aggregatedCourseSkills = createMockAgegratedCoursesWithSameScores();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.scoreDistribution.score1).toBe(0);
      expect(result.scoreDistribution.score2).toBe(0);
      expect(result.scoreDistribution.score3).toBe(3);
    });

    it('should list all contributing skills', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(false);
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.contributingSkills).toContain('data analysis');
      expect(result.contributingSkills).toContain('statistics');
      expect(result.contributingSkills).toContain('python');
      expect(result.contributingSkills).toHaveLength(3);
    });

    it('should handle courses with no skill breakdown (edge case)', () => {
      // Arrange
      const courseWithCode = createMockCourseWithRelevance({
        subjectCode: 'CS999',
      });
      const filteredSkillCoursesMap = new Map([
        ['data analysis', [courseWithCode]],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS999',
          maxRelevanceScore: 1,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.courses[0].skillBreakdown).toHaveLength(1);
      expect(result.courses[0].skillCount).toBe(1);
      expect(result.courses[0].winningSkills).toHaveLength(1);
    });

    it('should include matched learning outcomes in skill breakdown', () => {
      // Arrange
      const courseWithLos = createMockCourseWithRelevance({
        subjectCode: 'CS101',
        score: 3,
      });
      const filteredSkillCoursesMap = new Map([
        ['data analysis', [courseWithLos]],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.courses[0].skillBreakdown[0].matchingLos).toBeDefined();
      expect(result.courses[0].skillBreakdown[0].matchedLoCount).toBe(
        courseWithLos.matchedLearningOutcomes.length,
      );
    });

    it('should handle empty filtered map with non-empty aggregated courses', () => {
      // Arrange
      const filteredSkillCoursesMap = createEmptySkillCoursesMap();
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.rawCourseCount).toBe(0);
      expect(result.uniqueCourseCount).toBe(3);
      // When filtered map is empty but courses exist, duplicateCount becomes negative
      // This is an edge case that shouldn't happen in practice
      expect(result.duplicateCount).toBe(-3);
      // duplicateRate is 0 when rawCourseCount is 0 (division by zero protection)
      expect(result.duplicateRate).toBe(0);
      expect(result.courses).toHaveLength(3);
      // All courses should have empty skill breakdown
      result.courses.forEach((course) => {
        expect(course.skillBreakdown).toHaveLength(0);
        expect(course.skillCount).toBe(0);
      });
    });

    it('should map course codes correctly from filtered map to aggregated courses', () => {
      // Arrange
      const filteredSkillCoursesMap = new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              subjectCode: 'CS101',
              score: 3,
            }),
          ],
        ],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          subjectName: 'Intro to CS',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.courses[0].subjectCode).toBe('CS101');
      expect(result.courses[0].subjectName).toBe('Intro to CS');
      expect(result.courses[0].finalScore).toBe(3);
    });

    it('should calculate duplicate rate as percentage', () => {
      // Arrange
      const filteredSkillCoursesMap = createMockSkillCoursesMap(true);
      const aggregatedCourseSkills = createMockAggregatedCourses();

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      // duplicateRate should be (duplicateCount / rawCourseCount) * 100
      const expectedRate =
        (result.duplicateCount / result.rawCourseCount) * 100;
      expect(result.duplicateRate).toBeCloseTo(
        expectedRate,
        DECIMAL_PRECISION.PERCENTAGE,
      );
      expect(result.duplicateRate).toBeGreaterThanOrEqual(0);
      expect(result.duplicateRate).toBeLessThanOrEqual(100);
    });

    it('should handle single course with multiple skills', () => {
      // Arrange
      const singleCourse = createMockCourseWithRelevance({
        subjectCode: 'CS101',
        score: 3,
      });
      const filteredSkillCoursesMap = new Map([
        ['data analysis', [singleCourse]],
        ['statistics', [singleCourse]],
        ['python', [singleCourse]],
      ]);
      const aggregatedCourseSkills = [
        createMockAggregatedCourseSkills({
          subjectCode: 'CS101',
          maxRelevanceScore: 3,
        }),
      ];

      // Act
      const result = QueryPipelineMetrics.calculateAggregationMetrics(
        filteredSkillCoursesMap,
        aggregatedCourseSkills,
      );

      // Assert
      expect(result.rawCourseCount).toBe(3);
      expect(result.uniqueCourseCount).toBe(1);
      expect(result.duplicateCount).toBe(2);
      expect(result.courses[0].skillCount).toBe(3);
      expect(result.courses[0].skillBreakdown).toHaveLength(3);
    });
  });

  describe('calculateEmbeddingCost', () => {
    it('should return zero cost when no skills are embedded', () => {
      // Arrange
      const embeddingUsage = EMBEDDING_COST_TEST_DATA.ZERO_SKILLS;

      // Act
      const result =
        QueryPipelineMetrics.calculateEmbeddingCost(embeddingUsage);

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate cost for a single embedded skill', () => {
      // Arrange
      const embeddingUsage = EMBEDDING_COST_TEST_DATA.SINGLE_SKILL;

      // Act
      const result =
        QueryPipelineMetrics.calculateEmbeddingCost(embeddingUsage);

      // Assert
      // e5-base is free (local model), so cost is 0
      expect(result).toBe(0);
    });

    it('should sum costs across multiple embedded skills', () => {
      // Arrange
      const embeddingUsage = EMBEDDING_COST_TEST_DATA.MULTIPLE_SKILLS;

      // Act
      const result =
        QueryPipelineMetrics.calculateEmbeddingCost(embeddingUsage);

      // Assert
      // All e5-base skills are free, so total cost is 0
      expect(result).toBe(0);
      // Cost should be sum of all individual skill costs
      const skill1Cost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[0]],
      });
      const skill2Cost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[1]],
      });
      const skill3Cost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[2]],
      });
      expect(result).toBeCloseTo(
        skill1Cost + skill2Cost + skill3Cost,
        DECIMAL_PRECISION.COST,
      );
    });

    it('should calculate different costs for different embedding models', () => {
      // Arrange
      const embeddingUsage = EMBEDDING_COST_TEST_DATA.DIFFERENT_MODELS;

      // Act
      const result =
        QueryPipelineMetrics.calculateEmbeddingCost(embeddingUsage);

      // Assert
      // e5-base is free, but openai/text-embedding-3-small has a cost
      expect(result).toBeGreaterThan(0);
      // Each model should have different cost structure
      const e5Cost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[0]],
      });
      const openaiCost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[1]],
      });
      expect(e5Cost).toBe(0); // e5-base is free
      expect(openaiCost).toBeGreaterThan(0); // OpenAI costs money
    });

    it('should handle skills with varying token counts', () => {
      // Arrange
      const embeddingUsage = {
        bySkill: [
          createMockEmbeddingSkillUsage({
            promptTokens: 1,
            model: 'openai/text-embedding-3-small',
          }),
          createMockEmbeddingSkillUsage({
            promptTokens: 100,
            model: 'openai/text-embedding-3-small',
          }),
          createMockEmbeddingSkillUsage({
            promptTokens: 1000,
            model: 'openai/text-embedding-3-small',
          }),
        ],
      };

      // Act
      const result =
        QueryPipelineMetrics.calculateEmbeddingCost(embeddingUsage);

      // Assert
      expect(result).toBeGreaterThan(0);
      // Cost should scale with token count
      const lowTokenCost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[0]],
      });
      const highTokenCost = QueryPipelineMetrics.calculateEmbeddingCost({
        bySkill: [embeddingUsage.bySkill[2]],
      });
      expect(highTokenCost).toBeGreaterThan(lowTokenCost);
    });
  });

  describe('calculateSkillFilterMetrics', () => {
    it('should return empty arrays and zero counts when skill has no results', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.EMPTY_RESULTS;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.skill).toBe(skill);
      expect(result.inputCount).toBe(0);
      expect(result.acceptedCount).toBe(0);
      expect(result.rejectedCount).toBe(0);
      expect(result.missingCount).toBe(0);
      expect(result.acceptedCourses).toEqual([]);
      expect(result.rejectedCourses).toEqual([]);
      expect(result.missingCourses).toEqual([]);
    });

    it('should calculate metrics when all courses are accepted', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.ALL_ACCEPTED;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.inputCount).toBe(2);
      expect(result.acceptedCount).toBe(2);
      expect(result.rejectedCount).toBe(0);
      expect(result.missingCount).toBe(0);
      expect(result.llmDecisionRate).toBe(1);
      expect(result.llmRejectionRate).toBe(0);
      expect(result.llmFallbackRate).toBe(0);
      expect(result.acceptedCourses).toHaveLength(2);
      expect(result.rejectedCourses).toHaveLength(0);
      expect(result.missingCourses).toHaveLength(0);
    });

    it('should calculate metrics when all courses are rejected', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.ALL_REJECTED;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.inputCount).toBe(2);
      expect(result.acceptedCount).toBe(0);
      expect(result.rejectedCount).toBe(2);
      expect(result.missingCount).toBe(0);
      expect(result.llmDecisionRate).toBe(1);
      expect(result.llmRejectionRate).toBe(1);
      expect(result.llmFallbackRate).toBe(0);
      expect(result.acceptedCourses).toHaveLength(0);
      expect(result.rejectedCourses).toHaveLength(2);
      expect(result.missingCourses).toHaveLength(0);
    });

    it('should calculate metrics when all courses are missing from LLM response', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.ALL_MISSING;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.inputCount).toBe(2);
      expect(result.acceptedCount).toBe(0);
      expect(result.rejectedCount).toBe(0);
      expect(result.missingCount).toBe(2);
      expect(result.llmDecisionRate).toBe(0);
      expect(result.llmRejectionRate).toBe(0);
      expect(result.llmFallbackRate).toBe(1);
      expect(result.acceptedCourses).toHaveLength(0);
      expect(result.rejectedCourses).toHaveLength(0);
      expect(result.missingCourses).toHaveLength(2);
    });

    it('should use default reason when course reason is null or undefined', () => {
      // Arrange
      const skill = 'data analysis';
      const courseWithNullReason = createMockCourseWithRelevance({
        reason: null as unknown as string,
      });
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map([[skill, [courseWithNullReason]]]),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map(),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.acceptedCourses[0].reason).toBe('No reason provided');
    });

    it('should use missing-specific default reason for missing courses with null reason', () => {
      // Arrange
      const skill = 'data analysis';
      const courseWithNullReason = createMockCourseWithRelevance({
        reason: null as unknown as string,
      });
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map(),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map([[skill, [courseWithNullReason]]]),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.missingCourses[0].reason).toBe('Not found in LLM response');
    });

    it('should calculate score distribution from accepted courses only', () => {
      // Arrange
      const skill = 'data analysis';
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map([
          [
            skill,
            [
              createMockCourseWithRelevance({ score: 3 }),
              createMockCourseWithRelevance({ score: 2 }),
              createMockCourseWithRelevance({ score: 1 }),
              createMockCourseWithRelevance({ score: 3 }),
              createMockCourseWithRelevance({ score: 3 }),
            ],
          ],
        ]),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map(),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.scoreDistribution.score1).toBe(1);
      expect(result.scoreDistribution.score2).toBe(1);
      expect(result.scoreDistribution.score3).toBe(3);
    });

    it('should return all zero scores when no accepted courses', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.ALL_REJECTED;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.scoreDistribution.score1).toBe(0);
      expect(result.scoreDistribution.score2).toBe(0);
      expect(result.scoreDistribution.score3).toBe(0);
    });

    it('should calculate average score from accepted courses', () => {
      // Arrange
      const skill = 'data analysis';
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map([
          [
            skill,
            [
              createMockCourseWithRelevance({ score: 3 }),
              createMockCourseWithRelevance({ score: 2 }),
              createMockCourseWithRelevance({ score: 1 }),
            ],
          ],
        ]),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map(),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.avgScore).toBeCloseTo(2, DECIMAL_PRECISION.RATE_COARSE);
    });

    it('should return undefined average score when no accepted courses', () => {
      // Arrange
      const { skill, filterResult } = FILTER_METRICS_TEST_DATA.EMPTY_RESULTS;

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.avgScore).toBeUndefined();
    });

    it('should calculate mixed results with accepted, rejected, and missing courses', () => {
      // Arrange
      const skill = 'data analysis';
      const filterResult = createMockFilterResultMaps();

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.inputCount).toBe(3);
      expect(result.acceptedCount).toBe(1);
      expect(result.rejectedCount).toBe(1);
      expect(result.missingCount).toBe(1);
      expect(result.llmDecisionRate).toBeCloseTo(
        2 / 3,
        DECIMAL_PRECISION.PERCENTAGE,
      );
      expect(result.llmRejectionRate).toBeCloseTo(
        0.5,
        DECIMAL_PRECISION.PERCENTAGE,
      );
      expect(result.llmFallbackRate).toBeCloseTo(
        1 / 3,
        DECIMAL_PRECISION.PERCENTAGE,
      );
    });

    it('should map matched learning outcomes correctly', () => {
      // Arrange
      const skill = 'data analysis';
      const baseCourse = createMockCourseWithRelevance();
      const courseWithLos = createMockCourseWithRelevance({
        matchedLearningOutcomes: [
          { ...baseCourse.matchedLearningOutcomes[0] },
          { ...baseCourse.matchedLearningOutcomes[1] },
        ],
      });
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map([[skill, [courseWithLos]]]),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map(),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      expect(result.acceptedCourses[0].matchedLos).toHaveLength(2);
      expect(result.acceptedCourses[0].matchedLos[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
      });
    });

    it('should handle courses with invalid scores gracefully', () => {
      // Arrange
      const skill = 'data analysis';
      const courseWithInvalidScore = createMockCourseWithRelevance({
        score: 5, // Invalid score (should be 0-3)
      });
      const filterResult = {
        llmAcceptedCoursesBySkill: new Map([[skill, [courseWithInvalidScore]]]),
        llmRejectedCoursesBySkill: new Map(),
        llmMissingCoursesBySkill: new Map(),
      };

      // Act
      const result = QueryPipelineMetrics.calculateSkillFilterMetrics(
        skill,
        filterResult,
      );

      // Assert
      // Invalid score should not appear in distribution
      expect(result.scoreDistribution.score1).toBe(0);
      expect(result.scoreDistribution.score2).toBe(0);
      expect(result.scoreDistribution.score3).toBe(0);
    });
  });
});
