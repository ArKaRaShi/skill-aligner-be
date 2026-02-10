import { Test, TestingModule } from '@nestjs/testing';

import { describe, expect, it } from '@jest/globals';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type { CourseRetrievalAgreementType } from '../../types/course-retrieval.types';
import { CourseRetrievalComparisonService } from '../course-retrieval-comparison.service';

describe('CourseRetrievalComparisonService', () => {
  let service: CourseRetrievalComparisonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseRetrievalComparisonService],
    }).compile();

    service = module.get<CourseRetrievalComparisonService>(
      CourseRetrievalComparisonService,
    );
  });

  // Test data factories
  const createSystemSample = (
    overrides: Partial<{
      question: string;
      skill: string;
      testCaseId: string;
      retrievedCourses: Array<{
        subjectCode: string;
        subjectName: string;
        cleanedLearningOutcomes: string[];
      }>;
    }> = {},
  ) => ({
    question: 'How to learn Python?',
    skill: 'Python programming',
    testCaseId: 'test-001',
    retrievedCourses: [
      {
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        cleanedLearningOutcomes: ['Learn Python basics'],
      },
      {
        subjectCode: 'CS201',
        subjectName: 'Advanced Python',
        cleanedLearningOutcomes: ['OOP concepts'],
      },
    ],
    ...overrides,
  });

  const createJudgeResult = (
    overrides: Partial<{
      courses: Array<{
        subjectCode: string;
        verdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT';
        reason: string;
      }>;
      tokenUsage: TokenUsage[];
    }> = {},
  ) => ({
    courses: [
      {
        subjectCode: 'CS101',
        verdict: 'RELEVANT' as const,
        reason: 'Direct Python course',
      },
      {
        subjectCode: 'CS201',
        verdict: 'RELEVANT' as const,
        reason: 'Advanced Python content',
      },
    ],
    tokenUsage: [
      { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
    ] as TokenUsage[],
    ...overrides,
  });

  describe('compareSample', () => {
    it('should compare sample with RELEVANT system score and RELEVANT judge verdicts', () => {
      // Arrange
      const systemSample = createSystemSample();
      const systemScore = 3; // RELEVANT (≥2)
      const judgeResult = createJudgeResult({
        courses: [
          { subjectCode: 'CS101', verdict: 'RELEVANT', reason: 'Direct match' },
          {
            subjectCode: 'CS201',
            verdict: 'RELEVANT',
            reason: 'Advanced content',
          },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.question).toBe('How to learn Python?');
      expect(result.skill).toBe('Python programming');
      expect(result.testCaseId).toBe('test-001');
      expect(result.courses).toHaveLength(2);
      expect(result.tokenUsage).toEqual([
        { model: 'gpt-4', inputTokens: 100, outputTokens: 50 },
      ]);

      // Both courses should be BOTH_RELEVANT (agreement)
      expect(result.courses[0].agreementType).toBe('BOTH_RELEVANT');
      expect(result.courses[0].agreement).toBe(true);
      expect(result.courses[1].agreementType).toBe('BOTH_RELEVANT');
      expect(result.courses[1].agreement).toBe(true);
    });

    it('should compare sample with NOT_RELEVANT system score and NOT_RELEVANT judge verdicts', () => {
      // Arrange
      const systemSample = createSystemSample();
      const systemScore = 1; // NOT_RELEVANT (<2)
      const judgeResult = createJudgeResult({
        courses: [
          {
            subjectCode: 'CS101',
            verdict: 'NOT_RELEVANT',
            reason: 'Unrelated',
          },
          {
            subjectCode: 'CS201',
            verdict: 'NOT_RELEVANT',
            reason: 'Not relevant',
          },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses[0].agreementType).toBe('BOTH_NOT_RELEVANT');
      expect(result.courses[0].agreement).toBe(true);
      expect(result.courses[1].agreementType).toBe('BOTH_NOT_RELEVANT');
      expect(result.courses[1].agreement).toBe(true);
    });

    it('should detect SYSTEM_EXPLORATORY (system RELEVANT, judge NOT_RELEVANT)', () => {
      // Arrange
      const systemSample = createSystemSample();
      const systemScore = 3; // RELEVANT
      const judgeResult = createJudgeResult({
        courses: [
          {
            subjectCode: 'CS101',
            verdict: 'NOT_RELEVANT',
            reason: 'Unrelated',
          },
          { subjectCode: 'CS201', verdict: 'RELEVANT', reason: 'Good match' },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses[0].agreementType).toBe('SYSTEM_EXPLORATORY');
      expect(result.courses[0].agreement).toBe(false);
      expect(result.courses[1].agreementType).toBe('BOTH_RELEVANT');
      expect(result.courses[1].agreement).toBe(true);
    });

    it('should detect SYSTEM_CONSERVATIVE (system NOT_RELEVANT, judge RELEVANT)', () => {
      // Arrange
      const systemSample = createSystemSample();
      const systemScore = 1; // NOT_RELEVANT
      const judgeResult = createJudgeResult({
        courses: [
          { subjectCode: 'CS101', verdict: 'RELEVANT', reason: 'Good match' },
          {
            subjectCode: 'CS201',
            verdict: 'NOT_RELEVANT',
            reason: 'Unrelated',
          },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses[0].agreementType).toBe('SYSTEM_CONSERVATIVE');
      expect(result.courses[0].agreement).toBe(false);
      expect(result.courses[1].agreementType).toBe('BOTH_NOT_RELEVANT');
      expect(result.courses[1].agreement).toBe(true);
    });

    it('should detect PARTIAL_MISMATCH when judge verdict is PARTIALLY_RELEVANT', () => {
      // Arrange
      const systemSample = createSystemSample();
      const systemScore = 2; // RELEVANT
      const judgeResult = createJudgeResult({
        courses: [
          {
            subjectCode: 'CS101',
            verdict: 'PARTIALLY_RELEVANT',
            reason: 'Somewhat related',
          },
          { subjectCode: 'CS201', verdict: 'RELEVANT', reason: 'Good match' },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses[0].agreementType).toBe('PARTIAL_MISMATCH');
      expect(result.courses[0].agreement).toBe(false);
      expect(result.courses[1].agreementType).toBe('BOTH_RELEVANT');
      expect(result.courses[1].agreement).toBe(true);
    });

    it('should preserve system course information in comparison records', () => {
      // Arrange
      const systemSample = createSystemSample({
        retrievedCourses: [
          {
            subjectCode: 'CS999',
            subjectName: 'Special Course',
            cleanedLearningOutcomes: ['Advanced topic 1', 'Advanced topic 2'],
          },
        ],
      });
      const systemScore = 3;
      const judgeResult = createJudgeResult({
        courses: [
          { subjectCode: 'CS999', verdict: 'RELEVANT', reason: 'Great match' },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses[0].subjectCode).toBe('CS999');
      expect(result.courses[0].subjectName).toBe('Special Course');
      expect(result.courses[0].system).toEqual({ relevanceScore: 3 });
      expect(result.courses[0].judge).toEqual({
        verdict: 'RELEVANT',
        reason: 'Great match',
      });
    });

    it('should throw error when judge verdict missing for a course', () => {
      // Arrange
      const systemSample = createSystemSample({
        retrievedCourses: [
          {
            subjectCode: 'CS101',
            subjectName: 'Course 1',
            cleanedLearningOutcomes: [],
          },
          {
            subjectCode: 'CS201',
            subjectName: 'Course 2',
            cleanedLearningOutcomes: [],
          },
        ],
      });
      const systemScore = 2;
      // Missing CS201 verdict
      const judgeResult = createJudgeResult({
        courses: [
          { subjectCode: 'CS101', verdict: 'RELEVANT', reason: 'Good' },
        ],
      });

      // Act & Assert
      expect(() =>
        service.compareSample(systemSample, systemScore, judgeResult),
      ).toThrow('Missing judge verdict for course CS201');
    });
  });

  describe('mapScoreToRelevance', () => {
    it('should map scores ≥ 2 to RELEVANT', () => {
      expect(service.mapScoreToRelevance(2)).toBe('RELEVANT');
      expect(service.mapScoreToRelevance(3)).toBe('RELEVANT');
    });

    it('should map scores < 2 to NOT_RELEVANT', () => {
      expect(service.mapScoreToRelevance(0)).toBe('NOT_RELEVANT');
      expect(service.mapScoreToRelevance(1)).toBe('NOT_RELEVANT');
    });
  });

  describe('determineAgreementType', () => {
    const testCases: Array<{
      systemRelevance: 'RELEVANT' | 'NOT_RELEVANT';
      judgeVerdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT';
      expected: CourseRetrievalAgreementType;
    }> = [
      {
        systemRelevance: 'RELEVANT',
        judgeVerdict: 'RELEVANT',
        expected: 'BOTH_RELEVANT',
      },
      {
        systemRelevance: 'NOT_RELEVANT',
        judgeVerdict: 'NOT_RELEVANT',
        expected: 'BOTH_NOT_RELEVANT',
      },
      {
        systemRelevance: 'RELEVANT',
        judgeVerdict: 'NOT_RELEVANT',
        expected: 'SYSTEM_EXPLORATORY',
      },
      {
        systemRelevance: 'NOT_RELEVANT',
        judgeVerdict: 'RELEVANT',
        expected: 'SYSTEM_CONSERVATIVE',
      },
      {
        systemRelevance: 'RELEVANT',
        judgeVerdict: 'PARTIALLY_RELEVANT',
        expected: 'PARTIAL_MISMATCH',
      },
      {
        systemRelevance: 'NOT_RELEVANT',
        judgeVerdict: 'PARTIALLY_RELEVANT',
        expected: 'PARTIAL_MISMATCH',
      },
    ];

    testCases.forEach(({ systemRelevance, judgeVerdict, expected }) => {
      it(`should return ${expected} for system=${systemRelevance}, judge=${judgeVerdict}`, () => {
        // Act
        const result = service.determineAgreementType(
          systemRelevance,
          judgeVerdict,
        );

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle single course comparison', () => {
      // Arrange
      const systemSample = createSystemSample({
        retrievedCourses: [
          {
            subjectCode: 'CS101',
            subjectName: 'Python',
            cleanedLearningOutcomes: [],
          },
        ],
      });
      const systemScore = 3;
      const judgeResult = createJudgeResult({
        courses: [
          {
            subjectCode: 'CS101',
            verdict: 'RELEVANT',
            reason: 'Perfect match',
          },
        ],
      });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].agreementType).toBe('BOTH_RELEVANT');
    });

    it('should handle large number of courses', () => {
      // Arrange
      const courses = Array.from({ length: 10 }, (_, i) => ({
        subjectCode: `CS${i}01`,
        subjectName: `Course ${i}`,
        cleanedLearningOutcomes: [`Outcome ${i}`],
      }));
      const judgeCourses = courses.map((c) => ({
        subjectCode: c.subjectCode,
        verdict: 'RELEVANT' as const,
        reason: `Good match ${c.subjectCode}`,
      }));

      const systemSample = createSystemSample({ retrievedCourses: courses });
      const systemScore = 3;
      const judgeResult = createJudgeResult({ courses: judgeCourses });

      // Act
      const result = service.compareSample(
        systemSample,
        systemScore,
        judgeResult,
      );

      // Assert
      expect(result.courses).toHaveLength(10);
      result.courses.forEach((course) => {
        expect(course.agreementType).toBe('BOTH_RELEVANT');
        expect(course.agreement).toBe(true);
      });
    });
  });
});
