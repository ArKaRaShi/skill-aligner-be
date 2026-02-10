import { beforeEach, describe, expect, it } from '@jest/globals';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenLogger, TokenMap } from 'src/shared/utils/token-logger.helper';

import { CourseRelevanceFilterResultV2 } from '../../types/course-relevance-filter.type';
import { CourseFilterHelper } from '../course-filter.helper';

/**
 * Test factory for creating a mock course with relevance score.
 */
const createMockCourseWithRelevance = (
  subjectCode: string,
  subjectName: string,
  score: number,
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
    matchedLearningOutcomes: [learningOutcome],
    remainingLearningOutcomes: [],
    allLearningOutcomes: [learningOutcome],
    score,
    reason: 'Test relevance reason',
  };
};

/**
 * Test factory for creating a mock filter result.
 */
const createMockFilterResult = (
  skillName: string,
  courses: Array<ReturnType<typeof createMockCourseWithRelevance>>,
  tokenUsage: { model: string; inputTokens: number; outputTokens: number },
): CourseRelevanceFilterResultV2 => ({
  llmAcceptedCoursesBySkill: new Map([[skillName, courses]]),
  llmRejectedCoursesBySkill: new Map(),
  llmMissingCoursesBySkill: new Map(),
  llmInfo: {
    provider: 'openai',
    model: tokenUsage.model,
  } as LlmInfo,
  tokenUsage: {
    model: tokenUsage.model,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
  },
});

