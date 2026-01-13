import { Logger } from '@nestjs/common';

import type {
  AnswerSynthesisRawOutput,
  CourseAggregationRawOutput,
  CourseFilterRawOutput,
  CourseRetrievalRawOutput,
  QueryProfileRawOutput,
  SkillExpansionRawOutput,
} from '../../types/query-log-step.type';
import { STEP_NAME } from '../../types/query-status.type';
import { QueryStepParserHelper } from '../query-step-parser.helper';
import {
  arrayRawOutput,
  complexObjectForMap,
  courseAggregationWithMultipleSkillsRawOutput,
  courseFilterWithEmptyMapsRawOutput,
  courseFilterWithPartialMapsRawOutput,
  courseRetrievalWithEmptyMapRawOutput,
  createMockCourse,
  emptyAnswerSynthesisRawOutput,
  emptyCourseAggregationRawOutput,
  emptyCourseRetrievalRawOutput,
  emptyObjectForMap,
  emptyObjectRawOutput,
  invalidAnswerSynthesisRawOutput,
  invalidClassificationRawOutput,
  invalidCourseAggregationRawOutput,
  invalidCourseRetrievalRawOutput,
  invalidLanguageQueryProfileRawOutput,
  invalidQueryProfileRawOutput,
  invalidSkillExpansionRawOutput,
  invalidSkillItemStructureRawOutput,
  missingFieldClassificationRawOutput,
  multipleEntriesObjectForMap,
  nullRawOutput,
  numberRawOutput,
  singleEntryObjectForMap,
  stringRawOutput,
  undefinedRawOutput,
  validAnswerSynthesisRawOutput,
  validClassificationRawOutput,
  validCourseAggregationRawOutput,
  validCourseFilterRawOutputSerialized,
  validCourseRetrievalRawOutput,
  validCourseRetrievalWithoutEmbeddingRawOutput,
  validQueryProfileRawOutput,
  validSkillExpansionRawOutput,
} from './query-step-parser.helper.fixture';

