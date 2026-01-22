import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { SampleEvaluationRecord } from '../../../../types/course-relevance-filter.types';
import { CourseFilterResultManagerService } from '../../../course-filter-result-manager.service';
import { DisagreementAnalyzerService } from '../../../disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from '../../../metrics-calculator.service';
import {
  createMockCourseRecord,
  createMockFinalMetricsFile,
  createMockMetricsFile,
  createMockSampleRecord,
} from '../../fixtures/course-filter-eval.fixtures';

// ============================================================================
// TEST CONSTANTS & HELPERS
// ============================================================================

const TEST_DIR = path.join(__dirname, '.temp-result-manager-integration-test');

const cleanupTestDir = (): void => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CourseFilterResultManagerService (Integration)', () => {
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

  afterAll(() => {
    cleanupTestDir();
  });

  beforeEach(() => {
    cleanupTestDir();
    // Override baseDir for testing
    (service as any).baseDir = TEST_DIR;
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('saveIterationRecords', () => {
    it('should save iteration records to file', async () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({
            subjectCode: 'CS101',
            subjectName: 'Python',
          }),
          createMockCourseRecord({ subjectCode: 'CS102', subjectName: 'Java' }),
        ]),
        createMockSampleRecord([
          createMockCourseRecord({
            subjectCode: 'MATH101',
            subjectName: 'Calculus',
          }),
        ]),
      ];

      // Act
      await service.saveIterationRecords({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        records,
      });

      // Assert
      const filePath = path.join(
        TEST_DIR,
        'test-set-v1',
        'records',
        'records-iteration-1.json',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const saved =
        await FileHelper.loadJson<SampleEvaluationRecord[]>(filePath);
      expect(saved).toEqual(records);
      expect(saved).toHaveLength(2);
      expect(saved[0].courses).toHaveLength(2);
      expect(saved[1].courses).toHaveLength(1);
    });

    it('should create directory structure if not exists', async () => {
      // Arrange
      const records = [
        createMockSampleRecord([
          createMockCourseRecord({ subjectCode: 'CS101' }),
        ]),
      ];

      // Act
      await service.saveIterationRecords({
        testSetName: 'new-test-set',
        iterationNumber: 1,
        records,
      });

      // Assert
      const dirPath = path.join(TEST_DIR, 'new-test-set', 'records');
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  describe('saveIterationMetrics', () => {
    it('should save iteration metrics to file', async () => {
      // Arrange
      const metrics = createMockMetricsFile();

      // Act
      await service.saveIterationMetrics({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        metrics,
      });

      // Assert
      const filePath = path.join(
        TEST_DIR,
        'test-set-v1',
        'metrics',
        'metrics-iteration-1.json',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = await FileHelper.loadJson<typeof metrics>(filePath);
      expect(saved).toEqual(metrics);
    });
  });

  describe('saveDisagreements', () => {
    it('should save disagreements analysis to file', async () => {
      // Arrange
      const disagreements = {
        totalDisagreements: 2,
        totalSamples: 5,
        disagreementRate: 0.4,
        byType: {
          EXPLORATORY_DELTA: {
            count: 1,
            percentage: 0.5,
            description: 'System keeps courses that judge would drop',
            bySystemScore: {
              score1: 1,
              score2: 0,
              score3: 0,
            },
            commonPatterns: [],
            examples: [],
          },
          CONSERVATIVE_DROP: {
            count: 1,
            percentage: 0.5,
            description: 'System drops courses that judge would keep',
            commonPatterns: [],
            examples: [],
          },
        },
        insights: {
          systemCharacter: 'Balanced',
          judgeCharacter: 'Binary',
          recommendation: 'No changes',
        },
      };

      // Act
      await service.saveDisagreements({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        disagreements,
      });

      // Assert
      const filePath = path.join(
        TEST_DIR,
        'test-set-v1',
        'disagreements',
        'disagreements-iteration-1.json',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = await FileHelper.loadJson<typeof disagreements>(filePath);
      expect(saved).toEqual(disagreements);
    });
  });

  describe('saveExploratoryDelta', () => {
    it('should save exploratory delta analysis to file', async () => {
      // Arrange
      const exploratoryDelta = {
        description: 'Analysis of EXPLORATORY_DELTA cases',
        totalCases: 3,
        categories: {
          FOUNDATIONAL_OVERKEEP: {
            count: 2,
            description: 'System keeps foundational/prerequisite courses',
            pattern: 'FOUNDATIONAL_OVERKEEP',
            examples: [],
          },
          SIBLING_MISCLASSIFICATION: {
            count: 1,
            description: 'System keeps sibling/adjacent topics',
            pattern: 'SIBLING_MISCLASSIFICATION',
            examples: [],
          },
          CONTEXTUAL_OVERALIGNMENT: {
            count: 0,
            description: 'System keeps courses due to contextual keywords',
            pattern: 'CONTEXTUAL_OVERALIGNMENT',
            examples: [],
          },
        },
        insights: {
          strength: 'Comprehensive',
          weakness: 'Keeps introductory courses',
          recommendation: 'Add filter for advanced users',
        },
      };

      // Act
      await service.saveExploratoryDelta({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        exploratoryDelta,
      });

      // Assert
      const filePath = path.join(
        TEST_DIR,
        'test-set-v1',
        'exploratory-delta',
        'exploratory-delta-iteration-1.json',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const saved =
        await FileHelper.loadJson<typeof exploratoryDelta>(filePath);
      expect(saved).toEqual(exploratoryDelta);
    });
  });

  describe('saveFinalMetrics', () => {
    it('should save final aggregated metrics to file', async () => {
      // Arrange
      const finalMetrics = createMockFinalMetricsFile();

      // Act
      await service.saveFinalMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 3,
        metrics: finalMetrics,
      });

      // Assert
      const filePath = path.join(
        TEST_DIR,
        'test-set-v1',
        'final-metrics',
        'final-metrics-3.json',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = await FileHelper.loadJson<typeof finalMetrics>(filePath);
      expect(saved).toEqual(finalMetrics);
    });
  });

  describe('calculateFinalMetrics', () => {
    it('should aggregate metrics across multiple iterations', async () => {
      // Arrange - Create iteration metrics files
      const metrics1 = {
        iteration: 1,
        timestamp: '2025-01-01T00:00:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.8, numerator: 4, denominator: 5 },
        noiseRemovalEfficiency: { value: 0.9, numerator: 9, denominator: 10 },
        exploratoryRecall: { value: 0.1, numerator: 1, denominator: 10 },
        conservativeDropRate: { value: 0, numerator: 0, denominator: 10 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 0],
            [0, 2],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 1, judgePass: 2 },
        },
      };

      const metrics2 = {
        iteration: 2,
        timestamp: '2025-01-01T00:01:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.6, numerator: 3, denominator: 5 },
        noiseRemovalEfficiency: { value: 0.8, numerator: 8, denominator: 10 },
        exploratoryRecall: { value: 0.3, numerator: 3, denominator: 10 },
        conservativeDropRate: { value: 0.1, numerator: 1, denominator: 10 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 1],
            [0, 1],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 2, judgePass: 1 },
        },
      };

      const metrics3 = {
        iteration: 3,
        timestamp: '2025-01-01T00:02:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.7, numerator: 7, denominator: 10 },
        noiseRemovalEfficiency: { value: 0.85, numerator: 17, denominator: 20 },
        exploratoryRecall: { value: 0.2, numerator: 2, denominator: 10 },
        conservativeDropRate: { value: 0.05, numerator: 1, denominator: 20 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 0],
            [0, 2],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 1, judgePass: 2 },
        },
      };

      // Save metrics files
      const metricsDir = path.join(TEST_DIR, 'test-set-v1', 'metrics');
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-1.json'),
        metrics1,
      );
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-2.json'),
        metrics2,
      );
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-3.json'),
        metrics3,
      );

      // Act
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 3,
      });

      // Assert
      expect(finalMetrics.iterations).toBe(3);
      expect(finalMetrics.perIterationMetrics).toHaveLength(3);

      // Verify overallAgreementRate statistics
      // Values: [0.8, 0.6, 0.7]
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.mean,
      ).toBeCloseTo(0.7, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.min,
      ).toBeCloseTo(0.6, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.max,
      ).toBeCloseTo(0.8, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.stdDev,
      ).toBeGreaterThan(0);
    });

    it('should throw error if no metrics files found', async () => {
      // Act & Assert
      await expect(
        service.calculateFinalMetrics({
          testSetName: 'non-existent',
          totalIterations: 3,
        }),
      ).rejects.toThrow('No iteration metrics found to aggregate');
    });

    it('should handle single iteration with zero standard deviation', async () => {
      // Arrange - Single iteration metrics file
      const metrics1 = {
        iteration: 1,
        timestamp: '2025-01-01T00:00:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.75, numerator: 3, denominator: 4 },
        noiseRemovalEfficiency: { value: 0.8, numerator: 4, denominator: 5 },
        exploratoryRecall: { value: 0.2, numerator: 1, denominator: 5 },
        conservativeDropRate: { value: 0, numerator: 0, denominator: 5 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 1],
            [0, 2],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 1, judgePass: 2 },
        },
      };

      // Save single metrics file
      const metricsDir = path.join(TEST_DIR, 'test-set-v1', 'metrics');
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-1.json'),
        metrics1,
      );

      // Act
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 1,
      });

      // Assert
      expect(finalMetrics.iterations).toBe(1);
      expect(finalMetrics.perIterationMetrics).toHaveLength(1);

      // With single value: mean = min = max = value, stdDev = 0
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.mean,
      ).toBeCloseTo(0.75, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.min,
      ).toBeCloseTo(0.75, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.max,
      ).toBeCloseTo(0.75, 4);
      expect(finalMetrics.aggregateMetrics.overallAgreementRate.stdDev).toBe(0);
    });

    it('should aggregate successfully when some iteration files fail to load', async () => {
      // Arrange - Create 3 iteration metrics files, but corrupt the 2nd one
      const metrics1 = {
        iteration: 1,
        timestamp: '2025-01-01T00:00:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.8, numerator: 4, denominator: 5 },
        noiseRemovalEfficiency: { value: 0.9, numerator: 9, denominator: 10 },
        exploratoryRecall: { value: 0.1, numerator: 1, denominator: 10 },
        conservativeDropRate: { value: 0, numerator: 0, denominator: 10 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 0],
            [0, 2],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 1, judgePass: 2 },
        },
      };

      const metrics3 = {
        iteration: 3,
        timestamp: '2025-01-01T00:02:00.000Z',
        sampleCount: 1,
        totalCoursesEvaluated: 3,
        overallAgreementRate: { value: 0.6, numerator: 3, denominator: 5 },
        noiseRemovalEfficiency: { value: 0.85, numerator: 17, denominator: 20 },
        exploratoryRecall: { value: 0.15, numerator: 3, denominator: 20 },
        conservativeDropRate: { value: 0.05, numerator: 1, denominator: 20 },
        systemScoreDistribution: { score0: 1, score1: 1, score2: 1, score3: 0 },
        confusionMatrix: {
          label: 'Test',
          matrix: [
            [1, 1],
            [0, 1],
          ],
          totals: { systemDrop: 1, systemKeep: 2, judgeFail: 2, judgePass: 1 },
        },
      };

      // Save iteration 1 and 3, but iteration 2 will be missing
      const metricsDir = path.join(TEST_DIR, 'test-set-v1', 'metrics');
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-1.json'),
        metrics1,
      );
      // Skip metrics-iteration-2.json (simulating failed save/corruption)
      await FileHelper.saveJson(
        path.join(metricsDir, 'metrics-iteration-3.json'),
        metrics3,
      );

      // Act - Should aggregate only iterations 1 and 3
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 3,
      });

      // Assert - Should succeed with 2 iterations loaded
      expect(finalMetrics.iterations).toBe(2);
      expect(finalMetrics.perIterationMetrics).toHaveLength(2);

      // Verify aggregation uses only available iterations
      // Values: [0.8, 0.6] -> mean = 0.7, variance = ((0.1)^2 + (-0.1)^2) / 2 = 0.01, stdDev = 0.1
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.mean,
      ).toBeCloseTo(0.7, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.min,
      ).toBeCloseTo(0.6, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.max,
      ).toBeCloseTo(0.8, 4);
      expect(
        finalMetrics.aggregateMetrics.overallAgreementRate.stdDev,
      ).toBeCloseTo(0.1, 4); // sqrt(0.01)
    });
  });

  describe('ensureDirectoryStructure', () => {
    it('should create all required directories', async () => {
      // Act
      await service.ensureDirectoryStructure('test-set-v1');

      // Assert
      const baseDir = path.join(TEST_DIR, 'test-set-v1');
      const subdirs = [
        'metrics',
        'records',
        'disagreements',
        'exploratory-delta',
        'final-metrics',
      ];

      for (const subdir of subdirs) {
        const dirPath = path.join(baseDir, subdir);
        expect(fs.existsSync(dirPath)).toBe(true);
      }
    });
  });
});
