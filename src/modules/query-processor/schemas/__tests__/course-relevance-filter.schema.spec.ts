import {
  CourseFilterSchema,
  CourseFilterSchemaV2,
  CourseRelevanceFilterResultSchema,
  CourseRelevanceFilterResultSchemaV2,
} from '../course-relevance-filter.schema';

describe('CourseFilterSchema (V1)', () => {
  const validInput = {
    course_name: 'Introduction to Python',
    decision: 'yes',
    reason: 'Course covers python fundamentals',
  };

  describe('validation', () => {
    it('should accept valid course filter with yes decision', () => {
      const input = { ...validInput, decision: 'yes' };
      const result = CourseFilterSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept valid course filter with no decision', () => {
      const input = { ...validInput, decision: 'no' };
      const result = CourseFilterSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should reject invalid decision values', () => {
      const invalidDecisions = ['maybe', 'YES', 'NO', '1', '0', ''];
      invalidDecisions.forEach((decision) => {
        expect(() => {
          CourseFilterSchema.parse({ ...validInput, decision });
        }).toThrow();
      });
    });

    it('should reject empty course_name', () => {
      expect(() => {
        CourseFilterSchema.parse({ ...validInput, course_name: '' });
      }).toThrow();
    });

    it('should reject empty reason', () => {
      expect(() => {
        CourseFilterSchema.parse({ ...validInput, reason: '' });
      }).toThrow();
    });
  });
});

describe('CourseFilterSchemaV2 (V2 with Scoring)', () => {
  const validInput = {
    course_code: 'CS101',
    course_name: 'Introduction to Python',
    score: 2,
    reason: 'Course covers python fundamentals',
  };

  describe('score validation', () => {
    it('should accept all valid scores: 0, 1, 2, 3', () => {
      [0, 1, 2, 3].forEach((score) => {
        const input = { ...validInput, score };
        const result = CourseFilterSchemaV2.parse(input);
        expect(result.score).toBe(score);
      });
    });

    it('should reject score less than 0', () => {
      const invalidScores = [-1, -2, -100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseFilterSchemaV2.parse({ ...validInput, score });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject score greater than 3', () => {
      const invalidScores = [4, 5, 10, 100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseFilterSchemaV2.parse({ ...validInput, score });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject decimal scores (not integers)', () => {
      const invalidScores = [0.5, 1.5, 2.7, 3.1];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseFilterSchemaV2.parse({ ...validInput, score });
        }).toThrow(); // Zod will fail the .int() check
      });
    });
  });

  describe('other field validation', () => {
    it('should reject empty course_code', () => {
      expect(() => {
        CourseFilterSchemaV2.parse({ ...validInput, course_code: '' });
      }).toThrow();
    });

    it('should reject empty course_name', () => {
      expect(() => {
        CourseFilterSchemaV2.parse({ ...validInput, course_name: '' });
      }).toThrow();
    });

    it('should reject empty reason', () => {
      expect(() => {
        CourseFilterSchemaV2.parse({ ...validInput, reason: '' });
      }).toThrow();
    });
  });
});

describe('CourseRelevanceFilterResultSchema (V1)', () => {
  const validResult = {
    courses: [
      {
        course_name: 'Python Basics',
        decision: 'yes',
        reason: 'Good match',
      },
      {
        course_name: 'Java Fundamentals',
        decision: 'no',
        reason: 'No match',
      },
    ],
  };

  it('should accept valid result with multiple courses', () => {
    const result = CourseRelevanceFilterResultSchema.parse(validResult);
    expect(result.courses).toHaveLength(2);
  });

  it('should accept empty courses array', () => {
    const result = CourseRelevanceFilterResultSchema.parse({ courses: [] });
    expect(result.courses).toEqual([]);
  });

  it('should reject courses with invalid decisions', () => {
    const invalidResult = {
      courses: [
        {
          course_name: 'Python Basics',
          decision: 'maybe', // Invalid
          reason: 'Good match',
        },
      ],
    };
    expect(() => {
      CourseRelevanceFilterResultSchema.parse(invalidResult);
    }).toThrow();
  });
});

describe('CourseRelevanceFilterResultSchemaV2 (V2 with Scoring)', () => {
  const validResult = {
    courses: [
      {
        course_code: 'CS101',
        course_name: 'Python Basics',
        score: 2,
        reason: 'Good match',
      },
      {
        course_code: 'CS102',
        course_name: 'Advanced Python',
        score: 3,
        reason: 'Excellent match',
      },
    ],
  };

  it('should accept valid result with multiple courses', () => {
    const result = CourseRelevanceFilterResultSchemaV2.parse(validResult);
    expect(result.courses).toHaveLength(2);
  });

  it('should accept courses with all valid scores (0, 1, 2, 3)', () => {
    const result = {
      courses: [
        { course_code: 'CS101', course_name: 'Intro', score: 0, reason: 'No' },
        {
          course_code: 'CS102',
          course_name: 'Basics',
          score: 1,
          reason: 'Low',
        },
        { course_code: 'CS103', course_name: 'Inter', score: 2, reason: 'Med' },
        { course_code: 'CS104', course_name: 'Adv', score: 3, reason: 'High' },
      ],
    };
    const parsed = CourseRelevanceFilterResultSchemaV2.parse(result);
    expect(parsed.courses).toHaveLength(4);
  });

  it('should accept empty courses array', () => {
    const result = CourseRelevanceFilterResultSchemaV2.parse({ courses: [] });
    expect(result.courses).toEqual([]);
  });

  it('should reject result with invalid scores in courses array', () => {
    const invalidResult = {
      courses: [
        {
          course_code: 'CS101',
          course_name: 'Python Basics',
          score: 5, // Invalid score
          reason: 'Good match',
        },
      ],
    };
    expect(() => {
      CourseRelevanceFilterResultSchemaV2.parse(invalidResult);
    }).toThrow('Score must be exactly 0, 1, 2, or 3');
  });
});