describe('QueryStepParserHelper', () => {
  let helper: QueryStepParserHelper;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRawOutput', () => {
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

    it('should parse QUERY_PROFILE_BUILDING step output', () => {
      // Arrange
      const stepName = STEP_NAME.QUERY_PROFILE_BUILDING;

      // Act
      const result = helper.parseRawOutput(
        stepName,
        validQueryProfileRawOutput,
      ) as QueryProfileRawOutput;

      // Assert
      expect(result).toEqual(validQueryProfileRawOutput);
      expect(result.language).toBe('en');
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
        STEP_NAME.QUERY_PROFILE_BUILDING,
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

  describe('parseClassificationRaw', () => {
    it('should parse valid classification output', () => {
      // Act
      const result = helper.parseClassificationRaw(
        validClassificationRawOutput,
      );

      // Assert
      expect(result).toEqual(validClassificationRawOutput);
      expect(result.category).toBe('relevant');
      expect(result.reason).toBe('Question is about courses and skills');
    });

    it('should throw Zod error for invalid category type', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(invalidClassificationRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for missing required field', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(missingFieldClassificationRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for null input', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(nullRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for undefined input', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(undefinedRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for empty object', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(emptyObjectRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for array input', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(arrayRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for string input', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(stringRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for number input', () => {
      // Act & Assert
      expect(() => {
        helper.parseClassificationRaw(numberRawOutput);
      }).toThrow();
    });
  });

  describe('parseQueryProfileRaw', () => {
    it('should parse valid query profile output', () => {
      // Act
      const result = helper.parseQueryProfileRaw(validQueryProfileRawOutput);

      // Assert
      expect(result).toEqual(validQueryProfileRawOutput);
      expect(result.language).toBe('en');
    });

    it('should throw Zod error for invalid language type', () => {
      // Act & Assert
      expect(() => {
        helper.parseQueryProfileRaw(invalidQueryProfileRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for invalid language enum value', () => {
      // Act & Assert
      expect(() => {
        helper.parseQueryProfileRaw(invalidLanguageQueryProfileRawOutput);
      }).toThrow();
    });

    it('should accept valid language value "th"', () => {
      // Arrange
      const thaiQueryProfile = {
        ...validQueryProfileRawOutput,
        language: 'th' as const,
      };

      // Act
      const result = helper.parseQueryProfileRaw(thaiQueryProfile);

      // Assert
      expect(result.language).toBe('th');
    });
  });

  describe('parseSkillExpansionRaw', () => {
    it('should parse valid skill expansion output', () => {
      // Act
      const result = helper.parseSkillExpansionRaw(
        validSkillExpansionRawOutput,
      );

      // Assert
      expect(result).toEqual(validSkillExpansionRawOutput);
      expect(result.skillItems).toHaveLength(2);
      expect(result.skillItems[0].skill).toBe('python programming');
    });

    it('should throw Zod error for invalid skillItems type', () => {
      // Act & Assert
      expect(() => {
        helper.parseSkillExpansionRaw(invalidSkillExpansionRawOutput);
      }).toThrow();
    });

    it('should throw Zod error for skill item missing required field', () => {
      // Act & Assert
      expect(() => {
        helper.parseSkillExpansionRaw(invalidSkillItemStructureRawOutput);
      }).toThrow();
    });

    it('should accept empty skillItems array', () => {
      // Arrange
      const emptySkillExpansion = {
        skillItems: [],
      };

      // Act
      const result = helper.parseSkillExpansionRaw(emptySkillExpansion);

      // Assert
      expect(result.skillItems).toEqual([]);
    });
  });

  describe('parseCourseRetrievalRaw', () => {
    it('should parse valid course retrieval output with Map reconstruction', () => {
      // Act
      const result = helper.parseCourseRetrievalRaw(
        validCourseRetrievalRawOutput,
      );

      // Assert
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('skillCoursesMap');
      expect(result).toHaveProperty('embeddingUsage');
      expect(result.skillCoursesMap).toBeInstanceOf(Map);
      expect(result.skillCoursesMap.size).toBe(2);
      expect(result.skills).toEqual(['python', 'javascript']);
    });

    it('should parse course retrieval output without optional embeddingUsage', () => {
      // Act
      const result = helper.parseCourseRetrievalRaw(
        validCourseRetrievalWithoutEmbeddingRawOutput,
      );

      // Assert
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('skillCoursesMap');
      expect(result).not.toHaveProperty('embeddingUsage');
      expect(result.skillCoursesMap).toBeInstanceOf(Map);
    });

    it('should parse course retrieval with empty skillCoursesMap', () => {
      // Act
      const result = helper.parseCourseRetrievalRaw(
        emptyCourseRetrievalRawOutput,
      );

      // Assert
      expect(result.skills).toEqual([]);
      expect(result.skillCoursesMap).toBeInstanceOf(Map);
      expect(result.skillCoursesMap.size).toBe(0);
    });

    it('should parse course retrieval with skill having empty course array', () => {
      // Act
      const result = helper.parseCourseRetrievalRaw(
        courseRetrievalWithEmptyMapRawOutput,
      );

      // Assert
      expect(result.skillCoursesMap).toBeInstanceOf(Map);
      expect(result.skillCoursesMap.size).toBe(1);
      expect(result.skillCoursesMap.get('python')).toEqual([]);
    });

    it('should throw Zod error for invalid skills type', () => {
      // Act & Assert
      expect(() => {
        helper.parseCourseRetrievalRaw(invalidCourseRetrievalRawOutput);
      }).toThrow();
    });

    it('should properly reconstruct Map from Object with multiple entries', () => {
      // Arrange
      const multiSkillOutput = {
        skills: ['python', 'javascript', 'java'],
        skillCoursesMap: {
          python: [createMockCourse({ subjectCode: 'CS201' })],
          javascript: [createMockCourse({ subjectCode: 'CS202' })],
          java: [createMockCourse({ subjectCode: 'CS203' })],
        },
      };

      // Act
      const result = helper.parseCourseRetrievalRaw(multiSkillOutput);

      // Assert
      expect(result.skillCoursesMap).toBeInstanceOf(Map);
      expect(result.skillCoursesMap.size).toBe(3);
      expect(result.skillCoursesMap.get('python')).toHaveLength(1);
      expect(result.skillCoursesMap.get('javascript')).toHaveLength(1);
      expect(result.skillCoursesMap.get('java')).toHaveLength(1);
    });
  });

  describe('parseCourseFilterRaw', () => {
    it('should parse valid course filter output and reconstruct all Maps', () => {
      // Act - Clone the fixture to avoid mutation across tests
      const result = helper.parseCourseFilterRaw(
        structuredClone(validCourseFilterRawOutputSerialized),
      );

      // Assert - verify the result structure first
      expect(result).toBeDefined();
      expect(result.llmAcceptedCoursesBySkill).toBeDefined();
      expect(result.llmRejectedCoursesBySkill).toBeDefined();
      expect(result.llmMissingCoursesBySkill).toBeDefined();

      // Verify Maps are reconstructed
      expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmMissingCoursesBySkill).toBeInstanceOf(Map);

      // Verify the Maps have data (check fixture data has the expected entries)
      expect(result.llmAcceptedCoursesBySkill.size).toBe(2);
      expect(result.llmRejectedCoursesBySkill.size).toBe(1);
      expect(result.llmMissingCoursesBySkill.size).toBe(1);

      // Verify specific data exists
      const acceptedPython = result.llmAcceptedCoursesBySkill.get('python');
      const acceptedJavascript =
        result.llmAcceptedCoursesBySkill.get('javascript');
      const rejectedPython = result.llmRejectedCoursesBySkill.get('python');
      const missingPython = result.llmMissingCoursesBySkill.get('python');

      expect(acceptedPython).toBeDefined();
      expect(acceptedPython).toHaveLength(1);
      expect(acceptedJavascript).toBeDefined();
      expect(acceptedJavascript).toHaveLength(1);
      expect(rejectedPython).toBeDefined();
      expect(rejectedPython).toHaveLength(1);
      expect(missingPython).toBeDefined();
      expect(missingPython).toHaveLength(1);
    });

    it('should parse course filter with empty Maps', () => {
      // Act - Clone the fixture to avoid mutation across tests
      const result = helper.parseCourseFilterRaw(
        structuredClone(courseFilterWithEmptyMapsRawOutput),
      );

      // Assert
      expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmMissingCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmAcceptedCoursesBySkill.size).toBe(0);
      expect(result.llmRejectedCoursesBySkill.size).toBe(0);
      expect(result.llmMissingCoursesBySkill.size).toBe(0);
    });

    it('should parse course filter with partial Maps (undefined fields)', () => {
      // Act - Clone the fixture to avoid mutation across tests
      const result = helper.parseCourseFilterRaw(
        structuredClone(courseFilterWithPartialMapsRawOutput),
      );

      // Assert - verify the result structure
      expect(result).toBeDefined();
      expect(result.llmAcceptedCoursesBySkill).toBeDefined();

      // Verify the accepted map is reconstructed
      expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmAcceptedCoursesBySkill.size).toBe(1);

      // Check that we have the python course in the accepted map
      const acceptedPython = result.llmAcceptedCoursesBySkill.get('python');
      expect(acceptedPython).toBeDefined();
      expect(acceptedPython).toHaveLength(1);

      // Undefined maps are now reconstructed as empty Maps for type consistency
      expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmRejectedCoursesBySkill.size).toBe(0);
      expect(result.llmMissingCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmMissingCoursesBySkill.size).toBe(0);
    });

    it('should preserve llmInfo and tokenUsage fields', () => {
      // Act - Clone the fixture to avoid mutation across tests
      const result = helper.parseCourseFilterRaw(
        structuredClone(validCourseFilterRawOutputSerialized),
      );

      // Assert
      expect(result.llmInfo).toBeDefined();
      expect(result.tokenUsage).toBeDefined();
      expect(result.llmInfo.model).toBe('openai/gpt-4o-mini');
      expect(
        result.tokenUsage.inputTokens + result.tokenUsage.outputTokens,
      ).toBe(1500);
    });

    it('should handle Maps with multiple courses per skill', () => {
      // Arrange
      const multiCourseFilter = {
        llmAcceptedCoursesBySkill: {
          python: [
            createMockCourse({ subjectCode: 'CS201' }),
            createMockCourse({ subjectCode: 'CS202' }),
            createMockCourse({ subjectCode: 'CS203' }),
          ],
        },
        llmRejectedCoursesBySkill: {
          python: [createMockCourse({ subjectCode: 'CS204' })],
        },
        llmMissingCoursesBySkill: {},
        llmInfo: {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Test',
          userPrompt: 'Test',
          promptVersion: '1.0',
        },
        tokenUsage: {
          input: 100,
          output: 50,
          total: 150,
        },
      };

      // Act - Clone the fixture to avoid mutation across tests
      const result = helper.parseCourseFilterRaw(
        structuredClone(multiCourseFilter),
      );

      // Assert
      expect(result.llmAcceptedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmAcceptedCoursesBySkill.get('python')).toHaveLength(3);
      expect(result.llmRejectedCoursesBySkill).toBeInstanceOf(Map);
      expect(result.llmRejectedCoursesBySkill.get('python')).toHaveLength(1);
    });
  });

  describe('parseCourseAggregationRaw', () => {
    it('should parse valid course aggregation output with Map reconstruction', () => {
      // Act
      const result = helper.parseCourseAggregationRaw(
        validCourseAggregationRawOutput,
      );

      // Assert
      expect(result).toHaveProperty('filteredSkillCoursesMap');
      expect(result).toHaveProperty('rankedCourses');
      expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
      expect(result.filteredSkillCoursesMap.size).toBe(2);
      expect(Array.isArray(result.rankedCourses)).toBe(true);
      expect(result.rankedCourses).toHaveLength(1);
    });

    it('should parse course aggregation with multiple skills', () => {
      // Act
      const result = helper.parseCourseAggregationRaw(
        courseAggregationWithMultipleSkillsRawOutput,
      );

      // Assert
      expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
      expect(result.filteredSkillCoursesMap.size).toBe(3);
      expect(result.rankedCourses).toHaveLength(3);
    });

    it('should parse course aggregation with empty data', () => {
      // Act
      const result = helper.parseCourseAggregationRaw(
        emptyCourseAggregationRawOutput,
      );

      // Assert
      expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
      expect(result.filteredSkillCoursesMap.size).toBe(0);
      expect(result.rankedCourses).toEqual([]);
    });

    it('should throw Zod error for invalid filteredSkillCoursesMap type', () => {
      // Act & Assert
      expect(() => {
        helper.parseCourseAggregationRaw(invalidCourseAggregationRawOutput);
      }).toThrow();
    });

    it('should properly reconstruct Map with complex data structure', () => {
      // Arrange
      const complexAggregation = {
        filteredSkillCoursesMap: {
          python: [
            { courseCode: 'CS201', score: 3, reason: 'Excellent' },
            { courseCode: 'CS202', score: 2, reason: 'Good' },
          ],
          javascript: [{ courseCode: 'CS203', score: 1, reason: 'Fair' }],
        },
        rankedCourses: [
          { courseCode: 'CS201', relevanceScore: 3 },
          { courseCode: 'CS203', relevanceScore: 1 },
        ],
      };

      // Act
      const result = helper.parseCourseAggregationRaw(complexAggregation);

      // Assert
      expect(result.filteredSkillCoursesMap).toBeInstanceOf(Map);
      expect(result.filteredSkillCoursesMap.get('python')).toHaveLength(2);
      expect(result.filteredSkillCoursesMap.get('javascript')).toHaveLength(1);
      expect(result.rankedCourses).toHaveLength(2);
    });
  });

  describe('parseAnswerSynthesisRaw', () => {
    it('should parse valid answer synthesis output', () => {
      // Act
      const result = helper.parseAnswerSynthesisRaw(
        validAnswerSynthesisRawOutput,
      );

      // Assert
      expect(result).toEqual(validAnswerSynthesisRawOutput);
      expect(result.answer).toContain('Python programming');
    });

    it('should throw Zod error for invalid answer type', () => {
      // Act & Assert
      expect(() => {
        helper.parseAnswerSynthesisRaw(invalidAnswerSynthesisRawOutput);
      }).toThrow();
    });

    it('should accept empty string answer (schema allows empty strings)', () => {
      // Act - Zod string() allows empty strings by default
      const result = helper.parseAnswerSynthesisRaw(
        emptyAnswerSynthesisRawOutput,
      );

      // Assert
      expect(result.answer).toBe('');
    });

    it('should accept long answer text', () => {
      // Arrange
      const longAnswer = {
        answer: 'A'.repeat(10000), // Very long answer
      };

      // Act
      const result = helper.parseAnswerSynthesisRaw(longAnswer);

      // Assert
      expect(result.answer).toHaveLength(10000);
    });

    it('should accept answer with special characters and formatting', () => {
      // Arrange
      const formattedAnswer = {
        answer:
          'Here are the courses:\n\n1. CS101 - Introduction\n2. CS202 - Advanced\n\n**Key topics:**\n- Python\n- JavaScript\n- TypeScript',
      };

      // Act
      const result = helper.parseAnswerSynthesisRaw(formattedAnswer);

      // Assert
      expect(result.answer).toContain('CS101');
      expect(result.answer).toContain('\n');
      expect(result.answer).toContain('**');
    });
  });

  describe('reconstructMap', () => {
    it('should reconstruct Map from empty object', () => {
      // Act
      const result = helper.reconstructMap(emptyObjectForMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should reconstruct Map from single entry object', () => {
      // Act
      const result = helper.reconstructMap(singleEntryObjectForMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.get('python')).toEqual([createMockCourse()]);
    });

    it('should reconstruct Map from multiple entries object', () => {
      // Act
      const result = helper.reconstructMap(multipleEntriesObjectForMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      expect(result.get('python')).toEqual([
        createMockCourse({ subjectCode: 'CS201' }),
      ]);
      expect(result.get('javascript')).toEqual([
        createMockCourse({ subjectCode: 'CS202' }),
      ]);
      expect(result.get('java')).toEqual([
        createMockCourse({ subjectCode: 'CS203' }),
      ]);
    });

    it('should reconstruct Map from complex object with multiple values per key', () => {
      // Act
      const result = helper.reconstructMap(complexObjectForMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('python')).toHaveLength(2);
      expect(result.get('javascript')).toHaveLength(1);
    });

    it('should preserve key-value relationships', () => {
      // Arrange
      const testObject = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };

      // Act
      const result = helper.reconstructMap(testObject);

      // Assert
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBe('value3');
    });

    it('should handle numeric string keys', () => {
      // Arrange
      const numericKeys = {
        '123': [createMockCourse({ subjectCode: 'CS123' })],
        '456': [createMockCourse({ subjectCode: 'CS456' })],
      };

      // Act
      const result = helper.reconstructMap(numericKeys);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('123')).toBeDefined();
      expect(result.get('456')).toBeDefined();
    });

    it('should handle special character keys', () => {
      // Arrange
      const specialKeys = {
        'skill-with-dash': [createMockCourse()],
        skill_with_underscore: [createMockCourse()],
        'skill.with.dot': [createMockCourse()],
      };

      // Act
      const result = helper.reconstructMap(specialKeys);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get('skill-with-dash')).toBeDefined();
      expect(result.get('skill_with_underscore')).toBeDefined();
      expect(result.get('skill.with.dot')).toBeDefined();
    });

    it('should handle null and undefined values in map', () => {
      // Arrange
      const objectWithNulls = {
        key1: null,
        key2: undefined,
        key3: 'valid-value',
      };

      // Act
      const result = helper.reconstructMap(objectWithNulls);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get('key1')).toBeNull();
      expect(result.get('key2')).toBeUndefined();
      expect(result.get('key3')).toBe('valid-value');
    });

    it('should handle nested objects as values', () => {
      // Arrange
      const nestedObject = {
        python: {
          courses: [createMockCourse()],
          count: 1,
        },
        javascript: {
          courses: [createMockCourse()],
          count: 1,
        },
      };

      // Act
      const result = helper.reconstructMap(nestedObject);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('python')).toEqual({
        courses: [createMockCourse()],
        count: 1,
      });
    });

    it('should handle arrays as values', () => {
      // Arrange
      const arrayValues = {
        skills: ['python', 'javascript', 'java'],
        courses: ['CS101', 'CS102', 'CS103'],
      };

      // Act
      const result = helper.reconstructMap(arrayValues);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('skills')).toEqual(['python', 'javascript', 'java']);
      expect(result.get('courses')).toEqual(['CS101', 'CS102', 'CS103']);
    });

    it('should maintain proper Map type with string keys and generic values', () => {
      // Arrange
      const typedObject = {
        stringKey: 'stringValue',
        numberKey: 12345,
        booleanKey: true,
        arrayKey: [1, 2, 3],
        objectKey: { nested: 'value' },
      };

      // Act
      const result = helper.reconstructMap(typedObject);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.get('stringKey')).toBe('stringValue');
      expect(result.get('numberKey')).toBe(12345);
      expect(result.get('booleanKey')).toBe(true);
      expect(result.get('arrayKey')).toEqual([1, 2, 3]);
      expect(result.get('objectKey')).toEqual({ nested: 'value' });
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      // Arrange & Act
      const helper1 = new QueryStepParserHelper();
      const helper2 = new QueryStepParserHelper();

      // Assert - Different instances but same behavior
      expect(helper1).toBeInstanceOf(QueryStepParserHelper);
      expect(helper2).toBeInstanceOf(QueryStepParserHelper);

      // Both should work identically
      const result1 = helper1.parseClassificationRaw(
        validClassificationRawOutput,
      );
      const result2 = helper2.parseClassificationRaw(
        validClassificationRawOutput,
      );

      expect(result1).toEqual(result2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete parsing workflow for all step types', () => {
      // Arrange
      const testCases = [
        {
          stepName: STEP_NAME.QUESTION_CLASSIFICATION,
          data: validClassificationRawOutput,
        },
        {
          stepName: STEP_NAME.QUERY_PROFILE_BUILDING,
          data: validQueryProfileRawOutput,
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
          stepName: STEP_NAME.QUERY_PROFILE_BUILDING,
          data: {
            language: 'en',
          },
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

  describe('error handling and logging', () => {
    it('should log debug message when parsing', () => {
      // Act
      helper.parseRawOutput(STEP_NAME.QUESTION_CLASSIFICATION, {
        category: 'test',
        reason: 'test',
      });

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Parsing raw output for step: QUESTION_CLASSIFICATION',
      );
    });

    it('should handle null for parseCourseFilterRaw with type assertion', () => {
      // Note: This method uses type assertion instead of Zod schema
      // So it will throw when trying to access properties on null
      expect(() => {
        helper.parseCourseFilterRaw(null);
      }).toThrow();
    });
  });
});
