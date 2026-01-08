import { Test, TestingModule } from '@nestjs/testing';

import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { FileHelper } from 'src/shared/utils/file';

import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
  QuestionClassifyInput,
} from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';
import { QuestionClassificationPromptVersion } from 'src/modules/query-processor/prompts/question-classification';
import { TQuestionClassification } from 'src/modules/query-processor/types/question-classification.type';

import {
  createMockClassMetric,
  createMockOverallMetrics,
  createMockTestRecord,
  createMockTestResult,
  getExpectedEvaluationPath,
  MOCK_SCENARIOS,
  MOCK_TIMESTAMP,
} from '../../shared/services/__tests__/fixture';
import {
  OverallClassificationMetrics,
  QuestionClassificationTestResults,
} from '../../shared/types/test-result.type';
import { QuestionClassificationEvaluatorService } from '../evaluators/question-classification-evaluator.service';
import { QuestionSetItem } from '../test-sets/question-set-v8.constant';

describe('QuestionClassificationEvaluatorService', () => {
  let service: QuestionClassificationEvaluatorService;
  let mockClassifierService: jest.Mocked<IQuestionClassifierService>;

  beforeEach(async () => {
    mockClassifierService = {
      classify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionClassificationEvaluatorService,
        {
          provide: I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
          useValue: mockClassifierService,
        },
      ],
    }).compile();

    service = module.get<QuestionClassificationEvaluatorService>(
      QuestionClassificationEvaluatorService,
    );
  });

  describe('evaluateTestSet', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should classify the configured test set, persist results, and return metrics for a single run', async () => {
      mockClassifierService.classify.mockImplementation(
        ({
          question,
        }: QuestionClassifyInput): Promise<TQuestionClassification> => {
          const llmInfo: LlmInfo = {
            model: 'test-model',
            userPrompt: question,
            systemPrompt: 'test-system-prompt',
            promptVersion: 'v1',
          };
          if (question.includes('Python') || question.includes('AI')) {
            return Promise.resolve({
              category: 'relevant',
              reason: 'Course-related content',
              llmInfo,
              tokenUsage: {
                model: 'test-model',
                inputTokens: 0,
                outputTokens: 0,
              },
            });
          }
          return Promise.resolve({
            category: 'irrelevant',
            reason: 'Irrelevant content',
            llmInfo,
            tokenUsage: {
              model: 'test-model',
              inputTokens: 0,
              outputTokens: 0,
            },
          });
        },
      );

      const saveJsonSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined as void);
      const appendSpy = jest
        .spyOn(FileHelper, 'appendToJsonArray')
        .mockResolvedValue(undefined as void);

      const iterationNumber = 1;
      const prefixDir = 'unit-test-prefix';
      const promptVersion: QuestionClassificationPromptVersion = 'v6';

      const result = await service.evaluateTestSet(
        iterationNumber,
        prefixDir,
        promptVersion,
      );

      expect(mockClassifierService.classify).toHaveBeenCalledTimes(
        (service as unknown as { testSet: QuestionSetItem[] }).testSet.length,
      );
      mockClassifierService.classify.mock.calls.forEach(([input]) => {
        expect(input).toEqual(
          expect.objectContaining({
            question: expect.any(String),
            promptVersion,
          }),
        );
      });

      expect(result.records).toHaveLength(
        (service as unknown as { testSet: QuestionSetItem[] }).testSet.length,
      );
      expect(result.classMetrics).toHaveLength(3);
      expect(result.overallMetrics.totalQuestions).toBe(
        (service as unknown as { testSet: QuestionSetItem[] }).testSet.length,
      );
      expect(result.iterationNumber).toBe(iterationNumber);

      expect(saveJsonSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(
          prefixDir,
          'records',
          `records-iteration-${result.iterationNumber}.json`,
        ),
        result.records,
      );
      expect(saveJsonSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(
          prefixDir,
          'metrics',
          `metrics-iteration-${result.iterationNumber}.json`,
        ),
        expect.objectContaining({
          overallMetrics: result.overallMetrics,
          classMetrics: result.classMetrics,
        }),
      );
      expect(appendSpy).toHaveBeenCalled();
    });
  });

  describe('getCollapsedIterationMetrics', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should collapse requested iteration metrics into acceptable buckets', async () => {
      const metricsDirFiles = [
        'metrics-iteration-1.json',
        'metrics-iteration-2.json',
      ];
      jest.spyOn(FileHelper, 'listFiles').mockResolvedValue(metricsDirFiles);

      jest
        .spyOn(FileHelper, 'loadJson')
        .mockImplementation((filePath: string) => {
          if (filePath.includes('metrics-iteration-1')) {
            return Promise.resolve({
              iterationNumber: 1,
              overallMetrics: {
                totalQuestions: 15,
                totalCorrectClassifications: 10,
                totalIncorrectClassifications: 5,
                overallPrecision: 0.7,
                overallRecall: 0.7,
                macroPrecision: 0.7,
                macroRecall: 0.7,
                timestamp: MOCK_TIMESTAMP,
              },
              classMetrics: [
                createMockClassMetric({
                  classLabel: 'relevant',
                  totalQuestions: 5,
                  correctClassifications: 4,
                  incorrectClassifications: 1,
                  precision: 0.8,
                  recall: 0.8,
                }),
                createMockClassMetric({
                  classLabel: 'irrelevant',
                  totalQuestions: 5,
                  correctClassifications: 3,
                  incorrectClassifications: 2,
                  precision: 0.6,
                  recall: 0.6,
                }),
                createMockClassMetric({
                  classLabel: 'dangerous',
                  totalQuestions: 3,
                  correctClassifications: 2,
                  incorrectClassifications: 1,
                  precision: 0.5,
                  recall: 0.67,
                }),
              ],
            });
          }

          return Promise.resolve({
            iterationNumber: 2,
            overallMetrics: {
              totalQuestions: 12,
              totalCorrectClassifications: 8,
              totalIncorrectClassifications: 4,
              overallPrecision: 0.66,
              overallRecall: 0.66,
              macroPrecision: 0.66,
              macroRecall: 0.66,
              timestamp: MOCK_TIMESTAMP,
            },
            classMetrics: [
              createMockClassMetric({
                classLabel: 'relevant',
                totalQuestions: 4,
                correctClassifications: 2,
                incorrectClassifications: 2,
                precision: 0.5,
                recall: 0.5,
              }),
              createMockClassMetric({
                classLabel: 'irrelevant',
                totalQuestions: 6,
                correctClassifications: 4,
                incorrectClassifications: 2,
                precision: 0.8,
                recall: 0.67,
              }),
              createMockClassMetric({
                classLabel: 'dangerous',
                totalQuestions: 1,
                correctClassifications: 1,
                incorrectClassifications: 0,
                precision: 1,
                recall: 1,
              }),
            ],
          });
        });

      const result = await service.getCollapsedIterationMetrics(
        [1, 2],
        'unit-prefix',
      );

      expect(result).toHaveLength(2);
      const firstIteration = result[0];
      expect(firstIteration.iterationNumber).toBe(1);
      expect(firstIteration.metrics).toHaveLength(2);

      const acceptableMetrics = firstIteration.metrics.find(
        (metric) => metric.classLabel === 'acceptable',
      );
      const notAcceptableMetrics = firstIteration.metrics.find(
        (metric) => metric.classLabel === 'not-acceptable',
      );

      expect(acceptableMetrics).toBeDefined();
      expect(acceptableMetrics).toMatchObject({
        totalQuestions: 5,
        correctClassifications: 4,
        incorrectClassifications: 1,
      });
      expect(acceptableMetrics?.precision).toBeCloseTo(0.8);
      expect(acceptableMetrics?.recall).toBeCloseTo(0.8);

      expect(notAcceptableMetrics).toBeDefined();
      expect(notAcceptableMetrics).toMatchObject({
        totalQuestions: 8,
        correctClassifications: 5,
        incorrectClassifications: 3,
      });
      expect(notAcceptableMetrics?.precision).toBeCloseTo(5 / 9);
      expect(notAcceptableMetrics?.recall).toBeCloseTo(0.625);
    });

    it('should throw if a requested iteration file is missing', async () => {
      jest
        .spyOn(FileHelper, 'listFiles')
        .mockResolvedValue(['metrics-iteration-1.json']);
      jest.spyOn(FileHelper, 'loadJson').mockResolvedValue({
        iterationNumber: 1,
        classMetrics: [],
        overallMetrics: {
          totalQuestions: 0,
          totalCorrectClassifications: 0,
          totalIncorrectClassifications: 0,
          overallPrecision: 0,
          overallRecall: 0,
          macroPrecision: 0,
          macroRecall: 0,
          timestamp: MOCK_TIMESTAMP,
        },
      });

      await expect(
        service.getCollapsedIterationMetrics([1, 2], 'unit-prefix'),
      ).rejects.toThrow('Metrics file not found for iteration 2');
    });
  });

  describe('calculateFinalMacroMetrics', () => {
    it('should calculate final macro metrics correctly', () => {
      const mockResults: OverallClassificationMetrics[] = [
        {
          totalQuestions: 10,
          totalCorrectClassifications: 7,
          totalIncorrectClassifications: 3,
          overallPrecision: 0.7,
          overallRecall: 0.8,
          macroPrecision: 0.7,
          macroRecall: 0.8,
          timestamp: MOCK_TIMESTAMP,
        },
        {
          totalQuestions: 10,
          totalCorrectClassifications: 8,
          totalIncorrectClassifications: 2,
          overallPrecision: 0.8,
          overallRecall: 0.9,
          macroPrecision: 0.8,
          macroRecall: 0.9,
          timestamp: MOCK_TIMESTAMP,
        },
        {
          totalQuestions: 10,
          totalCorrectClassifications: 6,
          totalIncorrectClassifications: 4,
          overallPrecision: 0.6,
          overallRecall: 0.7,
          macroPrecision: 0.6,
          macroRecall: 0.7,
          timestamp: MOCK_TIMESTAMP,
        },
      ];

      const result = service['calculateFinalMacroMetrics'](mockResults);

      expect(result.totalIterations).toBe(3);
      expect(result.macroPrecision).toBe(0.6); // Last iteration
      expect(result.macroRecall).toBe(0.7); // Last iteration
      expect(result.averageMacroPrecision).toBeCloseTo((0.7 + 0.8 + 0.6) / 3);
      expect(result.averageMacroRecall).toBeCloseTo((0.8 + 0.9 + 0.7) / 3);
      expect(result).not.toHaveProperty('bestIteration');
      expect(result).not.toHaveProperty('worstIteration');
    });
  });

  describe('saveAggregatedFinalMetrics', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should aggregate stored iteration metrics and persist final metrics', async () => {
      jest
        .spyOn(FileHelper, 'listFiles')
        .mockResolvedValue([
          'metrics-iteration-1.json',
          'metrics-iteration-2.json',
        ]);
      jest
        .spyOn(FileHelper, 'loadJson')
        .mockImplementation((filePath: string) => {
          if (filePath.includes('metrics-iteration-1')) {
            return Promise.resolve({
              iterationNumber: 1,
              overallMetrics: {
                totalQuestions: 10,
                totalCorrectClassifications: 7,
                totalIncorrectClassifications: 3,
                overallPrecision: 0.7,
                overallRecall: 0.8,
                macroPrecision: 0.7,
                macroRecall: 0.8,
                timestamp: MOCK_TIMESTAMP,
              },
            });
          }
          return Promise.resolve({
            iterationNumber: 2,
            overallMetrics: {
              totalQuestions: 10,
              totalCorrectClassifications: 8,
              totalIncorrectClassifications: 2,
              overallPrecision: 0.8,
              overallRecall: 0.9,
              macroPrecision: 0.8,
              macroRecall: 0.9,
              timestamp: MOCK_TIMESTAMP,
            },
          });
        });

      const saveSpy = jest
        .spyOn(FileHelper, 'saveLatestJson')
        .mockResolvedValue('final-path');

      const prefixDir = 'unit-prefix';
      await service['saveAggregatedFinalMetrics'](prefixDir);

      expect(saveSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(prefixDir, 'final-metrics-2'),
        expect.objectContaining({ totalIterations: 2 }),
      );
    });

    it('should throw if no metrics files are present', async () => {
      jest.spyOn(FileHelper, 'listFiles').mockResolvedValue([]);
      const saveSpy = jest.spyOn(FileHelper, 'saveLatestJson');

      await service['saveAggregatedFinalMetrics']('unit-prefix');

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('groupQuestionsByCategory', () => {
    it('should group questions by expected category correctly', () => {
      const testSet: QuestionSetItem[] = [
        { question: 'q1', expectedCategory: 'relevant' },
        { question: 'q2', expectedCategory: 'irrelevant' },
        { question: 'q3', expectedCategory: 'relevant' },
        { question: 'q4', expectedCategory: 'dangerous' },
        { question: 'q5', expectedCategory: 'irrelevant' },
      ];

      const result = service['groupQuestionsByCategory'](testSet);

      expect(result).toHaveProperty('relevant');
      expect(result).toHaveProperty('irrelevant');
      expect(result).toHaveProperty('dangerous');

      expect(result.relevant).toHaveLength(2);
      expect(result.irrelevant).toHaveLength(2);
      expect(result.dangerous).toHaveLength(1);
    });
  });

  describe('saveIterationRecords', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should persist records for the iteration under the records directory', async () => {
      const iterationRecords = [
        createMockTestRecord({ question: 'iteration-2-q1' }),
        createMockTestRecord({ question: 'iteration-2-q2' }),
      ];

      const result = createMockTestResult({
        iterationNumber: 2,
        records: iterationRecords,
      });

      const saveSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined as void);

      const prefixDir = 'unit-prefix';
      await service['saveIterationRecords'](result, prefixDir);

      expect(saveSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(
          prefixDir,
          'records',
          'records-iteration-2.json',
        ),
        iterationRecords,
      );
    });
  });

  describe('saveIterationMetrics', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should persist metrics bundle for the iteration under metrics directory', async () => {
      const metricsResultOne = createMockTestResult({
        iterationNumber: 1,
        classMetrics: [
          createMockClassMetric({
            classLabel: 'relevant',
            totalQuestions: 5,
            correctClassifications: 4,
            incorrectClassifications: 1,
            precision: 0.8,
            recall: 0.8,
            macroPrecision: 0.8,
            macroRecall: 0.8,
          }),
        ],
        overallMetrics: createMockOverallMetrics({
          totalQuestions: 5,
          totalCorrectClassifications: 4,
          totalIncorrectClassifications: 1,
          overallPrecision: 0.8,
          overallRecall: 0.8,
          macroPrecision: 0.8,
          macroRecall: 0.8,
        }),
        macroMetricsPerIteration: [
          {
            iteration: 1,
            macroPrecision: 0.8,
            macroRecall: 0.8,
            timestamp: MOCK_SCENARIOS.singleIteration.overallMetrics.timestamp,
            classBreakdown: [
              { className: 'relevant', precision: 0.8, recall: 0.8 },
            ],
          },
        ],
      });

      const saveSpy = jest
        .spyOn(FileHelper, 'saveJson')
        .mockResolvedValue(undefined as void);

      const prefixDir = 'unit-prefix';
      await service['saveIterationMetrics'](metricsResultOne, prefixDir);

      expect(saveSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(
          prefixDir,
          'metrics',
          'metrics-iteration-1.json',
        ),
        {
          iterationNumber: 1,
          overallMetrics: metricsResultOne.overallMetrics,
          classMetrics: metricsResultOne.classMetrics,
          macroMetrics: metricsResultOne.macroMetricsPerIteration,
        },
      );
    });
  });

  describe('saveIncorrectClassifications', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should aggregate incorrect records across iterations and save once', async () => {
      const incorrectRecordOne = createMockTestRecord({
        question: 'incorrect-1',
        actualClassification: 'irrelevant',
        isCorrect: false,
      });
      const incorrectRecordTwo = createMockTestRecord({
        question: 'incorrect-2',
        actualClassification: 'dangerous',
        isCorrect: false,
      });

      const result: QuestionClassificationTestResults = createMockTestResult({
        iterationNumber: 1,
        records: [
          createMockTestRecord({ question: 'correct-1' }),
          incorrectRecordOne,
          incorrectRecordTwo,
        ],
      });

      const saveSpy = jest
        .spyOn(FileHelper, 'appendToJsonArray')
        .mockResolvedValue(undefined as void);

      const prefixDir = 'unit-prefix';
      await service['saveIncorrectClassifications'](result, prefixDir);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        getExpectedEvaluationPath(prefixDir, 'incorrect-classifications.json'),
        expect.objectContaining({
          iterationNumber: 1,
          totalIncorrectClassifications: 2,
        }),
      );
    });

    it('should not save when there are no incorrect records', async () => {
      const result: QuestionClassificationTestResults = createMockTestResult({
        iterationNumber: 1,
        records: [createMockTestRecord({ question: 'correct-only' })],
      });

      const saveSpy = jest
        .spyOn(FileHelper, 'appendToJsonArray')
        .mockResolvedValue(undefined as void);

      await service['saveIncorrectClassifications'](result, 'unit-prefix');

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});
