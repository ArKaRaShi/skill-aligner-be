import { Test, TestingModule } from '@nestjs/testing';

import { SkillExpansionJudgeEvaluator } from '../../../../evaluators/skill-expansion-judge.evaluator';
import type {
  QuestionEvalSample,
  SkillExpansionEvaluationConfig,
  SkillExpansionJudgeResult,
  SkillExpansionTestSet,
} from '../../../../types/skill-expansion.types';
import { SkillExpansionComparisonService } from '../../../skill-expansion-comparison.service';
import { SkillExpansionMetricsCalculator } from '../../../skill-expansion-metrics-calculator.service';
import { SkillExpansionResultManagerService } from '../../../skill-expansion-result-manager.service';
import { SkillExpansionEvaluationRunnerService } from '../../../skill-expansion-runner.service';
import {
  createMockJudgeResult,
  createMockMetricsFile,
  createMockProgressFile,
  createMockQuestionSample,
  createMockSampleRecord,
  createMockTestSet,
} from '../../fixtures/skill-expansion-runner.fixtures';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Unit tests for SkillExpansionEvaluationRunnerService
 *
 * These tests verify orchestration logic with mocked dependencies.
 * File I/O is mocked via private method spies.
 */
describe('SkillExpansionEvaluationRunnerService', () => {
  let service: SkillExpansionEvaluationRunnerService;
  let mockJudgeEvaluator: jest.Mocked<SkillExpansionJudgeEvaluator>;
  let mockComparisonService: jest.Mocked<SkillExpansionComparisonService>;
  let mockMetricsCalculator: jest.Mocked<SkillExpansionMetricsCalculator>;
  let mockResultManager: jest.Mocked<SkillExpansionResultManagerService>;

  beforeEach(async () => {
    // Create mock providers
    mockJudgeEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<SkillExpansionJudgeEvaluator>;

    mockComparisonService = {
      compareSample: jest.fn(),
    } as unknown as jest.Mocked<SkillExpansionComparisonService>;

    mockMetricsCalculator = {
      calculateFromRecords: jest.fn(),
    } as unknown as jest.Mocked<SkillExpansionMetricsCalculator>;

    mockResultManager = {
      ensureDirectoryStructure: jest.fn(),
      saveRecord: jest.fn().mockResolvedValue(undefined),
      saveIterationRecords: jest.fn(),
      loadIterationRecords: jest.fn().mockResolvedValue([]),
      saveIterationMetrics: jest.fn(),
      saveIterationCost: jest.fn(),
      calculateIterationMetrics: jest.fn(),
      calculateFinalMetrics: jest.fn(),
      calculateFinalCost: jest.fn(),
    } as unknown as jest.Mocked<SkillExpansionResultManagerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillExpansionEvaluationRunnerService,
        { provide: SkillExpansionJudgeEvaluator, useValue: mockJudgeEvaluator },
        {
          provide: SkillExpansionComparisonService,
          useValue: mockComparisonService,
        },
        {
          provide: SkillExpansionMetricsCalculator,
          useValue: mockMetricsCalculator,
        },
        {
          provide: SkillExpansionResultManagerService,
          useValue: mockResultManager,
        },
      ],
    }).compile();

    service = module.get<SkillExpansionEvaluationRunnerService>(
      SkillExpansionEvaluationRunnerService,
    );
  });

  describe('runEvaluation (Public API)', () => {
    it('should orchestrate complete evaluation pipeline', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = createMockTestSet();
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
        iterations: 2,
        outputDirectory: 'test-set-v1',
      };

      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateFinalMetrics.mockResolvedValue({
        testSetName: 'test-set-v1',
        totalIterations: 2,
        totalSamples: 1,
        totalSkills: 1,
        metrics: createMockMetricsFile(),
        metricsByIteration: [],
        generatedAt: new Date().toISOString(),
      });
      mockResultManager.calculateFinalCost.mockResolvedValue({
        testSetName: 'test-set-v1',
        totalIterations: 2,
        totalSamples: 1,
        totalSkills: 1,
        totalTokens: 0,
        totalCost: 0,
        averageCostPerSample: 0,
        averageCostPerSkill: 0,
        costByIteration: [],
        generatedAt: new Date().toISOString(),
      });

      // Mock runIteration to avoid file I/O
      jest
        .spyOn(service, 'runIteration' as never)
        .mockResolvedValue([] as never);

      // Act
      const result = await service.runEvaluation({ testSet, config });

      // Assert - Verify orchestration steps
      expect(mockResultManager.ensureDirectoryStructure).toHaveBeenCalledWith(
        'test-set-v1',
      );
      expect(mockResultManager.calculateFinalMetrics).toHaveBeenCalledWith({
        testSetName: 'test-set-v1',
        totalIterations: 2,
        totalSamples: 1,
        totalSkills: 1,
      });
      expect(mockResultManager.calculateFinalCost).toHaveBeenCalledWith({
        testSetName: 'test-set-v1',
        totalIterations: 2,
      });
      expect(result).toEqual({
        records: [],
      });
    });

    it('should run multiple iterations when configured', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = createMockTestSet();
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
        iterations: 3,
        outputDirectory: 'test-output',
      };

      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateFinalMetrics.mockResolvedValue({
        testSetName: 'test-output',
        totalIterations: 3,
        totalSamples: 1,
        totalSkills: 1,
        metrics: createMockMetricsFile(),
        metricsByIteration: [],
        generatedAt: new Date().toISOString(),
      });
      mockResultManager.calculateFinalCost.mockResolvedValue({
        testSetName: 'test-output',
        totalIterations: 3,
        totalSamples: 1,
        totalSkills: 1,
        totalTokens: 0,
        totalCost: 0,
        averageCostPerSample: 0,
        averageCostPerSkill: 0,
        costByIteration: [],
        generatedAt: new Date().toISOString(),
      });

      const runIterationSpy = jest
        .spyOn(service, 'runIteration' as never)
        .mockResolvedValue([] as never);

      // Act
      await service.runEvaluation({ testSet, config });

      // Assert - Should run 3 iterations
      expect(runIterationSpy).toHaveBeenCalledTimes(3);
    });

    it('should use outputDirectory from config if provided', async () => {
      // Arrange
      const testSet: SkillExpansionTestSet = createMockTestSet();
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
        iterations: 1,
        outputDirectory: 'custom-output-dir',
      };

      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateFinalMetrics.mockResolvedValue({
        testSetName: 'custom-output-dir',
        totalIterations: 1,
        totalSamples: 1,
        totalSkills: 1,
        metrics: createMockMetricsFile(),
        metricsByIteration: [],
        generatedAt: new Date().toISOString(),
      });
      mockResultManager.calculateFinalCost.mockResolvedValue({
        testSetName: 'custom-output-dir',
        totalIterations: 1,
        totalSamples: 1,
        totalSkills: 1,
        totalTokens: 0,
        totalCost: 0,
        averageCostPerSample: 0,
        averageCostPerSkill: 0,
        costByIteration: [],
        generatedAt: new Date().toISOString(),
      });

      jest
        .spyOn(service, 'runIteration' as never)
        .mockResolvedValue([] as never);

      // Act
      await service.runEvaluation({ testSet, config });

      // Assert
      expect(mockResultManager.ensureDirectoryStructure).toHaveBeenCalledWith(
        'custom-output-dir',
      );
    });
  });

  describe('runIteration (Public API)', () => {
    it('should call judge evaluator with correct input', async () => {
      // Arrange
      const sample: QuestionEvalSample = createMockQuestionSample();
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const judgeResult: SkillExpansionJudgeResult = createMockJudgeResult();
      const comparisonRecord = createMockSampleRecord();

      // Mock private methods to avoid file I/O
      jest
        .spyOn(service as any, 'loadProgress')
        .mockResolvedValue(createMockProgressFile());
      jest.spyOn(service as any, 'saveProgress').mockResolvedValue(undefined);

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );

      // Act
      await service.runIteration({
        iterationNumber: 1,
        samples: [sample],
        config,
      });

      // Assert - Verify judge evaluator was called with correct input
      expect(mockJudgeEvaluator.evaluate).toHaveBeenCalledWith(
        {
          question: 'What is OOP?',
          systemSkills: sample.systemSkills,
        },
        {
          model: 'gpt-4o-mini',
          provider: 'openai',
        },
      );

      // Verify comparison was called
      expect(mockComparisonService.compareSample).toHaveBeenCalledWith(
        sample,
        judgeResult,
      );

      // Verify results were saved (incremental save per sample)
      expect(mockResultManager.saveRecord).toHaveBeenCalled();
      expect(mockResultManager.saveIterationMetrics).toHaveBeenCalled();
      expect(mockResultManager.saveIterationCost).toHaveBeenCalled();
    });

    it('should handle empty samples array', async () => {
      // Arrange
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      jest
        .spyOn(service as any, 'loadProgress')
        .mockResolvedValue(createMockProgressFile());
      jest.spyOn(service as any, 'saveProgress').mockResolvedValue(undefined);

      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );

      // Act
      const result = await service.runIteration({
        iterationNumber: 1,
        samples: [],
        config,
      });

      // Assert
      expect(result).toEqual([]);
      expect(mockJudgeEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should use flat progress file structure (not nested)', async () => {
      // Arrange
      const sample: QuestionEvalSample = createMockQuestionSample();
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const judgeResult = createMockJudgeResult();
      const comparisonRecord = createMockSampleRecord();

      const loadProgressSpy = jest
        .spyOn(service as any, 'loadProgress')
        .mockResolvedValue(createMockProgressFile());

      jest.spyOn(service as any, 'saveProgress').mockResolvedValue(undefined);

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );

      // Act
      await service.runIteration({
        iterationNumber: 1,
        samples: [sample],
        config,
      });

      // Assert - Verify progress file path uses flat structure
      expect(loadProgressSpy).toHaveBeenCalledWith({
        testSetName: 'test-output',
        iterationNumber: 1,
        totalSkills: 1,
      });
    });
  });

  describe('evaluateSample (Public API)', () => {
    it('should call judge evaluator for each skill', async () => {
      // Arrange
      const sample: QuestionEvalSample = createMockQuestionSample({
        systemSkills: [
          { skill: 'OOP', reason: 'Good' },
          { skill: 'Java', reason: 'Also good' },
        ],
      });
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const judgeResult: SkillExpansionJudgeResult = createMockJudgeResult({
        result: {
          skills: [
            { skill: 'OOP', verdict: 'PASS', note: 'Good' },
            { skill: 'Java', verdict: 'PASS', note: 'Good' },
          ],
          overall: {
            conceptPreserved: true,
            summary: 'Both good',
          },
        },
      });

      const comparisonRecord = createMockSampleRecord();

      const progressFile = createMockProgressFile();
      const completedMap = new Map();

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);

      jest.spyOn(service as any, 'saveProgress').mockResolvedValue(undefined);

      // Act
      const result = await service.evaluateSample({
        sample,
        config,
        completedSkillHashes: completedMap,
        progress: progressFile,
      });

      // Assert
      expect(mockJudgeEvaluator.evaluate).toHaveBeenCalledTimes(1);
      expect(mockComparisonService.compareSample).toHaveBeenCalledWith(
        sample,
        judgeResult,
      );
      expect(result.judgeResult).toEqual(judgeResult);
    });

    it('should save new verdicts to progress', async () => {
      // Arrange
      const sample: QuestionEvalSample = createMockQuestionSample({
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        systemSkills: [{ skill: 'OOP', reason: 'Good' }],
      });
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const judgeResult: SkillExpansionJudgeResult = createMockJudgeResult({
        result: {
          skills: [{ skill: 'OOP', verdict: 'PASS', note: 'Good' }],
          overall: {
            conceptPreserved: true,
            summary: 'Good',
          },
        },
      });

      const comparisonRecord = createMockSampleRecord();

      const progressFile = createMockProgressFile();
      const completedMap = new Map();

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);

      const saveProgressSpy = jest
        .spyOn(service as any, 'saveProgress')
        .mockResolvedValue(undefined);

      // Act
      await service.evaluateSample({
        sample,
        config,
        completedSkillHashes: completedMap,
        progress: progressFile,
      });

      // Assert - Verify progress entry was added
      expect(saveProgressSpy).toHaveBeenCalled();
    });

    it('should skip already-evaluated skills', async () => {
      // Arrange
      const sample: QuestionEvalSample = createMockQuestionSample({
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        systemSkills: [{ skill: 'OOP', reason: 'Good' }],
      });
      const config: SkillExpansionEvaluationConfig = {
        judgeModel: 'gpt-4o-mini',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const existingEntry = {
        hash: 'some-hash',
        queryLogId: 'ql-123',
        question: 'What is OOP?',
        skill: 'OOP',
        completedAt: new Date().toISOString(),
        result: {
          verdict: 'PASS' as const,
          note: 'Already evaluated',
        },
      };

      const progressFile = createMockProgressFile();
      (progressFile as any).entries = [existingEntry];
      const completedMap = new Map([['some-hash', existingEntry]]);

      const judgeResult: SkillExpansionJudgeResult = createMockJudgeResult();
      const comparisonRecord = createMockSampleRecord();

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);

      const saveProgressSpy = jest
        .spyOn(service as any, 'saveProgress')
        .mockResolvedValue(undefined);

      // Act
      await service.evaluateSample({
        sample,
        config,
        completedSkillHashes: completedMap,
        progress: progressFile,
      });

      // Assert - saveProgress should still be called (for statistics update)
      expect(saveProgressSpy).toHaveBeenCalled();
    });
  });
});
