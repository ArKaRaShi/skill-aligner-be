import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type {
  EvaluateRetrieverOutput,
  RetrievalPerformanceMetrics,
} from '../../../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from '../../course-retrieval-metrics-calculator.service';
import { CourseRetrievalResultManagerService } from '../../course-retrieval-result-manager.service';

// ============================================================================
// TEST HELPERS
// ============================================================================

const getTempDir = () =>
  path.join(os.tmpdir(), `per-class-distribution-test-${Date.now()}`);

/**
 * Create mock per-class distribution
 */
const createPerClassDistribution = (counts: {
  score0: number;
  score1: number;
  score2: number;
  score3: number;
}): RetrievalPerformanceMetrics['perClassDistribution'] => {
  const total = counts.score0 + counts.score1 + counts.score2 + counts.score3;

  const createRate = (
    score: number,
    count: number,
    label: string,
  ): RetrievalPerformanceMetrics['perClassDistribution'][keyof RetrievalPerformanceMetrics['perClassDistribution']] => ({
    relevanceScore: score as 0 | 1 | 2 | 3,
    label: label as any,
    count,
    macroAverageRate: total > 0 ? (count * 100) / total : 0,
    microAverageRate: total > 0 ? (count * 100) / total : 0,
  });

  return {
    score0: createRate(0, counts.score0, 'irrelevant'),
    score1: createRate(1, counts.score1, 'slightly_relevant'),
    score2: createRate(2, counts.score2, 'fairly_relevant'),
    score3: createRate(3, counts.score3, 'highly_relevant'),
  };
};

/**
 * Create a mock record (EvaluateRetrieverOutput) with metrics
 */
