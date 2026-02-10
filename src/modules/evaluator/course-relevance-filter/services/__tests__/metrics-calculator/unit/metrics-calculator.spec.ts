import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type {
  AgreementType,
  MatchedSkill,
  SampleEvaluationRecord,
} from '../../../../types/course-relevance-filter.types';
import { CourseFilterMetricsCalculator } from '../../../metrics-calculator.service';

describe('CourseFilterMetricsCalculator', () => {
  let calculator: CourseFilterMetricsCalculator;

  beforeEach(() => {
    calculator = new CourseFilterMetricsCalculator();
  });

  // Test data helpers
  const createCourseRecord = (
    overrides: Partial<{
      question: string;
      subjectCode: string;
      subjectName: string;
      outcomes: string[];
      matchedSkills: MatchedSkill[];
      system: {
        score: 0 | 1 | 2 | 3;
        action: 'DROP' | 'KEEP';
        reason: string;
      };
      judge: {
        verdict: 'PASS' | 'FAIL';
        reason: string;
      };
      agreement: boolean;
      agreementType: AgreementType;
    }> = {},
  ) => ({
    question: 'Test question', // Add default question
    subjectCode: 'CS101',
    subjectName: 'Test Course',
    outcomes: ['Learn stuff'],
    matchedSkills: [] as MatchedSkill[],
    system: {
      score: 3 as 0 | 1 | 2 | 3,
      action: 'KEEP' as 'DROP' | 'KEEP',
      reason: 'Good match',
    },
    judge: {
      verdict: 'PASS' as 'PASS' | 'FAIL',
      reason: 'Useful course',
    },
    agreement: true,
    agreementType: 'BOTH_KEEP' as AgreementType,
    ...overrides,
  });

  const createSampleRecord = (
    courses: ReturnType<typeof createCourseRecord>[] = [],
    overrides: Partial<{ queryLogId: string; question: string }> = {},
  ): SampleEvaluationRecord => {
    const question = overrides.question ?? 'Test question';
    return {
      queryLogId: 'query-1',
      question,
      // Update each course with the question
      courses: courses.map((c) => ({ ...c, question })),
      tokenUsage: [] as TokenUsage[],
      ...overrides,
    };
  };

  describe('calculateFromRecords', () => {
    it('should calculate metrics from sample records', () => {
      // Arrange - Mixed agreement scenarios
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Direct match' },
            judge: { verdict: 'PASS', reason: 'Perfect fit' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreement: true,
            agreementType: 'BOTH_DROP',
          }),
          createCourseRecord({
            system: { score: 2, action: 'KEEP', reason: 'Medium match' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'PASS', reason: 'Useful' },
            agreement: false,
            agreementType: 'CONSERVATIVE_DROP',
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - Overall agreement rate
      expect(metrics.overallAgreementRate.value).toBe(0.5); // 2/4
      expect(metrics.overallAgreementRate.numerator).toBe(2); // BOTH_DROP + BOTH_KEEP
      expect(metrics.overallAgreementRate.denominator).toBe(4); // Total

      // Assert - Noise removal efficiency
      expect(metrics.noiseRemovalEfficiency.value).toBe(0.5); // 1/2
      expect(metrics.noiseRemovalEfficiency.numerator).toBe(1); // BOTH_DROP
      expect(metrics.noiseRemovalEfficiency.denominator).toBe(2); // System DROP (2 courses with score 0)

      // Assert - Exploratory recall
      expect(metrics.exploratoryRecall.value).toBe(0.5); // 1/2
      expect(metrics.exploratoryRecall.numerator).toBe(1); // EXPLORATORY_DELTA
      expect(metrics.exploratoryRecall.denominator).toBe(2); // System KEEP (2 courses with scores 1-3)

      // Assert - Conservative drop rate
      expect(metrics.conservativeDropRate.value).toBe(0.5); // 1/2
      expect(metrics.conservativeDropRate.numerator).toBe(1); // CONSERVATIVE_DROP
      expect(metrics.conservativeDropRate.denominator).toBe(2); // System DROP (2 courses with score 0)
    });

    it('should calculate score distribution correctly', () => {
      // Arrange
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          }),
          createCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Low relevance' },
          }),
          createCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Low relevance' },
          }),
          createCourseRecord({
            system: { score: 2, action: 'KEEP', reason: 'Medium relevance' },
          }),
          createCourseRecord({
            system: { score: 2, action: 'KEEP', reason: 'Medium relevance' },
          }),
          createCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'High relevance' },
          }),
          createCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'High relevance' },
          }),
          createCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'High relevance' },
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert
      expect(metrics.systemScoreDistribution.score0).toBe(1);
      expect(metrics.systemScoreDistribution.score1).toBe(2);
      expect(metrics.systemScoreDistribution.score2).toBe(2);
      expect(metrics.systemScoreDistribution.score3).toBe(3);
    });

    it('should calculate confusion matrix correctly', () => {
      // Arrange - All four scenarios
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreementType: 'BOTH_DROP',
          }),
          createCourseRecord({
            system: { score: 2, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreementType: 'BOTH_KEEP',
          }),
          createCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
            judge: { verdict: 'FAIL', reason: 'Not relevant' },
            agreementType: 'EXPLORATORY_DELTA',
          }),
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'PASS', reason: 'Useful' },
            agreementType: 'CONSERVATIVE_DROP',
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - Matrix
      expect(metrics.confusionMatrix.matrix).toEqual([
        [1, 1], // Judge FAIL row: [BOTH_DROP=1, EXPLORATORY_DELTA=1]
        [1, 1], // Judge PASS row: [CONSERVATIVE_DROP=1, BOTH_KEEP=1]
      ]);

      // Assert - Totals
      expect(metrics.confusionMatrix.totals).toEqual({
        systemDrop: 2, // 2 DROP courses
        systemKeep: 2, // 2 KEEP courses
        judgeFail: 2, // 2 FAIL verdicts
        judgePass: 2, // 2 PASS verdicts
      });
    });

    it('should handle empty records gracefully', () => {
      // Arrange
      const records: SampleEvaluationRecord[] = [];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert
      expect(metrics.sampleCount).toBe(0);
      expect(metrics.totalCoursesEvaluated).toBe(0);
      expect(metrics.overallAgreementRate.value).toBe(0);
      expect(metrics.systemScoreDistribution.score0).toBe(0);
      expect(metrics.confusionMatrix.matrix).toEqual([
        [0, 0],
        [0, 0],
      ]);
    });

    it('should count samples correctly', () => {
      // Arrange
      const records: SampleEvaluationRecord[] = [
        createSampleRecord([createCourseRecord()], { queryLogId: 'query-1' }),
        createSampleRecord([createCourseRecord()], { queryLogId: 'query-2' }),
        createSampleRecord([createCourseRecord()], { queryLogId: 'query-3' }),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert
      expect(metrics.sampleCount).toBe(3);
    });

    it('should sum courses across all samples', () => {
      // Arrange
      const records: SampleEvaluationRecord[] = [
        createSampleRecord([
          createCourseRecord(),
          createCourseRecord(),
          createCourseRecord(),
        ]),
        createSampleRecord([createCourseRecord(), createCourseRecord()]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - 5 courses total (3 in first sample, 2 in second)
      expect(metrics.totalCoursesEvaluated).toBe(5);
    });

    it('should handle all DROP scenario', () => {
      // Arrange - All courses dropped
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreementType: 'BOTH_DROP',
          }),
          createCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreementType: 'BOTH_DROP',
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - Perfect agreement
      expect(metrics.overallAgreementRate.value).toBe(1);
      expect(metrics.noiseRemovalEfficiency.value).toBe(1);
      expect(metrics.exploratoryRecall.value).toBe(0);
      expect(metrics.conservativeDropRate.value).toBe(0);
    });

    it('should handle all KEEP scenario with all PASS', () => {
      // Arrange - All courses kept and pass
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreementType: 'BOTH_KEEP',
          }),
          createCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Direct match' },
            judge: { verdict: 'PASS', reason: 'Perfect fit' },
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - Perfect agreement
      expect(metrics.overallAgreementRate.value).toBe(1);
      expect(metrics.noiseRemovalEfficiency.value).toBe(0); // No DROP to test
      expect(metrics.exploratoryRecall.value).toBe(0); // No disagreements
      expect(metrics.conservativeDropRate.value).toBe(0);
    });

    it('should calculate exploratory recall correctly', () => {
      // Arrange - 10 kept courses, 3 exploratory deltas
      const records: SampleEvaluationRecord[] = [];
      for (let i = 0; i < 7; i++) {
        records.push(
          createSampleRecord([
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Good match' },
              judge: { verdict: 'PASS', reason: 'Good' },
              agreementType: 'BOTH_KEEP',
            }),
          ]),
        );
      }
      for (let i = 0; i < 3; i++) {
        records.push(
          createSampleRecord([
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
              judge: { verdict: 'FAIL', reason: 'Irrelevant' },
              agreementType: 'EXPLORATORY_DELTA',
            }),
          ]),
        );
      }

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert
      expect(metrics.exploratoryRecall.value).toBeCloseTo(0.3, 2); // 3/10
      expect(metrics.exploratoryRecall.numerator).toBe(3); // EXPLORATORY_DELTA
      expect(metrics.exploratoryRecall.denominator).toBe(10); // System KEEP
    });

    it('should handle division by zero gracefully', () => {
      // Arrange - No system drops (would cause divide by zero)
      const records = [
        createSampleRecord([
          createCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreementType: 'BOTH_KEEP',
          }),
          createCourseRecord({
            system: { score: 2, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const metrics = calculator.calculateFromRecords(records);

      // Assert - Should handle gracefully (0/0 = 0)
      expect(metrics.noiseRemovalEfficiency.value).toBe(0);
      expect(metrics.noiseRemovalEfficiency.numerator).toBe(0);
      expect(metrics.noiseRemovalEfficiency.denominator).toBe(0);
    });

    // ==================== NEW: Score × Verdict Breakdown ====================
    describe('scoreVerdictBreakdown', () => {
      it('should calculate score × verdict breakdown correctly', () => {
        // Arrange - Mix of scores and verdicts
        const records = [
          createSampleRecord([
            createCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'Not relevant' },
              judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            }),
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Low match' },
              judge: { verdict: 'FAIL', reason: 'Not useful' },
            }),
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Low match' },
              judge: { verdict: 'PASS', reason: 'Useful' },
            }),
            createCourseRecord({
              system: { score: 2, action: 'KEEP', reason: 'Medium match' },
              judge: { verdict: 'FAIL', reason: 'Not useful' },
            }),
            createCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'High match' },
              judge: { verdict: 'PASS', reason: 'Useful' },
            }),
          ]),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert
        expect(metrics.scoreVerdictBreakdown).toBeDefined();
        expect(metrics.scoreVerdictBreakdown!.score0).toEqual({
          judgePass: 0,
          judgeFail: 1,
          total: 1,
          passRate: 0,
        });
        expect(metrics.scoreVerdictBreakdown!.score1).toEqual({
          judgePass: 1,
          judgeFail: 1,
          total: 2,
          passRate: 0.5,
        });
        expect(metrics.scoreVerdictBreakdown!.score2).toEqual({
          judgePass: 0,
          judgeFail: 1,
          total: 1,
          passRate: 0,
        });
        expect(metrics.scoreVerdictBreakdown!.score3).toEqual({
          judgePass: 1,
          judgeFail: 0,
          total: 1,
          passRate: 1,
        });
      });

      it('should show higher scores have higher pass rates (calibration)', () => {
        // Arrange - Perfect calibration: score 3 always passes, score 0 never passes
        const records = [
          createSampleRecord([
            createCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'No match' },
              judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            }),
            createCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'Perfect match' },
              judge: { verdict: 'PASS', reason: 'Perfect fit' },
            }),
          ]),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert - Score 0 has 0% pass rate, score 3 has 100% pass rate
        expect(metrics.scoreVerdictBreakdown!.score0.passRate).toBe(0);
        expect(metrics.scoreVerdictBreakdown!.score3.passRate).toBe(1);
      });
    });

    // ==================== NEW: Per-Sample Metrics ====================
    describe('perSampleMetrics', () => {
      it('should calculate per-sample metrics for multiple questions', () => {
        // Arrange - Two samples with different performance
        const records = [
          // Sample 1: Poor performance (50% agreement)
          createSampleRecord(
            [
              createCourseRecord({
                system: { score: 1, action: 'KEEP', reason: 'Match' },
                judge: { verdict: 'PASS', reason: 'Good' },
                agreementType: 'BOTH_KEEP',
              }),
              createCourseRecord({
                system: { score: 2, action: 'KEEP', reason: 'Match' },
                judge: { verdict: 'FAIL', reason: 'Bad' },
                agreementType: 'EXPLORATORY_DELTA',
              }),
            ],
            { queryLogId: 'query-1', question: 'Question 1' },
          ),
          // Sample 2: Better performance (100% agreement)
          createSampleRecord(
            [
              createCourseRecord({
                system: { score: 3, action: 'KEEP', reason: 'Match' },
                judge: { verdict: 'PASS', reason: 'Good' },
                agreementType: 'BOTH_KEEP',
              }),
              createCourseRecord({
                system: { score: 0, action: 'DROP', reason: 'No match' },
                judge: { verdict: 'FAIL', reason: 'Bad' },
                agreementType: 'BOTH_DROP',
              }),
            ],
            { queryLogId: 'query-2', question: 'Question 2' },
          ),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert
        expect(metrics.perSampleMetrics).toBeDefined();
        expect(metrics.perSampleMetrics).toHaveLength(2);

        // Sample 1: Poor performance
        expect(metrics.perSampleMetrics![0]).toMatchObject({
          sampleId: 1,
          queryLogId: 'query-1',
          question: 'Question 1',
          coursesEvaluated: 2,
          agreementCount: 1,
          disagreementCount: 1,
          agreementRate: 0.5,
        });

        // Sample 2: Better performance
        expect(metrics.perSampleMetrics![1]).toMatchObject({
          sampleId: 2,
          queryLogId: 'query-2',
          question: 'Question 2',
          coursesEvaluated: 2,
          agreementCount: 2,
          disagreementCount: 0,
          agreementRate: 1,
        });
      });

      it('should include noise removal and exploratory recall per sample', () => {
        // Arrange
        const records = [
          createSampleRecord(
            [
              createCourseRecord({
                system: { score: 0, action: 'DROP', reason: 'No match' },
                judge: { verdict: 'FAIL', reason: 'Bad' },
                agreementType: 'BOTH_DROP',
              }),
              createCourseRecord({
                system: { score: 1, action: 'KEEP', reason: 'Match' },
                judge: { verdict: 'FAIL', reason: 'Bad' },
                agreementType: 'EXPLORATORY_DELTA',
              }),
            ],
            { queryLogId: 'query-1' },
          ),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert
        expect(metrics.perSampleMetrics![0].noiseRemovalEfficiency).toBe(1); // 1/1
        expect(metrics.perSampleMetrics![0].exploratoryRecall).toBe(1); // 1/1
      });
    });

    // ==================== NEW: Threshold Sweep ====================
    describe('thresholdSweep', () => {
      it('should calculate threshold sweep for all thresholds', () => {
        // Arrange - Known distribution
        const records = [
          createSampleRecord([
            // Score 0, Judge FAIL (true negative if DROP)
            createCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'No match' },
              judge: { verdict: 'FAIL', reason: 'Bad' },
            }),
            // Score 1, Judge FAIL (false positive if KEEP with ≥1)
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Weak' },
              judge: { verdict: 'FAIL', reason: 'Bad' },
            }),
            // Score 2, Judge PASS (true positive if KEEP with ≥2)
            createCourseRecord({
              system: { score: 2, action: 'KEEP', reason: 'Good' },
              judge: { verdict: 'PASS', reason: 'Good' },
            }),
            // Score 3, Judge PASS (true positive if KEEP with ≥3)
            createCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'Perfect' },
              judge: { verdict: 'PASS', reason: 'Good' },
            }),
          ]),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert
        expect(metrics.thresholdSweep).toBeDefined();
        expect(metrics.thresholdSweep).toHaveLength(4);

        // Threshold keepAll (≥0): keeps all 4 courses
        const keepAll = metrics.thresholdSweep![0];
        expect(keepAll.threshold).toBe('keepAll');
        expect(keepAll.minScore).toBe(0);
        expect(keepAll.coursesKept).toBe(4);
        expect(keepAll.precision).toBeCloseTo(0.5, 2); // 2/4
        expect(keepAll.recall).toBe(1); // All PASS courses kept

        // Threshold ≥1: keeps 3 courses (scores 1,2,3)
        const ge1 = metrics.thresholdSweep![1];
        expect(ge1.threshold).toBe('≥1');
        expect(ge1.coursesKept).toBe(3);
        expect(ge1.precision).toBeCloseTo(0.67, 2); // 2/3
        expect(ge1.recall).toBe(1); // All PASS courses kept

        // Threshold ≥2: keeps 2 courses (scores 2,3)
        const ge2 = metrics.thresholdSweep![2];
        expect(ge2.threshold).toBe('≥2');
        expect(ge2.coursesKept).toBe(2);
        expect(ge2.precision).toBe(1); // 2/2 (all kept are PASS)
        expect(ge2.recall).toBe(1); // All PASS courses kept

        // Threshold ≥3: keeps 1 course (score 3)
        const ge3 = metrics.thresholdSweep![3];
        expect(ge3.threshold).toBe('≥3');
        expect(ge3.coursesKept).toBe(1);
        expect(ge3.precision).toBe(1); // 1/1
        expect(ge3.recall).toBe(0.5); // Only 1 of 2 PASS kept
      });

      it('should show precision-recall tradeoff across thresholds', () => {
        // Arrange - Same as above
        const records = [
          createSampleRecord([
            createCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'No match' },
              judge: { verdict: 'FAIL', reason: 'Bad' },
            }),
            createCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Weak' },
              judge: { verdict: 'FAIL', reason: 'Bad' },
            }),
            createCourseRecord({
              system: { score: 2, action: 'KEEP', reason: 'Good' },
              judge: { verdict: 'PASS', reason: 'Good' },
            }),
            createCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'Perfect' },
              judge: { verdict: 'PASS', reason: 'Good' },
            }),
          ]),
        ];

        // Act
        const metrics = calculator.calculateFromRecords(records);

        // Assert - Higher threshold → higher precision, lower recall
        expect(metrics.thresholdSweep![0].precision).toBeLessThan(
          metrics.thresholdSweep![2].precision,
        );
        expect(metrics.thresholdSweep![0].recall).toBeGreaterThanOrEqual(
          metrics.thresholdSweep![3].recall,
        );
      });
    });
  });
});
