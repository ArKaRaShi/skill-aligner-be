import { QueryStepParserHelper } from '../../query-step-parser.helper';
import {
  // Classification fixtures
  arrayRawOutput,
  // Course aggregation fixtures
  courseAggregationWithMultipleSkillsRawOutput,
  // Course filter fixtures
  courseFilterWithEmptyMapsRawOutput,
  courseFilterWithPartialMapsRawOutput,
  // Course retrieval fixtures
  courseRetrievalWithEmptyMapRawOutput,
  createMockCourse,
  // Answer synthesis fixtures
  emptyAnswerSynthesisRawOutput,
  emptyCourseAggregationRawOutput,
  emptyCourseRetrievalRawOutput,
  emptyObjectRawOutput,
  invalidAnswerSynthesisRawOutput,
  invalidClassificationRawOutput,
  invalidCourseAggregationRawOutput,
  invalidCourseRetrievalRawOutput,
  // Skill expansion fixtures
  invalidSkillExpansionRawOutput,
  invalidSkillItemStructureRawOutput,
  missingFieldClassificationRawOutput,
  nullRawOutput,
  numberRawOutput,
  stringRawOutput,
  undefinedRawOutput,
  validAnswerSynthesisRawOutput,
  validClassificationRawOutput,
  validCourseAggregationRawOutput,
  validCourseFilterRawOutputSerialized,
  validCourseRetrievalRawOutput,
  validCourseRetrievalWithoutEmbeddingRawOutput,
  validSkillExpansionRawOutput,
} from './fixtures/query-step-parser.helper.fixture';

describe('QueryStepParserHelper.parseAnswerSynthesisRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

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

describe('QueryStepParserHelper.parseClassificationRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

  it('should parse valid classification output', () => {
    // Act
    const result = helper.parseClassificationRaw(validClassificationRawOutput);

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

describe('QueryStepParserHelper.parseCourseAggregationRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

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
        { courseCode: 'CS201', maxRelevanceScore: 3 },
        { courseCode: 'CS203', maxRelevanceScore: 1 },
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

describe('QueryStepParserHelper.parseCourseFilterRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

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
    expect(result.tokenUsage.inputTokens + result.tokenUsage.outputTokens).toBe(
      1500,
    );
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
        model: 'openai/gpt-4o-mini',
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

describe('QueryStepParserHelper.parseCourseRetrievalRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

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

describe('QueryStepParserHelper.parseSkillExpansionRaw', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

  it('should parse valid skill expansion output', () => {
    // Act
    const result = helper.parseSkillExpansionRaw(validSkillExpansionRawOutput);

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
