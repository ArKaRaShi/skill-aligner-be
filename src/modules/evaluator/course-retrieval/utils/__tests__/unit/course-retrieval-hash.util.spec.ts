import { describe, expect, it } from '@jest/globals';

import { CourseRetrievalHashUtil } from '../../course-retrieval-hash.util';

describe('CourseRetrievalHashUtil', () => {
  describe('generate', () => {
    it('should generate consistent hashes for same input', () => {
      const params = {
        question: 'How to learn Python?',
        skill: 'Python programming',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params);
      const hash2 = CourseRetrievalHashUtil.generate(params);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should generate different hashes for different questions', () => {
      const params1 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
      };
      const params2 = {
        question: 'How to learn Java?',
        skill: 'Java programming',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params1);
      const hash2 = CourseRetrievalHashUtil.generate(params2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different skills', () => {
      const params1 = {
        question: 'How to learn programming?',
        skill: 'Python programming',
      };
      const params2 = {
        question: 'How to learn programming?',
        skill: 'Java programming',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params1);
      const hash2 = CourseRetrievalHashUtil.generate(params2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include testCaseId in hash when provided', () => {
      const params1 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        testCaseId: 'test-001',
      };
      const params2 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        testCaseId: 'test-002',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params1);
      const hash2 = CourseRetrievalHashUtil.generate(params2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash when testCaseId is undefined vs omitted', () => {
      const params1 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        testCaseId: undefined,
      };
      const params2 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params1);
      const hash2 = CourseRetrievalHashUtil.generate(params2);

      expect(hash1).toBe(hash2);
    });

    it('should be case-sensitive', () => {
      const params1 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
      };
      const params2 = {
        question: 'how to learn python?',
        skill: 'python programming',
      };

      const hash1 = CourseRetrievalHashUtil.generate(params1);
      const hash2 = CourseRetrievalHashUtil.generate(params2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateForCourse', () => {
    it('should generate unique hashes for different courses', () => {
      const params1 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        courseId: 'CS101',
      };
      const params2 = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        courseId: 'CS102',
      };

      const hash1 = CourseRetrievalHashUtil.generateForCourse(params1);
      const hash2 = CourseRetrievalHashUtil.generateForCourse(params2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include all parameters in hash', () => {
      const params = {
        question: 'How to learn Python?',
        skill: 'Python programming',
        courseId: 'CS101',
        testCaseId: 'test-001',
      };

      const hash = CourseRetrievalHashUtil.generateForCourse(params);

      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });
  });

  describe('isValidHash', () => {
    it('should return true for valid SHA256 hash', () => {
      const validHash = 'a'.repeat(64); // 64 'a' characters
      expect(CourseRetrievalHashUtil.isValidHash(validHash)).toBe(true);
    });

    it('should return true for mixed case hex', () => {
      const mixedCaseHash = 'AaBbCc1234567890'.padEnd(64, '0');
      expect(CourseRetrievalHashUtil.isValidHash(mixedCaseHash)).toBe(true);
    });

    it('should return false for incorrect length', () => {
      const shortHash = 'a'.repeat(63);
      expect(CourseRetrievalHashUtil.isValidHash(shortHash)).toBe(false);

      const longHash = 'a'.repeat(65);
      expect(CourseRetrievalHashUtil.isValidHash(longHash)).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const invalidHash = 'g'.repeat(64); // 'g' is not a valid hex character
      expect(CourseRetrievalHashUtil.isValidHash(invalidHash)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(CourseRetrievalHashUtil.isValidHash('')).toBe(false);
    });
  });
});
