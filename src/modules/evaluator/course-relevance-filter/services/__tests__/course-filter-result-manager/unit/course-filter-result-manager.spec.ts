import { Test, TestingModule } from '@nestjs/testing';

import type { SampleEvaluationRecord } from '../../../../types/course-relevance-filter.types';
import { CourseFilterResultManagerService } from '../../../course-filter-result-manager.service';
import { DisagreementAnalyzerService } from '../../../disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from '../../../metrics-calculator.service';
import {
  createMockCourseRecord,
  createMockSampleRecord,
} from '../../fixtures/course-filter-eval.fixtures';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Unit tests for CourseFilterResultManagerService
 *
 * These tests verify pure logic methods that don't perform file I/O.
 * File I/O operations are tested in the integration test suite.
 */
describe('CourseFilterResultManagerService', () => {
  let service: CourseFilterResultManagerService;

  beforeAll(async () => {
    // Create test module with all dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseFilterResultManagerService,
        CourseFilterMetricsCalculator,
        DisagreementAnalyzerService,
      ],
    }).compile();

    service = module.get<CourseFilterResultManagerService>(
      CourseFilterResultManagerService,
    );
  });

  describe('calculateIterationMetrics', () => {
    it('should calculate metrics from evaluation records', () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Direct match' },
            judge: { verdict: 'PASS', reason: 'Perfect fit' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
          createMockCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreement: true,
            agreementType: 'BOTH_DROP',
          }),
          createMockCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
            judge: { verdict: 'FAIL', reason: 'Not relevant' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
        ]),
      ];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(metrics.iteration).toBe(1);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.sampleCount).toBe(1);
      expect(metrics.totalCoursesEvaluated).toBe(3);
      expect(metrics.overallAgreementRate.value).toBeCloseTo(0.6667, 4);
      expect(metrics.systemScoreDistribution.score0).toBe(1);
      expect(metrics.systemScoreDistribution.score1).toBe(1);
      expect(metrics.systemScoreDistribution.score3).toBe(1);
    });

    it('should throw error for empty records array', () => {
      // Arrange
      const records: SampleEvaluationRecord[] = [];

      // Act & Assert
      expect(() =>
        service.calculateIterationMetrics({
          iterationNumber: 1,
          records,
        }),
      ).toThrow('Cannot calculate metrics for empty records array');
    });

    it('should handle all agreement scenario', () => {
      // Arrange - All courses agree
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
          createMockCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'FAIL', reason: 'Irrelevant' },
            agreement: true,
            agreementType: 'BOTH_DROP',
          }),
        ]),
      ];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(metrics.overallAgreementRate.value).toBe(1);
      expect(metrics.noiseRemovalEfficiency.value).toBe(1);
      expect(metrics.exploratoryRecall.value).toBe(0);
      expect(metrics.conservativeDropRate.value).toBe(0);
    });

    it('should include timestamp in metrics', () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const beforeTime = new Date();
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });
      const afterTime = new Date();

      // Assert - Timestamp should be ISO string and within time range
      expect(metrics.timestamp).toBeDefined();
      const metricsTime = new Date(metrics.timestamp);
      expect(metricsTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(metricsTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should aggregate metrics across multiple samples with different course counts', () => {
      // Arrange - 3 samples with varying course counts
      const records = [
        createMockSampleRecord(
          [
            createMockCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'Good match' },
              judge: { verdict: 'PASS', reason: 'Good' },
              agreement: true,
              agreementType: 'BOTH_KEEP',
            }),
            createMockCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'Not relevant' },
              judge: { verdict: 'FAIL', reason: 'Irrelevant' },
              agreement: true,
              agreementType: 'BOTH_DROP',
            }),
          ],
          { queryLogId: 'query-1' },
        ),
        createMockSampleRecord(
          [
            createMockCourseRecord({
              system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
              judge: { verdict: 'FAIL', reason: 'Not relevant' },
              agreement: false,
              agreementType: 'EXPLORATORY_DELTA',
            }),
            createMockCourseRecord({
              system: { score: 2, action: 'KEEP', reason: 'Fair match' },
              judge: { verdict: 'PASS', reason: 'Good' },
              agreement: true,
              agreementType: 'BOTH_KEEP',
            }),
            createMockCourseRecord({
              system: { score: 0, action: 'DROP', reason: 'Not relevant' },
              judge: { verdict: 'PASS', reason: 'Useful' },
              agreement: false,
              agreementType: 'CONSERVATIVE_DROP',
            }),
          ],
          { queryLogId: 'query-2' },
        ),
        createMockSampleRecord(
          [
            createMockCourseRecord({
              system: { score: 3, action: 'KEEP', reason: 'Perfect match' },
              judge: { verdict: 'PASS', reason: 'Perfect' },
              agreement: true,
              agreementType: 'BOTH_KEEP',
            }),
          ],
          { queryLogId: 'query-3' },
        ),
      ];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Assert - Sample count
      expect(metrics.sampleCount).toBe(3);

      // Assert - Total courses: 2 + 3 + 1 = 6
      expect(metrics.totalCoursesEvaluated).toBe(6);

      // Assert - Overall agreement: 4 agreements (BOTH_KEEP=3, BOTH_DROP=1) / 6 total
      expect(metrics.overallAgreementRate.value).toBeCloseTo(0.6667, 4);
      expect(metrics.overallAgreementRate.numerator).toBe(4);
      expect(metrics.overallAgreementRate.denominator).toBe(6);

      // Assert - Score distribution: 2 DROPs, 4 KEEPs
      expect(metrics.systemScoreDistribution.score0).toBe(2);
      expect(metrics.systemScoreDistribution.score1).toBe(1);
      expect(metrics.systemScoreDistribution.score2).toBe(1);
      expect(metrics.systemScoreDistribution.score3).toBe(2);

      // Assert - Confusion matrix totals
      expect(metrics.confusionMatrix.totals.systemDrop).toBe(2);
      expect(metrics.confusionMatrix.totals.systemKeep).toBe(4);
      expect(metrics.confusionMatrix.totals.judgeFail).toBe(2);
      expect(metrics.confusionMatrix.totals.judgePass).toBe(4);
    });
  });

  describe('calculateDisagreements', () => {
    it('should calculate disagreements analysis from evaluation records', () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
            judge: { verdict: 'FAIL', reason: 'Not relevant' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
          createMockCourseRecord({
            system: { score: 0, action: 'DROP', reason: 'Not relevant' },
            judge: { verdict: 'PASS', reason: 'Actually useful' },
            agreement: false,
            agreementType: 'CONSERVATIVE_DROP',
          }),
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Direct match' },
            judge: { verdict: 'PASS', reason: 'Perfect fit' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const disagreements = service.calculateDisagreements({ records });

      // Assert
      expect(disagreements.totalDisagreements).toBe(2);
      expect(disagreements.totalSamples).toBe(1);
      expect(disagreementRate(disagreements, 3)).toBeCloseTo(0.6667, 4);
      expect(disagreements.byType.EXPLORATORY_DELTA.count).toBe(1);
      expect(disagreements.byType.CONSERVATIVE_DROP.count).toBe(1);
      expect(disagreements.insights.systemCharacter).toContain('Balanced');
    });

    it('should handle no disagreements gracefully', () => {
      // Arrange - All agreements
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const disagreements = service.calculateDisagreements({ records });

      // Assert
      expect(disagreements.totalDisagreements).toBe(0);
      expect(disagreements.disagreementRate).toBe(0);
      expect(disagreements.byType.EXPLORATORY_DELTA.count).toBe(0);
      expect(disagreements.byType.CONSERVATIVE_DROP.count).toBe(0);
      expect(disagreements.insights.systemCharacter).toContain(
        'Perfect agreement',
      );
    });
  });

  describe('calculateExploratoryDelta', () => {
    it('should calculate exploratory delta analysis from evaluation records', () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            subjectName: 'Introduction to Python',
            system: { score: 1, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'FAIL', reason: 'Too basic' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
          createMockCourseRecord({
            subjectName: 'Software Engineering',
            system: { score: 2, action: 'KEEP', reason: 'Related' },
            judge: { verdict: 'FAIL', reason: 'Related but not directly' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
          createMockCourseRecord({
            subjectName: 'History of Computing',
            system: { score: 1, action: 'KEEP', reason: 'Mentions computing' },
            judge: { verdict: 'FAIL', reason: 'Tangential' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
        ]),
      ];

      // Act
      const exploratoryDelta = service.calculateExploratoryDelta({ records });

      // Assert
      expect(exploratoryDelta.totalCases).toBe(3);
      expect(exploratoryDelta.categories.FOUNDATIONAL_OVERKEEP.count).toBe(1);
      expect(exploratoryDelta.categories.SIBLING_MISCLASSIFICATION.count).toBe(
        1,
      );
      expect(exploratoryDelta.categories.CONTEXTUAL_OVERALIGNMENT.count).toBe(
        1,
      );
      expect(exploratoryDelta.insights.strength).toContain('comprehensive');
      expect(exploratoryDelta.insights.recommendation).toBeDefined();
    });

    it('should handle no exploratory delta cases', () => {
      // Arrange - No exploratory deltas
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            system: { score: 3, action: 'KEEP', reason: 'Direct match' },
            judge: { verdict: 'PASS', reason: 'Good' },
            agreement: true,
            agreementType: 'BOTH_KEEP',
          }),
        ]),
      ];

      // Act
      const exploratoryDelta = service.calculateExploratoryDelta({ records });

      // Assert
      expect(exploratoryDelta.totalCases).toBe(0);
      expect(exploratoryDelta.categories.FOUNDATIONAL_OVERKEEP.count).toBe(0);
      expect(exploratoryDelta.categories.SIBLING_MISCLASSIFICATION.count).toBe(
        0,
      );
      expect(exploratoryDelta.categories.CONTEXTUAL_OVERALIGNMENT.count).toBe(
        0,
      );
      expect(exploratoryDelta.insights.strength).toContain(
        'No exploratory delta',
      );
    });
  });
});

/**
 * Helper to get disagreement rate from the result
 * Note: disagreementRate = totalDisagreements / totalCourses (not totalSamples)
 */
function disagreementRate(
  result: { totalDisagreements: number },
  totalCourses: number,
): number {
  return result.totalDisagreements / totalCourses;
}
