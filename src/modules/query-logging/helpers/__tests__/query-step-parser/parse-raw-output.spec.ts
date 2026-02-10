import { Logger } from '@nestjs/common';

import type {
  AnswerSynthesisRawOutput,
  CourseAggregationRawOutput,
  CourseFilterRawOutput,
  CourseRetrievalRawOutput,
  SkillExpansionRawOutput,
} from '../../../types/query-log-step.type';
import { STEP_NAME } from '../../../types/query-status.type';
import { QueryStepParserHelper } from '../../query-step-parser.helper';
import {
  courseAggregationWithMultipleSkillsRawOutput,
  courseFilterWithEmptyMapsRawOutput,
  courseFilterWithPartialMapsRawOutput,
  createMockCourse,
  validAnswerSynthesisRawOutput,
  validClassificationRawOutput,
  validCourseAggregationRawOutput,
  validCourseFilterRawOutputSerialized,
  validCourseRetrievalRawOutput,
  validCourseRetrievalWithoutEmbeddingRawOutput,
  validSkillExpansionRawOutput,
} from './fixtures/query-step-parser.helper.fixture';

describe('QueryStepParserHelper.parseRawOutput', () => {
  let helper: QueryStepParserHelper;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should parse QUESTION_CLASSIFICATION step output', () => {
    // Arrange
    const stepName = STEP_NAME.QUESTION_CLASSIFICATION;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validClassificationRawOutput,
    );

    // Assert
    expect(result).toEqual(validClassificationRawOutput);
    expect(loggerDebugSpy).toHaveBeenCalledWith(
      `Parsing raw output for step: ${stepName}`,
    );
  });

  it('should parse SKILL_EXPANSION step output', () => {
    // Arrange
    const stepName = STEP_NAME.SKILL_EXPANSION;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validSkillExpansionRawOutput,
    ) as SkillExpansionRawOutput;

    // Assert
    expect(result).toEqual(validSkillExpansionRawOutput);
    expect(result.skillItems).toHaveLength(2);
  });

  it('should parse COURSE_RETRIEVAL step output and reconstruct Map', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_RETRIEVAL;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validCourseRetrievalRawOutput,
    ) as CourseRetrievalRawOutput;

    // Assert
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('skillCoursesMap');
    expect(result).toHaveProperty('embeddingUsage');
    expect(result.skillCoursesMap).toBeInstanceOf(Map);
    expect(result.skillCoursesMap.size).toBe(2);
    expect(result.skillCoursesMap.get('python')).toEqual([
      createMockCourse({ subjectCode: 'CS201' }),
    ]);
  });

  it('should parse COURSE_RETRIEVAL step without optional embeddingUsage', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_RETRIEVAL;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validCourseRetrievalWithoutEmbeddingRawOutput,
    ) as CourseRetrievalRawOutput;

    // Assert
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('skillCoursesMap');
    expect(result).not.toHaveProperty('embeddingUsage');
    expect(result.skillCoursesMap).toBeInstanceOf(Map);
  });

  it('should parse COURSE_RELEVANCE_FILTER step output and reconstruct all Maps', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_RELEVANCE_FILTER;

    // Act - Clone the fixture to avoid mutation across tests
    const result = helper.parseRawOutput(
      stepName,
      structuredClone(validCourseFilterRawOutputSerialized),
    ) as CourseFilterRawOutput;

    // Assert
    expect(result).toHaveProperty('llmAcceptedCoursesBySkill');
    expect(result).toHaveProperty('llmRejectedCoursesBySkill');
    expect(result).toHaveProperty('llmMissingCoursesBySkill');
    expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmMissingCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmAcceptedCoursesBySkill.size).toBe(2);
    expect(result.llmRejectedCoursesBySkill.size).toBe(1);
    expect(result.llmMissingCoursesBySkill.size).toBe(1);
  });

  it('should parse COURSE_RELEVANCE_FILTER with empty Maps', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_RELEVANCE_FILTER;

    // Act - Clone the fixture to avoid mutation across tests
    const result = helper.parseRawOutput(
      stepName,
      structuredClone(courseFilterWithEmptyMapsRawOutput),
    ) as CourseFilterRawOutput;

    // Assert
    expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmMissingCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmAcceptedCoursesBySkill.size).toBe(0);
    expect(result.llmRejectedCoursesBySkill.size).toBe(0);
    expect(result.llmMissingCoursesBySkill.size).toBe(0);
  });

  it('should parse COURSE_RELEVANCE_FILTER with partial Maps (some undefined)', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_RELEVANCE_FILTER;

    // Act - Clone the fixture to avoid mutation across tests
    const result = helper.parseRawOutput(
      stepName,
      structuredClone(courseFilterWithPartialMapsRawOutput),
    ) as CourseFilterRawOutput;

    // Assert
    expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
    expect(result.llmAcceptedCoursesBySkill.size).toBe(1);
    // Partial maps should be undefined or empty Map
    expect(result.llmRejectedCoursesBySkill ?? new Map()).toBeInstanceOf(Map);
    expect(result.llmMissingCoursesBySkill ?? new Map()).toBeInstanceOf(Map);
  });

  it('should parse COURSE_AGGREGATION step output and reconstruct Map', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_AGGREGATION;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validCourseAggregationRawOutput,
    ) as CourseAggregationRawOutput;

    // Assert
    expect(result).toHaveProperty('filteredSkillCoursesMap');
    expect(result).toHaveProperty('rankedCourses');
    expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
    expect(result.filteredSkillCoursesMap.size).toBe(2);
    expect(Array.isArray(result.rankedCourses)).toBe(true);
  });

  it('should parse COURSE_AGGREGATION with multiple skills', () => {
    // Arrange
    const stepName = STEP_NAME.COURSE_AGGREGATION;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      courseAggregationWithMultipleSkillsRawOutput,
    ) as CourseAggregationRawOutput;

    // Assert
    expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
    expect(result.filteredSkillCoursesMap.size).toBe(3);
    expect(result.filteredSkillCoursesMap.get('python')).toHaveLength(2);
    expect(result.filteredSkillCoursesMap.get('javascript')).toHaveLength(1);
    expect(result.filteredSkillCoursesMap.get('datastructures')).toHaveLength(
      1,
    );
    expect(result.rankedCourses).toHaveLength(3);
  });

  it('should parse ANSWER_SYNTHESIS step output', () => {
    // Arrange
    const stepName = STEP_NAME.ANSWER_SYNTHESIS;

    // Act
    const result = helper.parseRawOutput(
      stepName,
      validAnswerSynthesisRawOutput,
    ) as AnswerSynthesisRawOutput;

    // Assert
    expect(result).toEqual(validAnswerSynthesisRawOutput);
    expect(result.answer).toContain('Python programming');
  });

  it('should throw error for unknown step name', () => {
    // Arrange
    const invalidStepName = 'UNKNOWN_STEP' as any;

    // Act & Assert
    expect(() => {
      helper.parseRawOutput(invalidStepName, validClassificationRawOutput);
    }).toThrow(`Unknown stepName: ${invalidStepName}`);
  });

  it('should validate schema for all step names (empty objects fail for most, except COURSE_RELEVANCE_FILTER)', () => {
    // Act & Assert
    // Most steps use Zod schemas and will fail on empty objects
    // COURSE_RELEVANCE_FILTER uses type assertion and won't fail
    const stepsWithZodValidation = [
      STEP_NAME.QUESTION_CLASSIFICATION,
      STEP_NAME.SKILL_EXPANSION,
      STEP_NAME.COURSE_RETRIEVAL,
      STEP_NAME.COURSE_AGGREGATION,
      STEP_NAME.ANSWER_SYNTHESIS,
    ];

    stepsWithZodValidation.forEach((stepName) => {
      expect(() => {
        helper.parseRawOutput(stepName, {});
      }).toThrow();
    });

    // COURSE_RELEVANCE_FILTER uses type assertion, so it won't throw

    expect(() => {
      helper.parseRawOutput(STEP_NAME.COURSE_RELEVANCE_FILTER, {});
    }).not.toThrow();
  });
});
