import {
  CourseEvaluationItemSchema,
  getCourseRetrievalEvaluatorSchema,
} from '../schema';

describe('CourseEvaluationItemSchema', () => {
  const validInput = {
    course_name: 'Introduction to Python',
    course_code: 'CS101',
    skill_relevance_score: 2,
    context_alignment_score: 3,
    skill_reason: 'Strong match for programming fundamentals',
    context_reason: 'Excellent alignment with user goals',
  };

  describe('validation', () => {
    it('should accept valid course evaluation item', () => {
      const result = CourseEvaluationItemSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should accept all valid scores: 0, 1, 2, 3 for skill_relevance_score', () => {
      [0, 1, 2, 3].forEach((score) => {
        const input = { ...validInput, skill_relevance_score: score };
        const result = CourseEvaluationItemSchema.parse(input);
        expect(result.skill_relevance_score).toBe(score);
      });
    });

    it('should accept all valid scores: 0, 1, 2, 3 for context_alignment_score', () => {
      [0, 1, 2, 3].forEach((score) => {
        const input = { ...validInput, context_alignment_score: score };
        const result = CourseEvaluationItemSchema.parse(input);
        expect(result.context_alignment_score).toBe(score);
      });
    });

    it('should accept valid evaluation with minimum scores (0)', () => {
      const input = {
        ...validInput,
        skill_relevance_score: 0,
        context_alignment_score: 0,
      };
      const result = CourseEvaluationItemSchema.parse(input);
      expect(result.skill_relevance_score).toBe(0);
      expect(result.context_alignment_score).toBe(0);
    });

    it('should accept valid evaluation with maximum scores (3)', () => {
      const input = {
        ...validInput,
        skill_relevance_score: 3,
        context_alignment_score: 3,
      };
      const result = CourseEvaluationItemSchema.parse(input);
      expect(result.skill_relevance_score).toBe(3);
      expect(result.context_alignment_score).toBe(3);
    });
  });

  describe('skill_relevance_score validation', () => {
    it('should reject skill_relevance_score less than 0', () => {
      const invalidScores = [-1, -2, -100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            skill_relevance_score: score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject skill_relevance_score greater than 3', () => {
      const invalidScores = [4, 5, 10, 100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            skill_relevance_score: score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject decimal skill_relevance_score (not integers)', () => {
      const invalidScores = [0.5, 1.5, 2.7, 3.1];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            skill_relevance_score: score,
          });
        }).toThrow('Score must be an integer');
      });
    });
  });

  describe('context_alignment_score validation', () => {
    it('should reject context_alignment_score less than 0', () => {
      const invalidScores = [-1, -2, -100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            context_alignment_score: score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject context_alignment_score greater than 3', () => {
      const invalidScores = [4, 5, 10, 100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            context_alignment_score: score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject decimal context_alignment_score (not integers)', () => {
      const invalidScores = [0.5, 1.5, 2.7, 3.1];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            context_alignment_score: score,
          });
        }).toThrow('Score must be an integer');
      });
    });
  });

  describe('other field validation', () => {
    it('should reject empty course_name', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({ ...validInput, course_name: '' });
      }).toThrow();
    });

    it('should reject empty course_code', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({ ...validInput, course_code: '' });
      }).toThrow();
    });

    it('should reject empty skill_reason', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({ ...validInput, skill_reason: '' });
      }).toThrow();
    });

    it('should reject empty context_reason', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({
          ...validInput,
          context_reason: '',
        });
      }).toThrow();
    });
  });
});

describe('getCourseRetrievalEvaluatorSchema', () => {
  const validEvaluation = {
    course_name: 'Introduction to Python',
    course_code: 'CS101',
    skill_relevance_score: 2,
    context_alignment_score: 3,
    skill_reason: 'Strong match for programming fundamentals',
    context_reason: 'Excellent alignment with user goals',
  };

  it('should accept valid evaluation array within min/max bounds', () => {
    const schema = getCourseRetrievalEvaluatorSchema(1, 10);
    const input = {
      evaluations: [validEvaluation],
    };
    const result = schema.parse(input);
    expect(result.evaluations).toHaveLength(1);
  });

  it('should reject evaluation array below minItems', () => {
    const schema = getCourseRetrievalEvaluatorSchema(2, 10);
    const input = {
      evaluations: [validEvaluation], // Only 1 item, but min is 2
    };
    expect(() => {
      schema.parse(input);
    }).toThrow();
  });

  it('should reject evaluation array above maxItems', () => {
    const schema = getCourseRetrievalEvaluatorSchema(1, 2);
    const input = {
      evaluations: [validEvaluation, validEvaluation, validEvaluation], // 3 items, but max is 2
    };
    expect(() => {
      schema.parse(input);
    }).toThrow();
  });

  it('should accept evaluation array at exactly minItems', () => {
    const schema = getCourseRetrievalEvaluatorSchema(2, 10);
    const input = {
      evaluations: [validEvaluation, validEvaluation],
    };
    const result = schema.parse(input);
    expect(result.evaluations).toHaveLength(2);
  });

  it('should accept evaluation array at exactly maxItems', () => {
    const schema = getCourseRetrievalEvaluatorSchema(1, 3);
    const input = {
      evaluations: [validEvaluation, validEvaluation, validEvaluation],
    };
    const result = schema.parse(input);
    expect(result.evaluations).toHaveLength(3);
  });

  it('should reject evaluation array with invalid scores', () => {
    const schema = getCourseRetrievalEvaluatorSchema(1, 10);
    const invalidEvaluation = {
      ...validEvaluation,
      skill_relevance_score: 5, // Invalid score
    };
    const input = {
      evaluations: [invalidEvaluation],
    };
    expect(() => {
      schema.parse(input);
    }).toThrow('Score must be exactly 0, 1, 2, or 3');
  });
});