const createMockRecord = (overrides: {
  skill: string;
  totalCourses: number;
  perClassDistributionCounts: {
    score0: number;
    score1: number;
    score2: number;
    score3: number;
  };
}): EvaluateRetrieverOutput => {
  const { totalCourses, perClassDistributionCounts, skill } = overrides;
  const distribution = createPerClassDistribution(perClassDistributionCounts);

  // Calculate total relevance sum from distribution
  const totalRelevanceSum =
    distribution.score0.count * 0 +
    distribution.score1.count * 1 +
    distribution.score2.count * 2 +
    distribution.score3.count * 3;

  const metrics: RetrievalPerformanceMetrics = {
    totalCourses,
    meanRelevanceScore: totalCourses > 0 ? totalRelevanceSum / totalCourses : 0,
    totalRelevanceSum,
    perClassDistribution: distribution,
    ndcg: {
      proxy: { at5: 0.65, at10: 0.75, at15: 0.78, atAll: 0.8 },
      ideal: { at5: 0.5, at10: 0.6, at15: 0.63, atAll: 0.65 },
    },
    precision: {
      at5: { threshold1: 0.7, threshold2: 0.45, threshold3: 0.2 },
      at10: { threshold1: 0.65, threshold2: 0.4, threshold3: 0.18 },
      at15: { threshold1: 0.63, threshold2: 0.38, threshold3: 0.17 },
      atAll: { threshold1: 0.6, threshold2: 0.35, threshold3: 0.15 },
    },
  };

  return {
    questionIds: ['test-1'],
    skill,
    retrievedCount: totalCourses,
    evaluations: [], // Not used for metrics calculation
    metrics,
    llmModel: 'gpt-4',
    llmProvider: 'openai',
    inputTokens: 100,
    outputTokens: 50,
  };
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CourseRetrievalMetricsCalculator - Per-Class Distribution Integration', () => {
  let resultManager: CourseRetrievalResultManagerService;
  let tempDir: string;

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseRetrievalResultManagerService],
    })
      .overrideProvider(CourseRetrievalResultManagerService)
      .useFactory({
        factory: () => {
          return new CourseRetrievalResultManagerService(tempDir);
        },
      })
      .compile();

    resultManager = module.get<CourseRetrievalResultManagerService>(
      CourseRetrievalResultManagerService,
    );
  });

  afterEach(async () => {
    await FileHelper.deleteDirectory(tempDir);
  });

  describe('Normal case - No count gap', () => {
    it('should calculate micro rates correctly when counts sum to totalCourses', () => {
      // Arrange: Create 2 mock records where distribution counts sum to totalCourses
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 10,
            score1: 15,
            score2: 15,
            score3: 10,
          },
        }),
        createMockRecord({
          skill: 'skill2',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 15,
            score1: 10,
            score2: 10,
            score3: 15,
          },
        }),
      ];

      // Act: Calculate mean metrics
      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert: Verify aggregation
      expect(meanMetrics.totalCourses).toBe(100); // Sum of totalCourses

      // Distribution counts should sum correctly
      const score0Count = meanMetrics.perClassDistribution.score0.count;
      const score1Count = meanMetrics.perClassDistribution.score1.count;
      const score2Count = meanMetrics.perClassDistribution.score2.count;
      const score3Count = meanMetrics.perClassDistribution.score3.count;

      expect(score0Count).toBe(25); // 10 + 15
      expect(score1Count).toBe(25); // 15 + 10
      expect(score2Count).toBe(25); // 15 + 10
      expect(score3Count).toBe(25); // 10 + 15

      // Sum of counts = 100 (no gap)
      const sumOfCounts = score0Count + score1Count + score2Count + score3Count;
      expect(sumOfCounts).toBe(100);

      // Micro rates should be based on actual sum (100)
      expect(meanMetrics.perClassDistribution.score0.microAverageRate).toBe(
        25, // 25/100 * 100
      );
      expect(meanMetrics.perClassDistribution.score1.microAverageRate).toBe(
        25, // 25/100 * 100
      );
      expect(meanMetrics.perClassDistribution.score2.microAverageRate).toBe(
        25, // 25/100 * 100
      );
      expect(meanMetrics.perClassDistribution.score3.microAverageRate).toBe(
        25, // 25/100 * 100
      );
    });

    it('should build enriched metrics with correct outOf when no gap', () => {
      // Arrange: Single record with no gap
      const record = createMockRecord({
        skill: 'skill1',
        totalCourses: 100,
        perClassDistributionCounts: {
          score0: 20,
          score1: 30,
          score2: 30,
          score3: 20,
        },
      });

      const meanMetrics = CourseRetrievalMetricsCalculator.calculateMeanMetrics(
        [record],
      );

      // Act: Build enriched metrics
      const enrichedMetrics =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics: meanMetrics,
          sampleCount: 1,
          iterationNumber: 1,
        });

      // Assert: totalCount should match sum of distribution counts
      expect(enrichedMetrics.perClassDistribution.score0.outOf).toBe(100);
      expect(enrichedMetrics.perClassDistribution.score1.outOf).toBe(100);
      expect(enrichedMetrics.perClassDistribution.score2.outOf).toBe(100);
      expect(enrichedMetrics.perClassDistribution.score3.outOf).toBe(100);

      // Description should reference correct total
      expect(enrichedMetrics.perClassDistribution.score0.description).toContain(
        'of 100 courses',
      );
    });
  });

  describe('Count gap scenario - The bug fix', () => {
    it('should use actual sum of counts when gap exists (20 courses missing)', () => {
      // Arrange: Create 2 mock records with count gap
      // Total: totalCourses=100, distribution sum=80 (20 missing)
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 12,
            score1: 10,
            score2: 10,
            score3: 8,
          },
        }),
        createMockRecord({
          skill: 'skill2',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 13,
            score1: 10,
            score2: 10,
            score3: 7,
          },
        }),
      ];

      // Spy on console.warn to verify warning is logged
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation() as jest.SpyInstance<void, [string, ...unknown[]]>;

      // Act: Calculate mean metrics
      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert: Verify aggregation with count gap
      expect(meanMetrics.totalCourses).toBe(100); // Sum of totalCourses

      // Distribution counts
      const score0Count = meanMetrics.perClassDistribution.score0.count;
      const score1Count = meanMetrics.perClassDistribution.score1.count;
      const score2Count = meanMetrics.perClassDistribution.score2.count;
      const score3Count = meanMetrics.perClassDistribution.score3.count;

      expect(score0Count).toBe(25); // 12 + 13
      expect(score1Count).toBe(20); // 10 + 10
      expect(score2Count).toBe(20); // 10 + 10
      expect(score3Count).toBe(15); // 8 + 7

      // Sum of counts = 80 (20-course gap!)
      const sumOfCounts = score0Count + score1Count + score2Count + score3Count;
      expect(sumOfCounts).toBe(80);

      // Micro rates should be based on ACTUAL sum (80), NOT totalCourses (100)
      expect(
        meanMetrics.perClassDistribution.score0.microAverageRate,
      ).toBeCloseTo(31.25, 2); // 25/80 * 100 = 31.25%
      expect(
        meanMetrics.perClassDistribution.score1.microAverageRate,
      ).toBeCloseTo(25.0, 2); // 20/80 * 100 = 25.0%
      expect(
        meanMetrics.perClassDistribution.score2.microAverageRate,
      ).toBeCloseTo(25.0, 2); // 20/80 * 100 = 25.0%
      expect(
        meanMetrics.perClassDistribution.score3.microAverageRate,
      ).toBeCloseTo(18.75, 2); // 15/80 * 100 = 18.75%

      // Micro rates should sum to 100%
      const sumOfMicroRates =
        meanMetrics.perClassDistribution.score0.microAverageRate +
        meanMetrics.perClassDistribution.score1.microAverageRate +
        meanMetrics.perClassDistribution.score2.microAverageRate +
        meanMetrics.perClassDistribution.score3.microAverageRate;
      expect(sumOfMicroRates).toBeCloseTo(100, 1);

      // Verify console warning was logged
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warningCalls = consoleWarnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Count gap detected'),
      );
      expect(warningCalls.length).toBeGreaterThan(0);
      const warningMessage = warningCalls[0]?.[0] ?? '';
      expect(warningMessage).toContain('Count gap detected');
      expect(warningMessage).toContain('Total courses evaluated: 100');
      expect(warningMessage).toContain('Sum of distribution counts: 80');
      expect(warningMessage).toContain('Gap: 20 courses');

      consoleWarnSpy.mockRestore();
    });

    it('should build enriched metrics with outOf as actual sum (not totalCourses)', () => {
      // Arrange: Records with count gap
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 12,
            score1: 10,
            score2: 10,
            score3: 8,
          },
        }),
        createMockRecord({
          skill: 'skill2',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 13,
            score1: 10,
            score2: 10,
            score3: 7,
          },
        }),
      ];

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation() as jest.SpyInstance<void, [string, ...unknown[]]>;

      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Act: Build enriched metrics
      const enrichedMetrics =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics: meanMetrics,
          sampleCount: 2,
          iterationNumber: 1,
        });

      // Assert: outOf should be 80 (actual sum), NOT 100 (totalCourses)
      expect(enrichedMetrics.perClassDistribution.score0.outOf).toBe(80);
      expect(enrichedMetrics.perClassDistribution.score1.outOf).toBe(80);
      expect(enrichedMetrics.perClassDistribution.score2.outOf).toBe(80);
      expect(enrichedMetrics.perClassDistribution.score3.outOf).toBe(80);

      // Descriptions should reference actual total (80), not totalCourses (100)
      expect(enrichedMetrics.perClassDistribution.score0.description).toContain(
        'of 80 courses',
      );
      expect(enrichedMetrics.perClassDistribution.score3.description).toContain(
        'of 80 courses',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Save & Load round-trip', () => {
    it('should persist and reload metrics with correct outOf', async () => {
      // Arrange: Records with count gap
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 12,
            score1: 10,
            score2: 10,
            score3: 8,
          },
        }),
        createMockRecord({
          skill: 'skill2',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 13,
            score1: 10,
            score2: 10,
            score3: 7,
          },
        }),
      ];

      const testSetName = 'test-round-trip';
      const iterationNumber = 1;

      // Act: Save metrics (saveIterationMetrics calculates mean metrics internally)
      const metricsPath = await resultManager.saveIterationMetrics({
        testSetName,
        iterationNumber,
        records,
        skillDeduplicationStats: {
          totalQuestions: 2,
          totalSkillsExtracted: 2,
          uniqueSkillsEvaluated: 2,
          deduplicationRate: 0,
          skillFrequency: new Map([
            ['skill1', 1],
            ['skill2', 1],
          ]),
        },
      });

      // Load metrics back from file
      const loadedMetrics = await FileHelper.loadJson<any>(metricsPath);

      // Assert: Loaded metrics should match saved metrics
      expect(loadedMetrics).toBeDefined();
      expect(loadedMetrics.totalCoursesRetrieved).toBe(100); // This is totalCourses
      expect(loadedMetrics.sampleCount).toBe(2);

      // Per-class distribution should have correct totalCount (80, not 100)
      expect(loadedMetrics.perClassDistribution.score0.outOf).toBe(80);
      expect(loadedMetrics.perClassDistribution.score0.count).toBe(25);
      expect(
        loadedMetrics.perClassDistribution.score0.microAverageRate,
      ).toBeCloseTo(31.25, 2);

      expect(loadedMetrics.perClassDistribution.score1.outOf).toBe(80);
      expect(loadedMetrics.perClassDistribution.score1.count).toBe(20);
      expect(
        loadedMetrics.perClassDistribution.score1.microAverageRate,
      ).toBeCloseTo(25.0, 2);

      expect(loadedMetrics.perClassDistribution.score2.outOf).toBe(80);
      expect(loadedMetrics.perClassDistribution.score2.count).toBe(20);
      expect(
        loadedMetrics.perClassDistribution.score2.microAverageRate,
      ).toBeCloseTo(25.0, 2);

      expect(loadedMetrics.perClassDistribution.score3.outOf).toBe(80);
      expect(loadedMetrics.perClassDistribution.score3.count).toBe(15);
      expect(
        loadedMetrics.perClassDistribution.score3.microAverageRate,
      ).toBeCloseTo(18.75, 2);

      // Verify skillFrequency was serialized correctly (Map → Object)
      expect(loadedMetrics.skillDeduplicationStats?.skillFrequency).toEqual({
        skill1: 1,
        skill2: 1,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle single score class (all courses in one bucket)', () => {
      // Arrange: All courses are score3 (highly relevant)
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 0,
            score1: 0,
            score2: 0,
            score3: 50,
          },
        }),
      ];

      // Act
      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert: Only score3 should have non-zero values
      expect(meanMetrics.perClassDistribution.score0.count).toBe(0);
      expect(meanMetrics.perClassDistribution.score1.count).toBe(0);
      expect(meanMetrics.perClassDistribution.score2.count).toBe(0);
      expect(meanMetrics.perClassDistribution.score3.count).toBe(50);

      // Micro rates
      expect(meanMetrics.perClassDistribution.score0.microAverageRate).toBe(0);
      expect(meanMetrics.perClassDistribution.score1.microAverageRate).toBe(0);
      expect(meanMetrics.perClassDistribution.score2.microAverageRate).toBe(0);
      expect(meanMetrics.perClassDistribution.score3.microAverageRate).toBe(
        100, // 50/50 * 100
      );

      // outOf should be 50
      const enrichedMetrics =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics: meanMetrics,
          sampleCount: 1,
          iterationNumber: 1,
        });

      expect(enrichedMetrics.perClassDistribution.score3.outOf).toBe(50);
    });

    it('should handle large count gap (50% missing)', () => {
      // Arrange: Half the courses are missing from distribution
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 100,
          perClassDistributionCounts: {
            score0: 12,
            score1: 10,
            score2: 10,
            score3: 8,
          },
        }),
      ];

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation() as jest.SpyInstance<void, [string, ...unknown[]]>;

      // Act
      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert: outOf should be 40, not 100
      const enrichedMetrics =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics: meanMetrics,
          sampleCount: 1,
          iterationNumber: 1,
        });

      expect(enrichedMetrics.perClassDistribution.score0.outOf).toBe(40);
      expect(enrichedMetrics.perClassDistribution.score0.count).toBe(12);
      expect(
        enrichedMetrics.perClassDistribution.score0.microAverageRate,
      ).toBeCloseTo(30, 1); // 12/40 * 100 = 30%

      // Verify warning mentions large gap
      const warningCalls = consoleWarnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Count gap detected'),
      );
      expect(warningCalls.length).toBeGreaterThan(0);
      const warningMessage = warningCalls[0]?.[0] ?? '';
      expect(warningMessage).toContain('Gap: 60 courses'); // 100 - 40 = 60
      expect(warningMessage).toContain('60.00%'); // 60/100 * 100

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Macro vs Micro rate distinction', () => {
    it('should show difference between macro and micro when sample sizes vary', () => {
      // Arrange: 2 samples with different sizes and distributions
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 100,
          perClassDistributionCounts: {
            score0: 80, // 80% in sample 1
            score1: 10,
            score2: 5,
            score3: 5,
          },
        }),
        createMockRecord({
          skill: 'skill2',
          totalCourses: 20,
          perClassDistributionCounts: {
            score0: 0, // 0% in sample 2
            score1: 5,
            score2: 5,
            score3: 10,
          },
        }),
      ];

      // Act
      const meanMetrics =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert: Macro rate for score0 = (80 + 0) / 2 = 40%
      expect(
        meanMetrics.perClassDistribution.score0.macroAverageRate,
      ).toBeCloseTo(40, 1);

      // Micro rate for score0 = 80/120 * 100 = 66.67%
      expect(
        meanMetrics.perClassDistribution.score0.microAverageRate,
      ).toBeCloseTo(66.67, 1);

      // The enriched metrics should show different values for macro vs micro
      const enrichedMetrics =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics: meanMetrics,
          sampleCount: 2,
          iterationNumber: 1,
        });

      // Description should show both macro and micro
      const score0Desc =
        enrichedMetrics.perClassDistribution.score0.description;
      expect(score0Desc).toContain('Macro:');
      expect(score0Desc).toContain('Micro:');
    });
  });

  describe('Full metrics file validation (Golden Master)', () => {
    it('should save metrics file with complete and correct structure', async () => {
      // Arrange: Create records with known values including count gap
      const records = [
        createMockRecord({
          skill: 'Python programming',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 12,
            score1: 10,
            score2: 10,
            score3: 8, // 40 total, 10 gap
          },
        }),
        createMockRecord({
          skill: 'Java programming',
          totalCourses: 50,
          perClassDistributionCounts: {
            score0: 13,
            score1: 10,
            score2: 10,
            score3: 7, // 40 total, 10 gap
          },
        }),
      ];

      const skillDeduplicationStats = {
        totalQuestions: 2,
        totalSkillsExtracted: 2,
        uniqueSkillsEvaluated: 2,
        deduplicationRate: 0,
        skillFrequency: new Map([
          ['Python programming', 1],
          ['Java programming', 1],
        ]),
      };

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation() as jest.SpyInstance<void, [string, ...unknown[]]>;

      // Act: Save metrics using real FileHelper through resultManager
      const metricsPath = await resultManager.saveIterationMetrics({
        testSetName: 'test-full-validation',
        iterationNumber: 1,
        records,
        skillDeduplicationStats,
      });

      // Load complete metrics file
      const metrics = await FileHelper.loadJson<any>(metricsPath);

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE ROOT FIELDS
      // ═══════════════════════════════════════════════════════════════
      expect(metrics.iteration).toBe(1);
      expect(metrics.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(metrics.sampleCount).toBe(2);
      expect(metrics.totalCoursesRetrieved).toBe(100);
      expect(metrics.totalCoursesScored).toBe(80); // Actual sum of distribution counts
      expect(metrics.coursesNotScored).toBe(20); // Gap = 100 - 80

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE DEDUPLICATION STATS (Map serialization)
      // ═══════════════════════════════════════════════════════════════
      expect(metrics.skillDeduplicationStats).toBeDefined();
      expect(metrics.skillDeduplicationStats.totalQuestions).toBe(2);
      expect(metrics.skillDeduplicationStats.totalSkillsExtracted).toBe(2);
      expect(metrics.skillDeduplicationStats.uniqueSkillsEvaluated).toBe(2);
      expect(metrics.skillDeduplicationStats.deduplicationRate).toBe(0);
      // Map should be serialized to plain object
      expect(metrics.skillDeduplicationStats.skillFrequency).toEqual({
        'Python programming': 1,
        'Java programming': 1,
      });

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE MEAN RELEVANCE SCORE
      // ═══════════════════════════════════════════════════════════════
      expect(metrics.meanRelevanceScore).toBeDefined();
      expect(metrics.meanRelevanceScore.macroMean).toBeDefined();
      expect(metrics.meanRelevanceScore.microMean).toBeDefined();
      expect(metrics.meanRelevanceScore.totalRelevanceSum).toBeDefined();
      expect(metrics.meanRelevanceScore.totalCourses).toBe(100);
      expect(metrics.meanRelevanceScore.sampleCount).toBe(2);
      expect(metrics.meanRelevanceScore.description).toMatch(
        /Macro mean.*avg of 2 samples/,
      );
      expect(metrics.meanRelevanceScore.description).toMatch(/Micro mean/);

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE PER-CLASS DISTRIBUTION (THE FIX)
      // ═══════════════════════════════════════════════════════════════
      const { score0, score1, score2, score3 } = metrics.perClassDistribution;

      // Score0 (irrelevant)
      expect(score0.relevanceScore).toBe(0);
      expect(score0.label).toBe('irrelevant');
      expect(score0.count).toBe(25); // 12 + 13
      expect(score0.outOf).toBe(80); // ← ACTUAL SUM, NOT 100
      // Macro rate = average of per-sample macro rates
      // Sample 1: 12/40 * 100 = 30%
      // Sample 2: 13/40 * 100 = 32.5%
      // Average: 31.25% (same as micro in this case)
      expect(score0.macroAverageRate).toBeCloseTo(31.25, 2);
      expect(score0.microAverageRate).toBeCloseTo(31.25, 2); // 25/80 * 100
      // Description uses simple format when macro ≈ micro (within 1%)
      expect(score0.description).toMatch(
        /25 of 80 courses.*31\.3%.*are irrelevant/,
      );

      // Score1 (slightly_relevant)
      expect(score1.relevanceScore).toBe(1);
      expect(score1.label).toBe('slightly_relevant');
      expect(score1.count).toBe(20); // 10 + 10
      expect(score1.outOf).toBe(80);
      // Sample 1: 10/40 * 100 = 25%
      // Sample 2: 10/40 * 100 = 25%
      // Average: 25% (same as micro)
      expect(score1.macroAverageRate).toBeCloseTo(25, 2);
      expect(score1.microAverageRate).toBeCloseTo(25, 2); // 20/80 * 100
      expect(score1.description).toMatch(
        /20 of 80 courses.*25\.0%.*are slightly relevant/,
      );

      // Score2 (fairly_relevant)
      expect(score2.relevanceScore).toBe(2);
      expect(score2.label).toBe('fairly_relevant');
      expect(score2.count).toBe(20); // 10 + 10
      expect(score2.outOf).toBe(80);
      // Sample 1: 10/40 * 100 = 25%
      // Sample 2: 10/40 * 100 = 25%
      // Average: 25% (same as micro)
      expect(score2.macroAverageRate).toBeCloseTo(25, 2);
      expect(score2.microAverageRate).toBeCloseTo(25, 2); // 20/80 * 100
      expect(score2.description).toMatch(
        /20 of 80 courses.*25\.0%.*are fairly relevant/,
      );

      // Score3 (highly_relevant)
      expect(score3.relevanceScore).toBe(3);
      expect(score3.label).toBe('highly_relevant');
      expect(score3.count).toBe(15); // 8 + 7
      expect(score3.outOf).toBe(80);
      // Sample 1: 8/40 * 100 = 20%
      // Sample 2: 7/40 * 100 = 17.5%
      // Average: 18.75% (same as micro)
      expect(score3.macroAverageRate).toBeCloseTo(18.75, 2);
      expect(score3.microAverageRate).toBeCloseTo(18.75, 2); // 15/80 * 100
      expect(score3.description).toMatch(
        /15 of 80 courses.*18\.8%.*are highly relevant/,
      );

      // Verify micro rates sum to ~100%
      const sumOfMicroRates =
        score0.microAverageRate +
        score1.microAverageRate +
        score2.microAverageRate +
        score3.microAverageRate;
      expect(sumOfMicroRates).toBeCloseTo(100, 1);

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE NDCG METRICS
      // ═══════════════════════════════════════════════════════════════
      const { ndcg } = metrics;

      // NDCG@5
      expect(ndcg.at5.proxyNdcg).toBeDefined();
      expect(ndcg.at5.idealNdcg).toBeDefined();
      expect(ndcg.at5.description).toContain('Mean NDCG@5');
      expect(ndcg.at5.description).toContain('(2 samples)');

      // NDCG@10
      expect(ndcg.at10.proxyNdcg).toBeDefined();
      expect(ndcg.at10.idealNdcg).toBeDefined();
      expect(ndcg.at10.description).toContain('Mean NDCG@10');

      // NDCG@15
      expect(ndcg.at15.proxyNdcg).toBeDefined();
      expect(ndcg.at15.idealNdcg).toBeDefined();
      expect(ndcg.at15.description).toContain('Mean NDCG@15');

      // NDCG@All
      expect(ndcg.atAll.proxyNdcg).toBeDefined();
      expect(ndcg.atAll.idealNdcg).toBeDefined();
      // When k > 100, format is "Mean NDCG@{k}" not "Mean NDCG@All"
      expect(ndcg.atAll.description).toContain('Mean NDCG@100');
      expect(ndcg.atAll.description).toContain('2 samples');

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE PRECISION METRICS (Multi-threshold)
      // ═══════════════════════════════════════════════════════════════
      const { precision } = metrics;

      // Precision@5
      expect(precision.at5).toBeDefined();
      expect(precision.at5.threshold1.meanPrecision).toBeDefined();
      expect(precision.at5.threshold1.relevantCount).toBeGreaterThanOrEqual(0);
      expect(precision.at5.threshold1.totalCount).toBe(10); // 5 * 2 samples
      expect(precision.at5.threshold1.description).toContain('top-5');
      expect(precision.at5.threshold1.description).toContain('2 samples');

      expect(precision.at5.threshold2.meanPrecision).toBeDefined();
      expect(precision.at5.threshold2.description).toMatch(/≥2/);

      expect(precision.at5.threshold3.meanPrecision).toBeDefined();
      expect(precision.at5.threshold3.description).toMatch(/≥3/);

      // Precision@10
      expect(precision.at10).toBeDefined();
      expect(precision.at10.threshold1.meanPrecision).toBeDefined();
      expect(precision.at10.threshold1.totalCount).toBe(20); // 10 * 2 samples
      expect(precision.at10.threshold1.description).toContain('top-10');

      // Precision@15
      expect(precision.at15).toBeDefined();
      expect(precision.at15.threshold1.meanPrecision).toBeDefined();
      expect(precision.at15.threshold1.totalCount).toBe(30); // 15 * 2 samples
      expect(precision.at15.threshold1.description).toContain('top-15');

      // Precision@All
      expect(precision.atAll).toBeDefined();
      expect(precision.atAll.threshold1.meanPrecision).toBeDefined();
      expect(precision.atAll.threshold1.totalCount).toBe(100); // All courses
      expect(precision.atAll.threshold1.description).toContain('all retrieved');

      // ═══════════════════════════════════════════════════════════════
      // VALIDATE FILE PATH
      // ═══════════════════════════════════════════════════════════════
      expect(metricsPath).toContain('/test-full-validation/metrics/');
      expect(metricsPath).toContain('metrics-iteration-1.json');

      // Verify file actually exists
      const fileExists = FileHelper.exists(metricsPath);
      expect(fileExists).toBe(true);

      consoleWarnSpy.mockRestore();
    });

    it('should validate all score class descriptions are properly formatted', async () => {
      // Arrange: Records with count gap to trigger "Macro vs Micro" descriptions
      const records = [
        createMockRecord({
          skill: 'skill1',
          totalCourses: 100,
          perClassDistributionCounts: {
            score0: 30,
            score1: 25,
            score2: 25,
            score3: 20,
          },
        }),
      ];

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation() as jest.SpyInstance<void, [string, ...unknown[]]>;

      // Act
      const metricsPath = await resultManager.saveIterationMetrics({
        testSetName: 'test-descriptions',
        iterationNumber: 1,
        records,
      });

      const metrics = await FileHelper.loadJson<any>(metricsPath);

      // Assert: All descriptions should contain expected parts
      const descriptions = [
        metrics.perClassDistribution.score0.description,
        metrics.perClassDistribution.score1.description,
        metrics.perClassDistribution.score2.description,
        metrics.perClassDistribution.score3.description,
      ];

      for (const desc of descriptions) {
        // Should mention the count
        expect(desc).toMatch(/\d+ of \d+ courses/);
        // Should mention the label
        expect(desc).toMatch(/relevant/);
      }

      consoleWarnSpy.mockRestore();
    });
  });
});
