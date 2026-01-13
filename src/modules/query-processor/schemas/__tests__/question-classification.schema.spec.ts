import {
  CategoryEnum,
  QuestionClassificationSchema,
} from '../question-classification.schema';

describe('CategoryEnum', () => {
  describe('acceptance tests', () => {
    it('should accept "relevant" category', () => {
      const result = CategoryEnum.parse('relevant');
      expect(result).toBe('relevant');
    });

    it('should accept "irrelevant" category', () => {
      const result = CategoryEnum.parse('irrelevant');
      expect(result).toBe('irrelevant');
    });

    it('should accept "dangerous" category', () => {
      const result = CategoryEnum.parse('dangerous');
      expect(result).toBe('dangerous');
    });
  });

  describe('rejection tests', () => {
    it('should reject "unclear" (previously considered, now removed)', () => {
      expect(() => {
        CategoryEnum.parse('unclear');
      }).toThrow();
    });

    it('should reject invalid category strings', () => {
      const invalidCategories = ['maybe', 'unknown', 'yes', 'no', ''];
      invalidCategories.forEach((category) => {
        expect(() => {
          CategoryEnum.parse(category);
        }).toThrow();
      });
    });

    it('should reject case-sensitive variations', () => {
      const caseVariations = [
        'Relevant',
        'IRRELEVANT',
        'Dangerous',
        'DANGEROUS',
      ];
      caseVariations.forEach((category) => {
        expect(() => {
          CategoryEnum.parse(category);
        }).toThrow();
      });
    });

    it('should reject non-string types', () => {
      const nonStrings = [123, true, null, undefined, {}];
      nonStrings.forEach((value) => {
        expect(() => {
          CategoryEnum.parse(value);
        }).toThrow();
      });
    });
  });
});

describe('QuestionClassificationSchema', () => {
  const validInput = {
    category: 'relevant' as const,
    reason: 'Question asks about course recommendations',
  };

  describe('validation', () => {
    it('should accept valid classification with relevant category', () => {
      const input = { ...validInput, category: 'relevant' as const };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept valid classification with irrelevant category', () => {
      const input = { ...validInput, category: 'irrelevant' as const };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept valid classification with dangerous category', () => {
      const input = { ...validInput, category: 'dangerous' as const };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept empty reason string (field uses .describe(), no .min())', () => {
      const input = { category: 'relevant' as const, reason: '' };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept multiline reason string', () => {
      const input = {
        category: 'relevant' as const,
        reason: 'Question asks about courses\nMultiple lines of reasoning',
      };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe('rejection tests', () => {
    it('should reject invalid category values', () => {
      const invalidCategories = ['unclear', 'maybe', 'Relevant', ''];
      invalidCategories.forEach((category) => {
        expect(() => {
          QuestionClassificationSchema.parse({
            category,
            reason: 'Test reason',
          });
        }).toThrow();
      });
    });

    it('should reject missing category field', () => {
      expect(() => {
        QuestionClassificationSchema.parse({
          reason: 'Test reason',
        } as unknown);
      }).toThrow();
    });

    it('should reject non-string category', () => {
      const nonStrings = [123, true, null, undefined];
      nonStrings.forEach((category) => {
        expect(() => {
          QuestionClassificationSchema.parse({
            category,
            reason: 'Test reason',
          } as unknown);
        }).toThrow();
      });
    });

    it('should reject non-string reason', () => {
      const nonStrings = [123, true, null, undefined, {}];
      nonStrings.forEach((reason) => {
        expect(() => {
          QuestionClassificationSchema.parse({
            category: 'relevant',
            reason,
          } as unknown);
        }).toThrow();
      });
    });
  });

  describe('real-world use cases', () => {
    it('should accept typical relevant question classification', () => {
      const input = {
        category: 'relevant' as const,
        reason:
          'User is asking about Python programming courses available in the computer science curriculum',
      };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept typical irrelevant question classification', () => {
      const input = {
        category: 'irrelevant' as const,
        reason:
          'Question is about restaurant recommendations, not related to academic courses or skills',
      };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept typical dangerous question classification', () => {
      const input = {
        category: 'dangerous' as const,
        reason:
          'Question requests instructions for creating harmful malware or exploiting systems',
      };
      const result = QuestionClassificationSchema.parse(input);
      expect(result).toEqual(input);
    });
  });
});
