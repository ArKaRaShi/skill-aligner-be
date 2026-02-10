import { CourseHashUtil } from '../course-hash.util';

describe('CourseHashUtil', () => {
  describe('generate', () => {
    it('should generate consistent hash for same inputs (deterministic)', () => {
      // Arrange
      const params = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'CS101',
      };

      // Act
      const hash1 = CourseHashUtil.generate(params);
      const hash2 = CourseHashUtil.generate(params);

      // Assert - Hash should be deterministic for caching
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex string
    });

    it('should generate different hashes for different inputs', () => {
      // Arrange
      const params1 = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'CS101',
      };
      const params2 = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'CS102', // Different subject code
      };

      // Act
      const hash1 = CourseHashUtil.generate(params1);
      const hash2 = CourseHashUtil.generate(params2);

      // Assert - Different inputs should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should be case-sensitive (Python ≠ python)', () => {
      // Arrange
      const params1 = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'cs101',
      };
      const params2 = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'CS101', // Different case
      };

      // Act
      const hash1 = CourseHashUtil.generate(params1);
      const hash2 = CourseHashUtil.generate(params2);

      // Assert - Case difference should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should include all three parameters in hash', () => {
      // Arrange - All three params should affect the hash
      const baseParams = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        subjectCode: 'CS101',
      };

      // Act - Change each parameter one at a time
      const baseHash = CourseHashUtil.generate(baseParams);
      const differentQueryLogId = CourseHashUtil.generate({
        ...baseParams,
        queryLogId: 'query-2',
      });
      const differentQuestion = CourseHashUtil.generate({
        ...baseParams,
        question: 'What are the best Java courses?',
      });
      const differentSubjectCode = CourseHashUtil.generate({
        ...baseParams,
        subjectCode: 'CS102',
      });

      // Assert - All hashes should be different
      expect(baseHash).not.toBe(differentQueryLogId);
      expect(baseHash).not.toBe(differentQuestion);
      expect(baseHash).not.toBe(differentSubjectCode);

      // Verify all three are different from each other too
      expect(differentQueryLogId).not.toBe(differentQuestion);
      expect(differentQueryLogId).not.toBe(differentSubjectCode);
      expect(differentQuestion).not.toBe(differentSubjectCode);
    });

    it('should handle empty strings', () => {
      // Arrange
      const params = {
        queryLogId: '',
        question: '',
        subjectCode: '',
      };

      // Act
      const hash = CourseHashUtil.generate(params);

      // Assert - Should still generate valid hash
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters in input', () => {
      // Arrange
      const params = {
        queryLogId: 'query-with-special-chars-123',
        question: '¿Cómo aprender Python? (日语)',
        subjectCode: 'CS-101_2024!',
      };

      // Act
      const hash1 = CourseHashUtil.generate(params);
      const hash2 = CourseHashUtil.generate(params);

      // Assert - Should handle special chars consistently
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should use pipe delimiter to avoid collision', () => {
      // This is a critical test - without proper delimiter, these could collide:
      // "a|bc" vs "ab|c"
      // With pipe delimiter: "query1|a|bc" vs "query2|ab|c" - no collision

      // Arrange
      const params1 = {
        queryLogId: 'query-1',
        question: 'a',
        subjectCode: 'bc',
      };
      const params2 = {
        queryLogId: 'query-2',
        question: 'ab',
        subjectCode: 'c',
      };

      // Act
      const hash1 = CourseHashUtil.generate(params1);
      const hash2 = CourseHashUtil.generate(params2);

      // Assert - Should NOT collide
      expect(hash1).not.toBe(hash2);
    });
  });
});
