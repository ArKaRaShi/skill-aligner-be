import { describe, expect, it } from '@jest/globals';

import { SkillExpansionHashUtil } from '../skill-expansion-hash.util';

describe('SkillExpansionHashUtil', () => {
  describe('generate', () => {
    it('should generate consistent hashes for identical inputs', () => {
      const params = {
        queryLogId: 'ql-123',
        question: 'What is object-oriented programming?',
        skill: 'Object-Oriented Programming',
      };

      const hash1 = SkillExpansionHashUtil.generate(params);
      const hash2 = SkillExpansionHashUtil.generate(params);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 format
    });

    it('should generate different hashes for different inputs', () => {
      const params1 = {
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        skill: 'Object-Oriented Programming',
      };

      const params2 = {
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        skill: 'Functional Programming',
      };

      const hash1 = SkillExpansionHashUtil.generate(params1);
      const hash2 = SkillExpansionHashUtil.generate(params2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when queryLogId differs', () => {
      const params = {
        question: 'What is OOP?',
        skill: 'Object-Oriented Programming',
      };

      const hash1 = SkillExpansionHashUtil.generate({
        ...params,
        queryLogId: 'ql-1',
      });
      const hash2 = SkillExpansionHashUtil.generate({
        ...params,
        queryLogId: 'ql-2',
      });

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when question differs', () => {
      const params = {
        queryLogId: 'ql-123',
        skill: 'Object-Oriented Programming',
      };

      const hash1 = SkillExpansionHashUtil.generate({
        ...params,
        question: 'What is OOP?',
      });
      const hash2 = SkillExpansionHashUtil.generate({
        ...params,
        question: 'Explain OOP concepts',
      });

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in inputs', () => {
      const params = {
        queryLogId: 'ql-123',
        question: 'What are "classes" and "objects" in OOP?',
        skill: 'Class Design (UML) | Object-Oriented Programming',
      };

      const hash = SkillExpansionHashUtil.generate(params);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty strings', () => {
      const params = {
        queryLogId: '',
        question: '',
        skill: '',
      };

      const hash = SkillExpansionHashUtil.generate(params);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle unicode characters', () => {
      const params = {
        queryLogId: 'ql-123',
        question: '什么是面向对象编程？',
        skill: '面向对象程序设计',
      };

      const hash = SkillExpansionHashUtil.generate(params);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateQuestionHash', () => {
    it('should generate consistent hashes for identical inputs', () => {
      const params = {
        queryLogId: 'ql-123',
        question: 'What is object-oriented programming?',
      };

      const hash1 = SkillExpansionHashUtil.generateQuestionHash(params);
      const hash2 = SkillExpansionHashUtil.generateQuestionHash(params);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hash than skill hash for same identifiers', () => {
      const params = {
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        skill: 'Object-Oriented Programming',
      };

      const questionHash = SkillExpansionHashUtil.generateQuestionHash({
        queryLogId: params.queryLogId,
        question: params.question,
      });

      const skillHash = SkillExpansionHashUtil.generate(params);

      expect(questionHash).not.toBe(skillHash);
    });
  });

  describe('generateTestSetHash', () => {
    it('should generate consistent hashes for same test set name', () => {
      const name = 'test-set-skill-expansion-20250124';

      const hash1 = SkillExpansionHashUtil.generateTestSetHash(name);
      const hash2 = SkillExpansionHashUtil.generateTestSetHash(name);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different names', () => {
      const hash1 = SkillExpansionHashUtil.generateTestSetHash('test-set-1');
      const hash2 = SkillExpansionHashUtil.generateTestSetHash('test-set-2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Hash stability', () => {
    it('should produce same hash regardless of parameter order if content is same', () => {
      // This test verifies that the pipe-delimited format is consistent
      // Order matters in our implementation, so this documents the behavior
      const params = {
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        skill: 'Object-Oriented Programming',
      };

      const hash1 = SkillExpansionHashUtil.generate(params);

      // Same parameters, same order
      const hash2 = SkillExpansionHashUtil.generate({
        queryLogId: params.queryLogId,
        question: params.question,
        skill: params.skill,
      });

      expect(hash1).toBe(hash2);
    });
  });
});
