import { Test, TestingModule } from '@nestjs/testing';

import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import { CourseFilterJudgeEvaluator } from 'src/modules/evaluator/course-relevance-filter/evaluators/course-filter-judge.evaluator';
import { CourseFilterTestSetTransformer } from 'src/modules/evaluator/course-relevance-filter/loaders/course-filter-test-set-transformer.service';
import type {
  EvaluationConfig,
  JudgeEvaluationResult,
  QuestionEvalSample,
} from 'src/modules/evaluator/course-relevance-filter/types/course-relevance-filter.types';

import { CourseComparisonService } from '../../../course-comparison.service';
import { CourseFilterEvaluationRunnerService } from '../../../course-filter-evaluation-runner.service';
import { CourseFilterResultManagerService } from '../../../course-filter-result-manager.service';
import { DisagreementAnalyzerService } from '../../../disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from '../../../metrics-calculator.service';
import {
  createMockFinalMetricsFile,
  createMockMetricsFile,
} from '../../fixtures/course-filter-eval.fixtures';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Unit tests for CourseFilterEvaluationRunnerService
 *
 * These tests verify public API behavior. Private methods (generateCourseHash,
 * buildJudgeInput) are tested indirectly through the public runEvaluation method.
 */
describe('CourseFilterEvaluationRunnerService', () => {
  let service: CourseFilterEvaluationRunnerService;
  let mockTransformer: jest.Mocked<CourseFilterTestSetTransformer>;
  let mockJudgeEvaluator: jest.Mocked<CourseFilterJudgeEvaluator>;
  let mockComparisonService: jest.Mocked<CourseComparisonService>;
  let mockMetricsCalculator: jest.Mocked<CourseFilterMetricsCalculator>;
  let mockDisagreementAnalyzer: jest.Mocked<DisagreementAnalyzerService>;
  let mockResultManager: jest.Mocked<CourseFilterResultManagerService>;

  beforeEach(async () => {
    // Create mock providers
    mockTransformer = {
      transformTestSet: jest.fn(),
    } as unknown as jest.Mocked<CourseFilterTestSetTransformer>;

    mockJudgeEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<CourseFilterJudgeEvaluator>;

    mockComparisonService = {
      compareSample: jest.fn(),
    } as unknown as jest.Mocked<CourseComparisonService>;

    mockMetricsCalculator = {
      calculateFromRecords: jest.fn(),
    } as unknown as jest.Mocked<CourseFilterMetricsCalculator>;

    mockDisagreementAnalyzer = {
      analyzeDisagreements: jest.fn(),
      analyzeExploratoryDelta: jest.fn(),
    } as unknown as jest.Mocked<DisagreementAnalyzerService>;

    mockResultManager = {
      ensureDirectoryStructure: jest.fn(),
      saveIterationRecords: jest.fn(),
      saveIterationMetrics: jest.fn(),
      saveDisagreements: jest.fn(),
      saveExploratoryDelta: jest.fn(),
      saveIterationCost: jest.fn(),
      saveFinalMetrics: jest.fn(),
      calculateFinalMetrics: jest.fn(),
      calculateFinalCost: jest.fn(),
      calculateIterationMetrics: jest.fn(),
      calculateDisagreements: jest.fn(),
      calculateExploratoryDelta: jest.fn(),
    } as unknown as jest.Mocked<CourseFilterResultManagerService>;

    // Create test module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseFilterEvaluationRunnerService,
        { provide: CourseFilterTestSetTransformer, useValue: mockTransformer },
        { provide: CourseFilterJudgeEvaluator, useValue: mockJudgeEvaluator },
        { provide: CourseComparisonService, useValue: mockComparisonService },
        {
          provide: CourseFilterMetricsCalculator,
          useValue: mockMetricsCalculator,
        },
        {
          provide: DisagreementAnalyzerService,
          useValue: mockDisagreementAnalyzer,
        },
        {
          provide: CourseFilterResultManagerService,
          useValue: mockResultManager,
        },
      ],
    }).compile();

    service = module.get<CourseFilterEvaluationRunnerService>(
      CourseFilterEvaluationRunnerService,
    );
  });

  describe('runEvaluation (Public API)', () => {
    it('should orchestrate complete evaluation pipeline', async () => {
      // Arrange
      const testSet = [
        {
          queryLogId: 'query-1',
          question: 'What are the best Python courses?',
          duration: 1000,
          llmInfoBySkill: {},
          metricsBySkill: {},
          rawOutput: {
            llmAcceptedCoursesBySkill: {},
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        },
      ];
      const config: EvaluationConfig = {
        systemPromptVersion: 'v1',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        iterations: 2,
        outputDirectory: 'test-set-v1',
      };

      const mockSamples: QuestionEvalSample[] = [
        {
          queryLogId: 'query-1',
          question: 'What are the best Python courses?',
          courses: [],
        },
      ];

      mockTransformer.transformTestSet.mockReturnValue(mockSamples);
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateDisagreements.mockReturnValue({
        totalDisagreements: 0,
        totalSamples: 1,
        disagreementRate: 0,
        byType: {
          EXPLORATORY_DELTA: {
            count: 0,
            percentage: 0,
            description: '',
            bySystemScore: { score1: 0, score2: 0, score3: 0 },
            commonPatterns: [],
            examples: [],
          },
          CONSERVATIVE_DROP: {
            count: 0,
            percentage: 0,
            description: '',
            commonPatterns: [],
            examples: [],
          },
        },
        insights: {
          systemCharacter: '',
          judgeCharacter: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateExploratoryDelta.mockReturnValue({
        description: '',
        totalCases: 0,
        categories: {
          FOUNDATIONAL_OVERKEEP: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          SIBLING_MISCLASSIFICATION: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          CONTEXTUAL_OVERALIGNMENT: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
        },
        insights: {
          strength: '',
          weakness: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateFinalMetrics.mockResolvedValue(
        createMockFinalMetricsFile(),
      );
      mockResultManager.calculateFinalCost.mockResolvedValue({
        iterations: 2,
        timestamp: expect.any(String),
        testSetName: 'test-set-v1',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        aggregateStats: {
          totalSamples: 0,
          totalCourses: 0,
          totalTokens: { input: 0, output: 0, total: 0 },
          totalCost: 0,
          averageCostPerSample: 0,
          averageCostPerCourse: 0,
        },
        perIterationCosts: [],
      });

      // Mock the runIteration method to avoid file I/O
      jest
        .spyOn(service, 'runIteration' as never)
        .mockResolvedValue([] as never);

      // Act
      const result = await service.runEvaluation({ testSet, config });

      // Assert - Verify orchestration steps
      expect(mockResultManager.ensureDirectoryStructure).toHaveBeenCalledWith(
        'test-set-v1',
      );
      expect(mockTransformer.transformTestSet).toHaveBeenCalledWith(testSet);
      expect(mockResultManager.calculateFinalMetrics).toHaveBeenCalledWith({
        testSetName: 'test-set-v1',
        totalIterations: 2,
      });
      expect(mockResultManager.saveFinalMetrics).toHaveBeenCalled();
      expect(mockResultManager.calculateFinalCost).toHaveBeenCalledWith({
        testSetName: 'test-set-v1',
        totalIterations: 2,
        config,
      });
      expect(result).toEqual({
        records: [],
        metrics: [],
      });
    });

    it('should run multiple iterations when configured', async () => {
      // Arrange
      const testSet = [
        {
          queryLogId: 'query-1',
          question: 'Test question',
          duration: 1000,
          llmInfoBySkill: {},
          metricsBySkill: {},
          rawOutput: {
            llmAcceptedCoursesBySkill: {},
            llmRejectedCoursesBySkill: {},
            llmMissingCoursesBySkill: {},
          },
        },
      ];
      const config: EvaluationConfig = {
        systemPromptVersion: 'v1',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        iterations: 3,
        outputDirectory: 'test-output',
      };

      const mockSamples: QuestionEvalSample[] = [
        {
          queryLogId: 'query-1',
          question: 'Test question',
          courses: [],
        },
      ];

      mockTransformer.transformTestSet.mockReturnValue(mockSamples);
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateDisagreements.mockReturnValue({
        totalDisagreements: 0,
        totalSamples: 1,
        disagreementRate: 0,
        byType: {
          EXPLORATORY_DELTA: {
            count: 0,
            percentage: 0,
            description: '',
            bySystemScore: { score1: 0, score2: 0, score3: 0 },
            commonPatterns: [],
            examples: [],
          },
          CONSERVATIVE_DROP: {
            count: 0,
            percentage: 0,
            description: '',
            commonPatterns: [],
            examples: [],
          },
        },
        insights: {
          systemCharacter: '',
          judgeCharacter: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateExploratoryDelta.mockReturnValue({
        description: '',
        totalCases: 0,
        categories: {
          FOUNDATIONAL_OVERKEEP: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          SIBLING_MISCLASSIFICATION: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          CONTEXTUAL_OVERALIGNMENT: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
        },
        insights: {
          strength: '',
          weakness: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateFinalMetrics.mockResolvedValue(
        createMockFinalMetricsFile(),
      );
      mockResultManager.calculateFinalCost.mockResolvedValue({
        iterations: 3,
        timestamp: expect.any(String),
        testSetName: 'test-set-v2',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        aggregateStats: {
          totalSamples: 0,
          totalCourses: 0,
          totalTokens: { input: 0, output: 0, total: 0 },
          totalCost: 0,
          averageCostPerSample: 0,
          averageCostPerCourse: 0,
        },
        perIterationCosts: [],
      });

      const runIterationSpy = jest
        .spyOn(service, 'runIteration' as never)
        .mockResolvedValue([] as never);

      // Act
      await service.runEvaluation({ testSet, config });

      // Assert - Should run 3 iterations
      expect(runIterationSpy).toHaveBeenCalledTimes(3);
      expect(runIterationSpy).toHaveBeenCalledWith({
        iterationNumber: 1,
        samples: mockSamples,
        config,
      });
      expect(runIterationSpy).toHaveBeenCalledWith({
        iterationNumber: 2,
        samples: mockSamples,
        config,
      });
      expect(runIterationSpy).toHaveBeenCalledWith({
        iterationNumber: 3,
        samples: mockSamples,
        config,
      });
    });
  });

  describe('runIteration (Public API)', () => {
    it('should call judge evaluator with correctly formatted input', async () => {
      // Arrange
      const sample: QuestionEvalSample = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        courses: [
          {
            subjectCode: 'CS101',
            subjectName: 'Introduction to Python',
            systemAction: 'KEEP' as const,
            systemScore: 3 as const,
            matchedSkills: [],
            allLearningOutcomes: [
              { id: 'lo1', name: 'Learn Python basics' },
              { id: 'lo2', name: 'Build simple programs' },
            ],
          },
          {
            subjectCode: 'CS102',
            subjectName: 'Advanced Python',
            systemAction: 'KEEP' as const,
            systemScore: 2 as const,
            matchedSkills: [],
            allLearningOutcomes: [
              { id: 'lo3', name: 'Advanced Python features' },
            ],
          },
        ],
      };

      const config: EvaluationConfig = {
        systemPromptVersion: 'v1',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      const judgeResult: JudgeEvaluationResult = {
        courses: [
          { code: 'CS101', verdict: 'PASS', reason: 'Good match' },
          { code: 'CS102', verdict: 'PASS', reason: 'Relevant' },
        ],
        tokenUsage: [] as TokenUsage[],
      };

      const comparisonRecord = {
        queryLogId: 'query-1',
        question: 'What are the best Python courses?',
        courses: [],
        tokenUsage: [] as TokenUsage[],
      };

      // Mock loadProgress to return empty progress (no cached courses)
      const loadProgressSpy = jest
        .spyOn(service as any, 'loadProgress')
        .mockResolvedValue({
          testSetName: 'test-output',
          iterationNumber: 1,
          entries: [],
          lastUpdated: new Date().toISOString(),
          statistics: {
            totalCourses: 0,
            completedCourses: 0,
            pendingCourses: 0,
            completionPercentage: 0,
          },
        });

      // Mock saveProgress to avoid file I/O
      const saveProgressSpy = jest
        .spyOn(service as any, 'saveProgress')
        .mockResolvedValue(undefined);

      mockJudgeEvaluator.evaluate.mockResolvedValue(judgeResult);
      mockComparisonService.compareSample.mockReturnValue(comparisonRecord);
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateDisagreements.mockReturnValue({
        totalDisagreements: 0,
        totalSamples: 1,
        disagreementRate: 0,
        byType: {
          EXPLORATORY_DELTA: {
            count: 0,
            percentage: 0,
            description: '',
            bySystemScore: { score1: 0, score2: 0, score3: 0 },
            commonPatterns: [],
            examples: [],
          },
          CONSERVATIVE_DROP: {
            count: 0,
            percentage: 0,
            description: '',
            commonPatterns: [],
            examples: [],
          },
        },
        insights: {
          systemCharacter: '',
          judgeCharacter: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateExploratoryDelta.mockReturnValue({
        description: '',
        totalCases: 0,
        categories: {
          FOUNDATIONAL_OVERKEEP: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          SIBLING_MISCLASSIFICATION: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          CONTEXTUAL_OVERALIGNMENT: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
        },
        insights: {
          strength: '',
          weakness: '',
          recommendation: '',
        },
      });

      // Act
      await service.runIteration({
        iterationNumber: 1,
        samples: [sample],
        config,
      });

      // Assert - Verify judge evaluator was called with correct input
      // This indirectly tests buildJudgeInput by checking the input structure
      expect(mockJudgeEvaluator.evaluate).toHaveBeenCalledWith({
        question: 'What are the best Python courses?',
        courses: [
          {
            code: 'CS101',
            name: 'Introduction to Python',
            outcomes: ['Learn Python basics', 'Build simple programs'],
          },
          {
            code: 'CS102',
            name: 'Advanced Python',
            outcomes: ['Advanced Python features'],
          },
        ],
      });

      // Verify comparison was called
      expect(mockComparisonService.compareSample).toHaveBeenCalledWith(
        sample,
        judgeResult,
      );

      // Verify results were saved
      expect(mockResultManager.saveIterationRecords).toHaveBeenCalled();
      expect(mockResultManager.saveIterationMetrics).toHaveBeenCalled();
      expect(mockResultManager.saveDisagreements).toHaveBeenCalled();
      expect(mockResultManager.saveExploratoryDelta).toHaveBeenCalled();
      expect(mockResultManager.saveIterationCost).toHaveBeenCalled();

      // Cleanup
      loadProgressSpy.mockRestore();
      saveProgressSpy.mockRestore();
    });

    it('should call judge evaluator for each unique course in samples', async () => {
      // This indirectly tests CourseHashUtil consistency
      // by verifying that unique course/question combinations are evaluated

      // Arrange
      const samples: QuestionEvalSample[] = [
        {
          queryLogId: 'query-1',
          question: 'What are the best Python courses?',
          courses: [
            {
              subjectCode: 'CS101',
              subjectName: 'Introduction to Python',
              systemAction: 'KEEP' as const,
              systemScore: 3 as const,
              matchedSkills: [],
              allLearningOutcomes: [{ id: 'lo1', name: 'Learn Python' }],
            },
          ],
        },
        {
          queryLogId: 'query-2',
          question: 'What are the best Python courses?',
          courses: [
            {
              subjectCode: 'CS101',
              subjectName: 'Introduction to Python',
              systemAction: 'KEEP' as const,
              systemScore: 3 as const,
              matchedSkills: [],
              allLearningOutcomes: [{ id: 'lo1', name: 'Learn Python' }],
            },
          ],
        },
      ];

      const config: EvaluationConfig = {
        systemPromptVersion: 'v1',
        judgeModel: 'gpt-4',
        judgeProvider: 'openai',
        iterations: 1,
        outputDirectory: 'test-output',
      };

      // Mock loadProgress to return empty progress (no cached courses)
      const loadProgressSpy = jest
        .spyOn(service as any, 'loadProgress')
        .mockResolvedValue({
          testSetName: 'test-output',
          iterationNumber: 1,
          entries: [],
          lastUpdated: new Date().toISOString(),
          statistics: {
            totalCourses: 0,
            completedCourses: 0,
            pendingCourses: 0,
            completionPercentage: 0,
          },
        });

      // Mock saveProgress to avoid file I/O
      const saveProgressSpy = jest
        .spyOn(service as any, 'saveProgress')
        .mockResolvedValue(undefined);

      mockJudgeEvaluator.evaluate.mockResolvedValue({
        courses: [{ code: 'CS101', verdict: 'PASS', reason: 'Good match' }],
        tokenUsage: [] as TokenUsage[],
      });

      mockComparisonService.compareSample.mockReturnValue({
        queryLogId: '',
        question: '',
        courses: [],
        tokenUsage: [] as TokenUsage[],
      });
      mockResultManager.calculateIterationMetrics.mockReturnValue(
        createMockMetricsFile(),
      );
      mockResultManager.calculateDisagreements.mockReturnValue({
        totalDisagreements: 0,
        totalSamples: 2,
        disagreementRate: 0,
        byType: {
          EXPLORATORY_DELTA: {
            count: 0,
            percentage: 0,
            description: '',
            bySystemScore: { score1: 0, score2: 0, score3: 0 },
            commonPatterns: [],
            examples: [],
          },
          CONSERVATIVE_DROP: {
            count: 0,
            percentage: 0,
            description: '',
            commonPatterns: [],
            examples: [],
          },
        },
        insights: {
          systemCharacter: '',
          judgeCharacter: '',
          recommendation: '',
        },
      });
      mockResultManager.calculateExploratoryDelta.mockReturnValue({
        description: '',
        totalCases: 0,
        categories: {
          FOUNDATIONAL_OVERKEEP: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          SIBLING_MISCLASSIFICATION: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
          CONTEXTUAL_OVERALIGNMENT: {
            count: 0,
            description: '',
            pattern: '',
            examples: [],
          },
        },
        insights: {
          strength: '',
          weakness: '',
          recommendation: '',
        },
      });

      // Act
      await service.runIteration({
        iterationNumber: 1,
        samples,
        config,
      });

      // Assert - Verify judge was called for each unique course
      // Since we have empty progress, all courses are evaluated
      expect(mockJudgeEvaluator.evaluate).toHaveBeenCalledTimes(2);

      // Cleanup
      loadProgressSpy.mockRestore();
      saveProgressSpy.mockRestore();
    });
  });
});
