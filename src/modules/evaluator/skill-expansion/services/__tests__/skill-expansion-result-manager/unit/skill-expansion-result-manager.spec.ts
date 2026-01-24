import { Test, TestingModule } from '@nestjs/testing';

import { FileHelper } from 'src/shared/utils/file';

import type {
  SkillExpansionCostRecord,
  SkillExpansionMetrics,
} from '../../../../types/skill-expansion.types';
import { SkillExpansionMetricsCalculator } from '../../../skill-expansion-metrics-calculator.service';
import { SkillExpansionResultManagerService } from '../../../skill-expansion-result-manager.service';
import {
  createMockMetricsFile,
  createMockSampleRecord,
} from '../../fixtures/skill-expansion-runner.fixtures';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Unit tests for SkillExpansionResultManagerService
 *
 * Tests individual methods with minimal file I/O mocking.
 * Integration tests cover full file I/O workflows.
 */
describe('SkillExpansionResultManagerService', () => {
  let service: SkillExpansionResultManagerService;
  const tempDir = '/tmp/test-output';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillExpansionResultManagerService,
        SkillExpansionMetricsCalculator,
      ],
    })
      .overrideProvider(SkillExpansionResultManagerService)
      .useFactory({
        factory: (calc) =>
          new SkillExpansionResultManagerService(calc, tempDir),
        inject: [SkillExpansionMetricsCalculator],
      })
      .compile();

    service = module.get<SkillExpansionResultManagerService>(
      SkillExpansionResultManagerService,
    );
  });

  describe('calculateIterationMetrics', () => {
    it('should calculate metrics from records', () => {
      // Arrange
      const records = [
        createMockSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [
              {
                question: 'Question 1',
                systemSkill: 'OOP',
                systemReason: 'Good',
                judgeVerdict: 'PASS',
                judgeNote: 'Valid',
                agreementType: 'AGREE',
              },
              {
                question: 'Question 1',
                systemSkill: 'Java',
                systemReason: 'Bad',
                judgeVerdict: 'FAIL',
                judgeNote: 'Invalid',
                agreementType: 'DISAGREE',
              },
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
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(metrics.iteration).toBe(1);
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics.totalSkills).toBeGreaterThan(0);
    });

    it('should throw when records array is empty', () => {
      // Act & Assert
      expect(() =>
        service.calculateIterationMetrics({
          iterationNumber: 1,
          records: [],
        }),
      ).toThrow('Cannot calculate metrics for empty records array');
    });

    it('should include iteration number and timestamp', () => {
      // Arrange
      const records = [createMockSampleRecord()];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 5,
        records,
      });

      // Assert
      expect(metrics.iteration).toBe(5);
      expect(metrics.timestamp).toBeDefined();
      expect(new Date(metrics.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('loadIterationRecords', () => {
    it('should return empty array when file does not exist', async () => {
      // Arrange
      const loadJsonDirectorySpy = jest
        .spyOn(FileHelper, 'loadJsonDirectory')
        .mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.loadIterationRecords({
        testSetName: 'test-set-1',
        iterationNumber: 1,
      });

      // Assert
      expect(result).toEqual([]);
      loadJsonDirectorySpy.mockRestore();
    });

    it('should load existing records from file', async () => {
      // Arrange
      const mockRecords = [
        createMockSampleRecord({ queryLogId: 'log-1' }),
        createMockSampleRecord({ queryLogId: 'log-2' }),
      ];
      const loadJsonDirectorySpy = jest
        .spyOn(FileHelper, 'loadJsonDirectory')
        .mockResolvedValue(mockRecords);

      // Act
      const result = await service.loadIterationRecords({
        testSetName: 'test-set-1',
        iterationNumber: 1,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].queryLogId).toBe('log-1');
      expect(result[1].queryLogId).toBe('log-2');
      loadJsonDirectorySpy.mockRestore();
    });
  });

  describe('saveRecord', () => {
    it('should create new file with single record when file does not exist', async () => {
      // Arrange
      const mockRecord = createMockSampleRecord({ queryLogId: 'log-1' });
      const loadJsonSpy = jest
        .spyOn(FileHelper, 'loadJson')
        .mockRejectedValue(new Error('File not found'));
      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveRecord({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        hash: 'test-hash',
        record: mockRecord,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-hash.json'),
        mockRecord,
      );
      loadJsonSpy.mockRestore();
      saveJsonSpy.mockRestore();
    });

    it('should append record to existing file', async () => {
      // Arrange
      const existingRecord = createMockSampleRecord({ queryLogId: 'log-1' });
      const newRecord = createMockSampleRecord({ queryLogId: 'log-2' });
      const loadJsonSpy = jest
        .spyOn(FileHelper, 'loadJson')
        .mockResolvedValue([existingRecord]);
      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveRecord({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        hash: 'test-hash-new',
        record: newRecord,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-hash-new.json'),
        newRecord,
      );
      loadJsonSpy.mockRestore();
      saveJsonSpy.mockRestore();
    });

    it('should build correct file path', async () => {
      // Arrange
      const mockRecord = createMockSampleRecord();
      const loadJsonSpy = jest
        .spyOn(FileHelper, 'loadJson')
        .mockRejectedValue(new Error('File not found'));
      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveRecord({
        testSetName: 'my-test-set',
        iterationNumber: 3,
        hash: 'test-hash-path',
        record: mockRecord,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        `${tempDir}/my-test-set/records/iteration-3/test-hash-path.json`,
        mockRecord,
      );
      loadJsonSpy.mockRestore();
      saveJsonSpy.mockRestore();
    });
  });

  describe('saveIterationCost', () => {
    it('should aggregate tokens from all records', async () => {
      // Arrange
      const records = [
        createMockSampleRecord({
          judgeResult: {
            result: {
              skills: [],
              overall: { conceptPreserved: true, summary: 'Good' },
            },
            tokenUsage: [
              { model: 'gpt-4o-mini', inputTokens: 100, outputTokens: 50 },
              { model: 'gpt-4o-mini', inputTokens: 200, outputTokens: 100 },
            ],
          },
        }),
      ];

      // Mock FileHelper.saveJson
      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
        records,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          totalTokens: 450, // 100+50+200+100
        }),
      );

      saveJsonSpy.mockRestore();
    });

    it('should calculate average cost per sample and skill', async () => {
      // Arrange
      const records = [
        createMockSampleRecord({
          judgeResult: {
            result: {
              skills: [],
              overall: { conceptPreserved: true, summary: 'Good' },
            },
            tokenUsage: [
              { model: 'gpt-4o-mini', inputTokens: 100, outputTokens: 50 },
            ],
          },
        }),
      ];

      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
        records,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          sampleCount: 1,
          averageCostPerSample: expect.any(Number),
        }),
      );

      saveJsonSpy.mockRestore();
    });

    it('should handle zero samples/skills', async () => {
      // Arrange
      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
        records: [],
      });

      // Assert
      const savedData = saveJsonSpy.mock
        .calls[0][1] as SkillExpansionCostRecord;
      expect(savedData.averageCostPerSample).toBe(0);
      expect(savedData.averageCostPerSkill).toBe(0);

      saveJsonSpy.mockRestore();
    });

    it('should include model and provider from config', async () => {
      // Arrange
      const records = [createMockSampleRecord()];

      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined);

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        config: { judgeModel: 'gpt-4o', judgeProvider: 'openrouter' },
        records,
      });

      // Assert
      expect(saveJsonSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'gpt-4o',
          provider: 'openrouter',
        }),
      );

      saveJsonSpy.mockRestore();
    });
  });

  describe('private method: calculateAggregateMetrics', () => {
    it('should average rate-based metrics (passRate, conceptPreservationRate)', () => {
      // Arrange - create proper typed data
      const baseMetrics = createMockMetricsFile();
      const iterationMetrics: Array<
        SkillExpansionMetrics & { iteration: number }
      > = [
        {
          ...baseMetrics,
          iteration: 1,
          passRate: 0.8,
          conceptPreservationRate: 0.9,
        },
        {
          ...baseMetrics,
          iteration: 2,
          passRate: 0.85,
          conceptPreservationRate: 0.95,
        },
      ];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateAggregateMetrics(
        iterationMetrics,
      );

      // Assert
      expect(result.passRate).toBeCloseTo(0.825, 3); // (0.8 + 0.85) / 2
      expect(result.conceptPreservationRate).toBeCloseTo(0.925, 3); // (0.9 + 0.95) / 2
    });

    it('should sum count-based metrics (totalSkills, passedSkills)', () => {
      // Arrange
      const baseMetrics = createMockMetricsFile();
      const iterationMetrics: Array<
        SkillExpansionMetrics & { iteration: number }
      > = [
        { ...baseMetrics, iteration: 1, totalSkills: 10, passedSkills: 8 },
        { ...baseMetrics, iteration: 2, totalSkills: 20, passedSkills: 17 },
      ];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateAggregateMetrics(
        iterationMetrics,
      );

      // Assert
      expect(result.totalSkills).toBe(30); // 10 + 20
      expect(result.passedSkills).toBe(25); // 8 + 17
    });

    it('should merge skill count distributions', () => {
      // Arrange
      const baseMetrics = createMockMetricsFile();
      const iterationMetrics: Array<
        SkillExpansionMetrics & { iteration: number }
      > = [
        {
          ...baseMetrics,
          iteration: 1,
          skillCountDistribution: { 1: 5, 2: 3 },
        },
        {
          ...baseMetrics,
          iteration: 2,
          skillCountDistribution: { 2: 2, 3: 4 },
        },
      ];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateAggregateMetrics(
        iterationMetrics,
      );

      // Assert
      expect(result.skillCountDistribution).toEqual({
        1: 5,
        2: 5, // 3 + 2
        3: 4,
      });
    });

    it('should sum confusion matrix values', () => {
      // Arrange
      const baseMetrics = createMockMetricsFile();
      const iterationMetrics: Array<
        SkillExpansionMetrics & { iteration: number }
      > = [
        { ...baseMetrics, iteration: 1, truePositives: 8, falsePositives: 2 },
        { ...baseMetrics, iteration: 2, truePositives: 15, falsePositives: 5 },
      ];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateAggregateMetrics(
        iterationMetrics,
      );

      // Assert
      expect(result.truePositives).toBe(23); // 8 + 15
      expect(result.falsePositives).toBe(7); // 2 + 5
    });

    it('should return zeros for empty iteration metrics', () => {
      // Arrange
      const iterationMetrics: Array<
        SkillExpansionMetrics & { iteration: number }
      > = [];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateAggregateMetrics(
        iterationMetrics,
      );

      // Assert
      expect(result.passRate).toBe(0);
      expect(result.conceptPreservationRate).toBe(0);
      expect(result.totalSkills).toBe(0);
    });
  });

  describe('private method: calculateStatistics', () => {
    it('should calculate mean, min, max, stdDev', () => {
      // Arrange
      const values = [1, 2, 3, 4, 5];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateStatistics(values);

      // Assert
      expect(result.mean).toBe(3);
      expect(result.min).toBe(1);
      expect(result.max).toBe(5);
      expect(result.stdDev).toBeCloseTo(1.4142, 3);
    });

    it('should return zeros for empty array', () => {
      // Arrange
      const values: number[] = [];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateStatistics(values);

      // Assert
      expect(result.mean).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.stdDev).toBe(0);
    });

    it('should round to 4 decimal places', () => {
      // Arrange
      const values = [0.123456789, 0.987654321];

      // Act
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result = (service as any).calculateStatistics(values);

      // Assert
      expect(result.mean).toBeCloseTo(0.5556, 4);
    });
  });
});
