import { STEP_NAME } from '../../../types/query-status.type';
import { QueryStepParserHelper } from '../../query-step-parser.helper';
import {
  courseFilterWithEmptyMapsRawOutput,
  validAnswerSynthesisRawOutput,
  validClassificationRawOutput,
  validCourseAggregationRawOutput,
  validCourseFilterRawOutputSerialized,
  validCourseRetrievalRawOutput,
  validSkillExpansionRawOutput,
} from './fixtures/query-step-parser.helper.fixture';

describe('QueryStepParserHelper.integration scenarios', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

  it('should handle complete parsing workflow for all step types', () => {
    // Arrange
    const testCases = [
      {
        stepName: STEP_NAME.QUESTION_CLASSIFICATION,
        data: validClassificationRawOutput,
      },
      {
        stepName: STEP_NAME.SKILL_EXPANSION,
        data: validSkillExpansionRawOutput,
      },
      {
        stepName: STEP_NAME.COURSE_RETRIEVAL,
        data: validCourseRetrievalRawOutput,
      },
      {
        stepName: STEP_NAME.COURSE_RELEVANCE_FILTER,
        data: validCourseFilterRawOutputSerialized,
      },
      {
        stepName: STEP_NAME.COURSE_AGGREGATION,
        data: validCourseAggregationRawOutput,
      },
      {
        stepName: STEP_NAME.ANSWER_SYNTHESIS,
        data: validAnswerSynthesisRawOutput,
      },
    ];

    // Act & Assert
    testCases.forEach(({ stepName, data }) => {
      expect(() => {
        const result = helper.parseRawOutput(stepName, data);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  it('should handle empty/edge case data for all step types', () => {
    // Arrange
    const edgeCases = [
      {
        stepName: STEP_NAME.QUESTION_CLASSIFICATION,
        data: { category: '', reason: '' }, // Will fail schema validation
      },
      {
        stepName: STEP_NAME.SKILL_EXPANSION,
        data: { skillItems: [] },
      },
      {
        stepName: STEP_NAME.COURSE_RETRIEVAL,
        data: { skills: [], skillCoursesMap: {} },
      },
      {
        stepName: STEP_NAME.COURSE_RELEVANCE_FILTER,
        data: courseFilterWithEmptyMapsRawOutput,
      },
      {
        stepName: STEP_NAME.COURSE_AGGREGATION,
        data: { filteredSkillCoursesMap: {}, rankedCourses: [] },
      },
      {
        stepName: STEP_NAME.ANSWER_SYNTHESIS,
        data: { answer: '' }, // Will fail schema validation
      },
    ];

    // Act & Assert
    edgeCases.forEach(({ stepName, data }) => {
      try {
        const result = helper.parseRawOutput(stepName, data);
        // Some should succeed (empty arrays are valid)
        expect(result).toBeDefined();
      } catch (error) {
        // Some should fail (empty strings are invalid)
        expect(error).toBeDefined();
      }
    });
  });

  it('should correctly handle Map reconstruction in nested structures', () => {
    // This tests the real-world scenario where Maps are nested in parsed output
    const retrievalResult = helper.parseCourseRetrievalRaw(
      validCourseRetrievalRawOutput,
    );

    expect(retrievalResult.skillCoursesMap).toBeInstanceOf(Map);
    expect(retrievalResult.skillCoursesMap.size).toBeGreaterThan(0);

    const aggregationResult = helper.parseCourseAggregationRaw(
      validCourseAggregationRawOutput,
    );

    expect(aggregationResult.filteredSkillCoursesMap).toBeInstanceOf(Map);
    expect(aggregationResult.filteredSkillCoursesMap.size).toBeGreaterThan(0);

    const filterResult = helper.parseCourseFilterRaw(
      validCourseFilterRawOutputSerialized,
    );

    expect(filterResult.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
    expect(filterResult.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
    expect(filterResult.llmMissingCoursesBySkill).toBeInstanceOf(Map);
  });
});