describe('CourseFilterHelper', () => {
  let tokenLogger: TokenLogger;
  let tokenMap: TokenMap;

  beforeEach(() => {
    tokenLogger = new TokenLogger();
    tokenMap = tokenLogger.initializeTokenMap();
  });

  describe('aggregateFilteredCourses', () => {
    describe('aggregation behavior', () => {
      it('should aggregate courses from multiple filter results', () => {
        // Arrange
        const filterResults = [
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS101', 'Intro to Python', 3)],
            { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
          ),
          createMockFilterResult(
            'javascript',
            [createMockCourseWithRelevance('CS201', 'Intro to JS', 2)],
            { model: 'gpt-4', inputTokens: 80, outputTokens: 40 },
          ),
        ];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(2);
        expect(aggregatedMap.get('python')).toHaveLength(1);
        expect(aggregatedMap.get('python')![0].subjectCode).toBe('CS101');
        expect(aggregatedMap.get('javascript')).toHaveLength(1);
        expect(aggregatedMap.get('javascript')![0].subjectCode).toBe('CS201');
      });

      it('should merge courses from the same skill across multiple batches', () => {
        // Arrange - Same skill appears in multiple filter results
        const filterResults = [
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS101', 'Intro to Python', 3)],
            { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
          ),
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS201', 'Advanced Python', 2)],
            { model: 'gpt-4', inputTokens: 80, outputTokens: 40 },
          ),
        ];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert - Both courses should be under 'python' skill
        expect(aggregatedMap.size).toBe(1);
        const pythonCourses = aggregatedMap.get('python')!;
        expect(pythonCourses).toHaveLength(2);
        expect(pythonCourses.map((c) => c.subjectCode)).toEqual([
          'CS101',
          'CS201',
        ]);
      });

      it('should handle multiple courses per skill in single filter result', () => {
        // Arrange
        const courses = [
          createMockCourseWithRelevance('CS101', 'Intro to Python', 3),
          createMockCourseWithRelevance('CS201', 'Advanced Python', 2),
          createMockCourseWithRelevance('CS301', 'Python Expert', 1),
        ];
        const filterResults = [
          createMockFilterResult('python', courses, {
            model: 'gpt-4',
            inputTokens: 200,
            outputTokens: 100,
          }),
        ];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(1);
        expect(aggregatedMap.get('python')).toHaveLength(3);
      });

      it('should preserve relevance scores from filter results', () => {
        // Arrange
        const courses = [
          createMockCourseWithRelevance('CS101', 'Intro', 1),
          createMockCourseWithRelevance('CS201', 'Advanced', 3),
        ];
        const filterResults = [
          createMockFilterResult('python', courses, {
            model: 'gpt-4',
            inputTokens: 100,
            outputTokens: 50,
          }),
        ];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert - Scores should be preserved
        const pythonCourses = aggregatedMap.get('python')!;
        expect(pythonCourses[0].score).toBe(1);
        expect(pythonCourses[0].reason).toBe('Test relevance reason');
        expect(pythonCourses[1].score).toBe(3);
        expect(pythonCourses[1].reason).toBe('Test relevance reason');
      });
    });

    describe('token tracking', () => {
      it('should record token usage for each filter result', () => {
        // Arrange
        const filterResults = [
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS101', 'Intro', 3)],
            { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
          ),
          createMockFilterResult(
            'javascript',
            [createMockCourseWithRelevance('CS201', 'Intro', 2)],
            { model: 'gpt-4', inputTokens: 80, outputTokens: 40 },
          ),
        ];

        // Act
        CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert - Should have 2 token records (one per filter result)
        const step4Tokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(step4Tokens).not.toBeNull();
        expect(step4Tokens!.inputTokens).toBe(180); // 100 + 80
        expect(step4Tokens!.outputTokens).toBe(90); // 50 + 40
      });

      it('should handle different token usage categories independently', () => {
        // Arrange
        const filterResults = [
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS101', 'Intro', 3)],
            { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
          ),
        ];

        // Act - Add to different category
        CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'CUSTOM_CATEGORY',
          tokenLogger,
        );

        // Assert
        const customTokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'CUSTOM_CATEGORY',
        );
        expect(customTokens!.inputTokens).toBe(100);

        const step4Tokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(step4Tokens).toBeNull(); // Different category
      });

      it('should calculate cost correctly for recorded tokens', () => {
        // Arrange - Use registered model ID from model registry
        const filterResults = [
          createMockFilterResult(
            'python',
            [createMockCourseWithRelevance('CS101', 'Intro', 3)],
            {
              model: 'openai/gpt-4o-mini',
              inputTokens: 1000,
              outputTokens: 500,
            },
          ),
        ];

        // Act
        CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        const cost = tokenLogger.getTotalCostForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(cost).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty filter results array', () => {
        // Arrange
        const filterResults: CourseRelevanceFilterResultV2[] = [];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(0);
        expect(aggregatedMap).toBeInstanceOf(Map);
      });

      it('should handle filter result with no accepted courses', () => {
        // Arrange - Filter result with empty accepted courses map
        const filterResult: CourseRelevanceFilterResultV2 = {
          llmAcceptedCoursesBySkill: new Map(),
          llmRejectedCoursesBySkill: new Map(),
          llmMissingCoursesBySkill: new Map(),
          llmInfo: { provider: 'openai', model: 'gpt-4' } as LlmInfo,
          tokenUsage: { model: 'gpt-4', inputTokens: 50, outputTokens: 25 },
        };

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          [filterResult],
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(0);
        // Token usage should still be recorded
        const tokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(tokens!.inputTokens).toBe(50);
      });

      it('should handle filter result with empty courses array for a skill', () => {
        // Arrange - Skill exists but has empty courses array
        const filterResult: CourseRelevanceFilterResultV2 = {
          llmAcceptedCoursesBySkill: new Map([['python', []]]),
          llmRejectedCoursesBySkill: new Map(),
          llmMissingCoursesBySkill: new Map(),
          llmInfo: { provider: 'openai', model: 'gpt-4' } as LlmInfo,
          tokenUsage: { model: 'gpt-4', inputTokens: 50, outputTokens: 25 },
        };

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          [filterResult],
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert - Skill should exist with empty array
        expect(aggregatedMap.size).toBe(1);
        expect(aggregatedMap.get('python')).toEqual([]);
      });

      it('should not mutate input filter results', () => {
        // Arrange
        const originalCourses = [
          createMockCourseWithRelevance('CS101', 'Intro', 3),
        ];
        const filterResults = [
          createMockFilterResult('python', originalCourses, {
            model: 'gpt-4',
            inputTokens: 100,
            outputTokens: 50,
          }),
        ];

        // Act
        CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert - Original filter results should be unchanged
        const acceptedCourses =
          filterResults[0].llmAcceptedCoursesBySkill.get('python');
        expect(acceptedCourses).toHaveLength(1);
        expect(acceptedCourses![0].subjectCode).toBe('CS101');
      });

      it('should handle large numbers of filter results efficiently', () => {
        // Arrange - Simulate batch processing
        const filterResults = Array.from({ length: 50 }, (_, i) =>
          createMockFilterResult(
            `skill-${i}`,
            [createMockCourseWithRelevance(`CS${i}`, `Course ${i}`, 3)],
            { model: 'gpt-4', inputTokens: 50, outputTokens: 25 },
          ),
        );

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(50);
        expect(aggregatedMap.get('skill-0')![0].subjectCode).toBe('CS0');
        expect(aggregatedMap.get('skill-49')![0].subjectCode).toBe('CS49');

        // All token usage should be recorded
        const tokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(tokens!.inputTokens).toBe(2500); // 50 * 50
        expect(tokens!.outputTokens).toBe(1250); // 50 * 25
      });
    });

    describe('integration scenarios', () => {
      it('should handle realistic multi-skill filtering scenario', () => {
        // Arrange - Simulate real scenario: question about "web development"
        // might match skills: javascript, typescript, react, html, css
        const filterResults = [
          createMockFilterResult(
            'javascript',
            [
              createMockCourseWithRelevance('CS101', 'JavaScript Basics', 3),
              createMockCourseWithRelevance('CS102', 'JavaScript Advanced', 2),
            ],
            { model: 'gpt-4', inputTokens: 150, outputTokens: 75 },
          ),
          createMockFilterResult(
            'typescript',
            [createMockCourseWithRelevance('CS201', 'TypeScript Fund', 3)],
            { model: 'gpt-4', inputTokens: 120, outputTokens: 60 },
          ),
          createMockFilterResult(
            'react',
            [createMockCourseWithRelevance('CS301', 'React Development', 3)],
            { model: 'gpt-4', inputTokens: 130, outputTokens: 65 },
          ),
          createMockFilterResult(
            'html',
            [
              createMockCourseWithRelevance('CS401', 'HTML/CSS Intro', 2),
              createMockCourseWithRelevance('CS402', 'Advanced CSS', 1),
            ],
            { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
          ),
        ];

        // Act
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          filterResults,
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
          tokenLogger,
        );

        // Assert
        expect(aggregatedMap.size).toBe(4);
        expect(aggregatedMap.get('javascript')).toHaveLength(2);
        expect(aggregatedMap.get('typescript')).toHaveLength(1);
        expect(aggregatedMap.get('react')).toHaveLength(1);
        expect(aggregatedMap.get('html')).toHaveLength(2);

        // Total tokens from all 4 filter batches
        const totalTokens = tokenLogger.getTotalTokensForCategory(
          tokenMap,
          'STEP4_COURSE_RELEVANCE_FILTER',
        );
        expect(totalTokens!.inputTokens).toBe(500); // 150+120+130+100
        expect(totalTokens!.outputTokens).toBe(250); // 75+60+65+50
      });
    });
  });
});
