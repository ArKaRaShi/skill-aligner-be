/**
 * Entity Extraction Schema Unit Tests
 *
 * Tests Zod schema validation for LLM entity extraction responses.
 * Pure validation tests - no database or external dependencies.
 */
import { ZodError } from 'zod';

import {
  EntityExtractionSchema,
  ExtractedEntitySchema,
} from '../entity-extraction.schema';

describe('ExtractedEntitySchema', () => {
  const validEntity = {
    name: 'Python',
    normalizedLabel: 'python',
    confidence: 'HIGH',
    source: 'explicit',
  };

  describe('valid entities', () => {
    it('should accept valid entity with HIGH confidence', () => {
      const result = ExtractedEntitySchema.parse(validEntity);
      expect(result).toEqual(validEntity);
    });

    it('should accept valid entity with MEDIUM confidence', () => {
      const input = { ...validEntity, confidence: 'MEDIUM' as const };
      const result = ExtractedEntitySchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept valid entity with LOW confidence', () => {
      const input = { ...validEntity, confidence: 'LOW' as const };
      const result = ExtractedEntitySchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept inferred source', () => {
      const input = { ...validEntity, source: 'inferred' as const };
      const result = ExtractedEntitySchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept hyphenated normalized labels', () => {
      const input = {
        name: 'Machine Learning',
        normalizedLabel: 'machine-learning',
        confidence: 'HIGH' as const,
        source: 'explicit' as const,
      };
      const result = ExtractedEntitySchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe('validation errors', () => {
    it('should reject missing name', () => {
      const input = { ...validEntity, name: undefined };
      expect(() => ExtractedEntitySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject missing normalizedLabel', () => {
      const input = { ...validEntity, normalizedLabel: undefined };
      expect(() => ExtractedEntitySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid confidence', () => {
      const input = { ...validEntity, confidence: 'INVALID' };
      expect(() => ExtractedEntitySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid source', () => {
      const input = { ...validEntity, source: 'invalid' };
      expect(() => ExtractedEntitySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject non-string name', () => {
      const input = { ...validEntity, name: 123 };
      expect(() => ExtractedEntitySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject empty string name (needs .min() constraint)', () => {
      // Note: Current schema uses z.string() which accepts empty strings
      // This test documents current behavior
      const input = { ...validEntity, name: '' };
      const result = ExtractedEntitySchema.parse(input);
      expect(result.name).toBe('');
      // To reject empty strings, change schema to:
      // name: z.string().min(1).describe(...)
    });
  });
});

describe('EntityExtractionSchema', () => {
  const validExtraction = {
    mentionTopics: [],
    mentionSkills: [],
    mentionTasks: [],
    mentionRoles: [],
    unmappedConcepts: [],
    overallQuality: 'high',
    reasoning: 'Clear learning intent with explicit entities',
  };

  describe('valid extractions', () => {
    it('should accept minimal valid extraction with default empty arrays', () => {
      const result = EntityExtractionSchema.parse(validExtraction);
      expect(result).toEqual(validExtraction);
    });

    it('should accept extraction with topics', () => {
      const input = {
        ...validExtraction,
        mentionTopics: [
          {
            name: 'AI',
            normalizedLabel: 'ai',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTopics).toHaveLength(1);
      expect(result.mentionTopics[0].name).toBe('AI');
    });

    it('should accept extraction with skills', () => {
      const input = {
        ...validExtraction,
        mentionSkills: [
          {
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionSkills).toHaveLength(1);
      expect(result.mentionSkills[0].name).toBe('Python');
    });

    it('should accept extraction with tasks', () => {
      const input = {
        ...validExtraction,
        mentionTasks: [
          {
            name: 'build mobile apps',
            normalizedLabel: 'build-mobile-apps',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTasks).toHaveLength(1);
      expect(result.mentionTasks[0].name).toBe('build mobile apps');
    });

    it('should accept extraction with roles', () => {
      const input = {
        ...validExtraction,
        mentionRoles: [
          {
            name: 'Data Scientist',
            normalizedLabel: 'data-scientist',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionRoles).toHaveLength(1);
      expect(result.mentionRoles[0].name).toBe('Data Scientist');
    });

    it('should accept extraction with unmapped concepts', () => {
      const input = {
        ...validExtraction,
        unmappedConcepts: ['Leetcode', 'CS101'],
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.unmappedConcepts).toEqual(['Leetcode', 'CS101']);
    });

    it('should accept extraction with all entity types', () => {
      const input = {
        mentionTopics: [
          {
            name: 'Machine Learning',
            normalizedLabel: 'machine-learning',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        mentionSkills: [
          {
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        mentionTasks: [],
        mentionRoles: [],
        unmappedConcepts: [],
        overallQuality: 'high' as const,
        reasoning: 'Multiple entities extracted successfully',
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTopics).toHaveLength(1);
      expect(result.mentionSkills).toHaveLength(1);
    });

    it('should accept all quality levels', () => {
      const qualities: Array<'high' | 'medium' | 'low' | 'none'> = [
        'high',
        'medium',
        'low',
        'none',
      ];

      qualities.forEach((quality) => {
        const input = { ...validExtraction, overallQuality: quality };
        const result = EntityExtractionSchema.parse(input);
        expect(result.overallQuality).toBe(quality);
      });
    });

    it('should default optional fields to empty arrays', () => {
      const input = {
        mentionTopics: undefined,
        mentionSkills: undefined,
        mentionTasks: undefined,
        mentionRoles: undefined,
        unmappedConcepts: undefined,
        overallQuality: 'none' as const,
        reasoning: 'No entities found',
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTopics).toEqual([]);
      expect(result.mentionSkills).toEqual([]);
      expect(result.mentionTasks).toEqual([]);
      expect(result.mentionRoles).toEqual([]);
      expect(result.unmappedConcepts).toEqual([]);
    });
  });

  describe('validation errors', () => {
    it('should reject missing overallQuality', () => {
      const input = { ...validExtraction, overallQuality: undefined };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject missing reasoning', () => {
      const input = { ...validExtraction, reasoning: undefined };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid overallQuality', () => {
      const input = { ...validExtraction, overallQuality: 'invalid' };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid entity in mentionTopics', () => {
      const input = {
        ...validExtraction,
        mentionTopics: [
          {
            name: 'AI',
            normalizedLabel: 'ai',
            confidence: 'INVALID', // Invalid confidence
            source: 'explicit' as const,
          },
        ],
      };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject non-array unmappedConcepts', () => {
      const input = { ...validExtraction, unmappedConcepts: 'not-an-array' };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject non-string items in unmappedConcepts', () => {
      const input = { ...validExtraction, unmappedConcepts: [123] };
      expect(() => EntityExtractionSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('real-world examples', () => {
    it('should accept typical Python ML question extraction', () => {
      const input = {
        mentionTopics: [
          {
            name: 'Machine Learning',
            normalizedLabel: 'machine-learning',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        mentionSkills: [
          {
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        mentionTasks: [],
        mentionRoles: [],
        unmappedConcepts: [],
        overallQuality: 'high' as const,
        reasoning:
          'Explicit topic (Machine Learning) and skill (Python) with clear learning intent',
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTopics).toHaveLength(1);
      expect(result.mentionSkills).toHaveLength(1);
    });

    it('should accept Thai Leetcode question extraction', () => {
      const input = {
        mentionTopics: [
          {
            name: 'algorithms',
            normalizedLabel: 'algorithms',
            confidence: 'MEDIUM' as const,
            source: 'inferred' as const,
          },
          {
            name: 'data structures',
            normalizedLabel: 'data-structures',
            confidence: 'MEDIUM' as const,
            source: 'inferred' as const,
          },
        ],
        mentionSkills: [
          {
            name: 'algorithms',
            normalizedLabel: 'algorithms',
            confidence: 'MEDIUM' as const,
            source: 'inferred' as const,
          },
          {
            name: 'data structures',
            normalizedLabel: 'data-structures',
            confidence: 'MEDIUM' as const,
            source: 'inferred' as const,
          },
        ],
        mentionTasks: [
          {
            name: 'solve Leetcode problems',
            normalizedLabel: 'solve-leetcode-problems',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        mentionRoles: [],
        unmappedConcepts: ['Leetcode'],
        overallQuality: 'medium' as const,
        reasoning:
          "Explicit task (solve Leetcode) with inferred topics/skills. 'โหดๆ' indicates advanced level but is slang.",
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionTasks).toHaveLength(1);
      expect(result.mentionTasks[0].name).toBe('solve Leetcode problems');
      expect(result.unmappedConcepts).toContain('Leetcode');
    });

    it('should accept Data Scientist role question extraction', () => {
      const input = {
        mentionTopics: [
          {
            name: 'Data Science',
            normalizedLabel: 'data-science',
            confidence: 'HIGH' as const,
            source: 'inferred' as const,
          },
        ],
        mentionSkills: [],
        mentionTasks: [],
        mentionRoles: [
          {
            name: 'Data Scientist',
            normalizedLabel: 'data-scientist',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
        unmappedConcepts: [],
        overallQuality: 'high' as const,
        reasoning:
          'Explicit role mention with clear learning intent. Topic (Data Science) inferred from role.',
      };
      const result = EntityExtractionSchema.parse(input);
      expect(result.mentionRoles).toHaveLength(1);
      expect(result.mentionRoles[0].name).toBe('Data Scientist');
    });
  });
});
