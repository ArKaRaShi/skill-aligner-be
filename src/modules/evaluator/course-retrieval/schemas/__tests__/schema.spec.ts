import {
  CourseEvaluationItemSchema,
  getCourseRetrievalEvaluatorSchema,
} from '../schema';

describe('CourseEvaluationItemSchema (Single-Score Model)', () => {
  const validInput = {
    code: 'CS101',
    score: 2,
    reason: 'Good match for the skill',
  };

  describe('validation', () => {
    it('should accept valid course evaluation item', () => {
      const result = CourseEvaluationItemSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should accept all valid scores: 0, 1, 2, 3', () => {
      [0, 1, 2, 3].forEach((score) => {
        const input = { ...validInput, score };
        const result = CourseEvaluationItemSchema.parse(input);
        expect(result.score).toBe(score);
      });
    });

    it('should accept valid evaluation with minimum score (0)', () => {
      const input = { ...validInput, score: 0 };
      const result = CourseEvaluationItemSchema.parse(input);
      expect(result.score).toBe(0);
    });

    it('should accept valid evaluation with maximum score (3)', () => {
      const input = { ...validInput, score: 3 };
      const result = CourseEvaluationItemSchema.parse(input);
      expect(result.score).toBe(3);
    });
  });

  describe('score validation', () => {
    it('should reject scores less than 0', () => {
      const invalidScores = [-1, -2, -100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject scores greater than 3', () => {
      const invalidScores = [4, 5, 10, 100];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            score,
          });
        }).toThrow('Score must be exactly 0, 1, 2, or 3');
      });
    });

    it('should reject decimal scores (not integers)', () => {
      const invalidScores = [0.5, 1.5, 2.7, 3.1];
      invalidScores.forEach((score) => {
        expect(() => {
          CourseEvaluationItemSchema.parse({
            ...validInput,
            score,
          });
        }).toThrow('Score must be an integer');
      });
    });
  });

  describe('other field validation', () => {
    it('should reject empty code', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({ ...validInput, code: '' });
      }).toThrow();
    });

    it('should reject empty reason', () => {
      expect(() => {
        CourseEvaluationItemSchema.parse({ ...validInput, reason: '' });
      }).toThrow();
    });
  });
});

describe('getCourseRetrievalEvaluatorSchema', () => {
  const validEvaluation = {
    code: 'CS101',
    score: 2,
    reason: 'Good match for the skill',
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
      score: 5, // Invalid score
    };
    const input = {
      evaluations: [invalidEvaluation],
    };
    expect(() => {
      schema.parse(input);
    }).toThrow('Score must be exactly 0, 1, 2, or 3');
  });
});
