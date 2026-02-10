import { Test, TestingModule } from '@nestjs/testing';

import type { SampleEvaluationRecord } from '../../../../types/skill-expansion.types';
import { SkillExpansionMetricsCalculator } from '../../../skill-expansion-metrics-calculator.service';

describe('SkillExpansionMetricsCalculator', () => {
  let service: SkillExpansionMetricsCalculator;

  // Test data factories
  const createSkillComparison = (
    overrides: Partial<SampleEvaluationRecord['comparison']['skills'][0]> = {},
  ): SampleEvaluationRecord['comparison']['skills'][0] => ({
    question: 'What is OOP?',
    systemSkill: 'Object-Oriented Programming',
    systemReason: 'User asked about OOP',
    judgeVerdict: 'PASS',
    judgeNote: 'Valid technical competency',
    agreementType: 'AGREE',
    ...overrides,
  });

  const createSampleRecord = (
    overrides: Partial<SampleEvaluationRecord> = {},
  ): SampleEvaluationRecord => ({
    queryLogId: 'ql-123',
    question: 'What is OOP?',
    comparison: {
      question: 'What is OOP?',
      skills: [createSkillComparison()],
      overall: {
        conceptPreserved: true,
        agreementCount: 1,
        disagreementCount: 0,
        totalSkills: 1,
      },
    },
    judgeResult: {
      result: {
        skills: [],
        overall: {
          conceptPreserved: true,
          summary: 'Good',
        },
      },
      tokenUsage: [],
    },
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillExpansionMetricsCalculator],
    }).compile();

    service = module.get<SkillExpansionMetricsCalculator>(
      SkillExpansionMetricsCalculator,
    );
  });

  describe('calculateFromRecords', () => {
    it('should calculate metrics from sample records', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'What is OOP?',
            skills: [
              createSkillComparison({
                judgeVerdict: 'PASS',
              }),
              createSkillComparison({
                judgeVerdict: 'FAIL',
              }),
            ],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 1,
              totalSkills: 2,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.totalSkills).toBe(2);
      expect(metrics.totalQuestions).toBe(1);
      expect(metrics.passedSkills).toBe(1);
      expect(metrics.passRate).toBeCloseTo(0.5, 4); // 1 PASS / 2 total
      expect(metrics.overallAgreementRate).toBeCloseTo(0.5, 4); // 1 PASS / 2 total
    });

    it('should calculate confusion matrix correctly', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'What is OOP?',
            skills: [
              createSkillComparison({ judgeVerdict: 'PASS' }),
              createSkillComparison({ judgeVerdict: 'FAIL' }),
            ],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 1,
              totalSkills: 2,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.truePositives).toBe(1); // PASS
      expect(metrics.falsePositives).toBe(1); // FAIL
    });

    it('should calculate concept preservation rate correctly', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'What is OOP?',
            skills: [createSkillComparison()],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 0,
              totalSkills: 1,
            },
          },
        }),
        createSampleRecord({
          queryLogId: 'ql-456',
          comparison: {
            question: 'What is Python?',
            skills: [createSkillComparison()],
            overall: {
              conceptPreserved: false,
              agreementCount: 0,
              disagreementCount: 1,
              totalSkills: 1,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.conceptPreservationRate).toBeCloseTo(0.5, 4); // 1 / 2
    });

    it('should calculate skill count distribution correctly', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [createSkillComparison(), createSkillComparison()],
            overall: {
              conceptPreserved: true,
              agreementCount: 2,
              disagreementCount: 0,
              totalSkills: 2,
            },
          },
        }),
        createSampleRecord({
          queryLogId: 'ql-456',
          comparison: {
            question: 'Question 2',
            skills: [createSkillComparison()],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 0,
              totalSkills: 1,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.skillCountDistribution).toEqual({
        1: 1,
        2: 1,
      });
    });

    it('should calculate average quality and reason scores', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [
              createSkillComparison({
                judgeVerdict: 'PASS',
              }),
              createSkillComparison({
                judgeVerdict: 'FAIL',
              }),
            ],
            overall: {
              conceptPreserved: true,
              agreementCount: 2,
              disagreementCount: 0,
              totalSkills: 2,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.passedSkills).toBe(1);
      expect(metrics.passRate).toBeCloseTo(0.5, 4); // 1 PASS / 2
    });

    it('should calculate confusion matrix correctly', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [
              createSkillComparison({ judgeVerdict: 'PASS' }),
              createSkillComparison({ judgeVerdict: 'FAIL' }),
            ],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 1,
              totalSkills: 2,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      // Since system always keeps:
      // - TP = PASS verdicts (1)
      // - FP = FAIL verdicts (1)
      expect(metrics.truePositives).toBe(1);
      expect(metrics.falsePositives).toBe(1);
    });

    it('should return empty metrics when no records provided', () => {
      // Act
      const metrics = service.calculateFromRecords([]);

      // Assert
      expect(metrics).toMatchObject({
        totalSkills: 0,
        totalQuestions: 0,
        passedSkills: 0,
        passRate: 0,
        conceptPreservationRate: 0,
        overallAgreementRate: 0,
      });
    });

    it('should return empty metrics when no skills in records', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [],
            overall: {
              conceptPreserved: false,
              agreementCount: 0,
              disagreementCount: 0,
              totalSkills: 0,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateFromRecords(records);

      // Assert
      expect(metrics.totalSkills).toBe(0);
    });
  });
});
