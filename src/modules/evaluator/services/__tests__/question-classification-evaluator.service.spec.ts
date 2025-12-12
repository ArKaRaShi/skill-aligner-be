import { Test, TestingModule } from '@nestjs/testing';

import * as path from 'node:path';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';
import { QuestionClassification } from 'src/modules/query-processor/types/question-classification.type';

import { QuestionSetItem } from '../../test-set/question-set.constant';
import {
  ClassClassificationMetrics,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
  QuestionClassificationTestResults,
} from '../../types/test-result.type';
import { QuestionClassificationEvaluatorService } from '../question-classification-evaluator.service';

const MOCK_TIMESTAMP = '2023-01-01T00:00:00.000Z';

const createTestRecord = (
  overrides: Partial<QuestionClassificationTestRecord> = {},
): QuestionClassificationTestRecord => ({
  question: 'test question',
  expectedClassification: 'relevant',
  actualClassification: 'relevant',
  reasoning: 'test reasoning',
  isCorrect: true,
  metadata: {
    model: 'test-model',
    hashedSystemPrompt: 'hashed-system-prompt',
    userPrompt: 'user prompt',
    promptVersion: 'v1',
    timestamp: MOCK_TIMESTAMP,
  },
  ...overrides,
});

const createTestResult = (
  overrides: Partial<QuestionClassificationTestResults> = {},
): QuestionClassificationTestResults => ({
  records: [],
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
  macroMetricsPerIteration: [],
  iterationNumber: 1,
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

const createClassMetric = (
  overrides: Partial<ClassClassificationMetrics> = {},
): ClassClassificationMetrics => ({
  classLabel: 'relevant',
  totalQuestions: 0,
  correctClassifications: 0,
  incorrectClassifications: 0,
  precision: 0,
  recall: 0,
  macroPrecision: 0,
  macroRecall: 0,
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

const getExpectedEvaluationPath = (
  prefixDir: string,
  ...segments: string[]
): string => {
  const parts = ['data/evaluation/question-classification'];
  if (prefixDir) {
    parts.push(prefixDir);
  }
  if (segments.length > 0) {
    parts.push(...segments);
  }
  return path.join(...parts);
};

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
        (question: string): Promise<QuestionClassification> => {
          if (question.includes('Python') || question.includes('AI')) {
            return Promise.resolve({
              classification: 'relevant',
              reason: 'Course-related content',
              model: 'test-model',
              userPrompt: question,
              systemPrompt: 'test-system-prompt',
              promptVersion: 'v1',
            });
          }
          return Promise.resolve({
            classification: 'irrelevant',
            reason: 'Irrelevant content',
            model: 'test-model',
            userPrompt: question,
            systemPrompt: 'test-system-prompt',
            promptVersion: 'v1',
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

      const result = await service.evaluateTestSet(iterationNumber, prefixDir);

      expect(mockClassifierService.classify).toHaveBeenCalledTimes(
        (service as unknown as { testSet: QuestionSetItem[] }).testSet.length,
      );

      expect(result.records).toHaveLength(
        (service as unknown as { testSet: QuestionSetItem[] }).testSet.length,
      );
      expect(result.classMetrics).toHaveLength(4);
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
      jest
        .spyOn(FileHelper, 'listFiles')
        .mockResolvedValue(metricsDirFiles as string[]);

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
                createClassMetric({
                  classLabel: 'relevant',
                  totalQuestions: 5,
                  correctClassifications: 4,
                  incorrectClassifications: 1,
                  precision: 0.8,
                  recall: 0.8,
                }),
                createClassMetric({
                  classLabel: 'irrelevant',
                  totalQuestions: 5,
                  correctClassifications: 3,
                  incorrectClassifications: 2,
                  precision: 0.6,
                  recall: 0.6,
                }),
                createClassMetric({
                  classLabel: 'dangerous',
                  totalQuestions: 3,
                  correctClassifications: 2,
                  incorrectClassifications: 1,
                  precision: 0.5,
                  recall: 0.67,
                }),
                createClassMetric({
                  classLabel: 'unclear',
                  totalQuestions: 2,
                  correctClassifications: 1,
                  incorrectClassifications: 1,
                  precision: 0.5,
                  recall: 0.5,
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
              createClassMetric({
                classLabel: 'relevant',
                totalQuestions: 4,
                correctClassifications: 2,
                incorrectClassifications: 2,
                precision: 0.5,
                recall: 0.5,
              }),
              createClassMetric({
                classLabel: 'irrelevant',
                totalQuestions: 6,
                correctClassifications: 4,
                incorrectClassifications: 2,
                precision: 0.8,
                recall: 0.67,
              }),
              createClassMetric({
                classLabel: 'dangerous',
                totalQuestions: 1,
                correctClassifications: 1,
                incorrectClassifications: 0,
                precision: 1,
                recall: 1,
              }),
              createClassMetric({
                classLabel: 'unclear',
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
        totalQuestions: 10,
        correctClassifications: 6,
        incorrectClassifications: 4,
      });
      expect(notAcceptableMetrics?.precision).toBeCloseTo(6 / 11);
      expect(notAcceptableMetrics?.recall).toBeCloseTo(0.6);
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

  describe('calculateClassMetrics', () => {
    it('should calculate precision and recall correctly', () => {
      const records: QuestionClassificationTestRecord[] = [
        createTestRecord({
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q3',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        }), // False negative
        createTestRecord({
          question: 'q4',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }), // False positive
        createTestRecord({
          question: 'q5',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        }),
      ];

      const result = service['calculateClassMetrics']('relevant', records);

      // For 'relevant' class: TP=2, FP=1, FN=1
      expect(result.precision).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
      expect(result.recall).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
    });

    it('should handle edge case with no true positives', () => {
      const records: QuestionClassificationTestRecord[] = [
        createTestRecord({
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'unclear',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q3',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }), // False positive
      ];

      const result = service['calculateClassMetrics']('relevant', records);

      // For 'relevant' class: TP=0, FP=1, FN=2
      expect(result.precision).toBe(0); // 0 / (0 + 1) = 0
      expect(result.recall).toBe(0); // 0 / (0 + 2) = 0
    });
  });

  describe('calculateOverallMetrics', () => {
    it('should calculate overall metrics correctly including macro metrics', () => {
      const classMetrics: ClassClassificationMetrics[] = [
        {
          classLabel: 'relevant',
          totalQuestions: 5,
          correctClassifications: 4,
          incorrectClassifications: 1,
          precision: 0.8,
          recall: 0.8,
          macroPrecision: 0.8,
          macroRecall: 0.8,
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        {
          classLabel: 'irrelevant',
          totalQuestions: 5,
          correctClassifications: 3,
          incorrectClassifications: 2,
          precision: 0.6,
          recall: 0.6,
          macroPrecision: 0.6,
          macroRecall: 0.6,
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        {
          classLabel: 'dangerous',
          totalQuestions: 5,
          correctClassifications: 5,
          incorrectClassifications: 0,
          precision: 1.0,
          recall: 1.0,
          macroPrecision: 1.0,
          macroRecall: 1.0,
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        {
          classLabel: 'unclear',
          totalQuestions: 5,
          correctClassifications: 2,
          incorrectClassifications: 3,
          precision: 0.4,
          recall: 0.4,
          macroPrecision: 0.4,
          macroRecall: 0.4,
          timestamp: '2023-01-01T00:00:00.000Z',
        },
      ];

      const allRecords: QuestionClassificationTestRecord[] = [
        createTestRecord({
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q3',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q4',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q5',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q6',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q7',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q8',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q9',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q10',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q11',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q12',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q13',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q14',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q15',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q16',
          expectedClassification: 'unclear',
          actualClassification: 'unclear',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q17',
          expectedClassification: 'unclear',
          actualClassification: 'unclear',
          isCorrect: true,
        }),
        createTestRecord({
          question: 'q18',
          expectedClassification: 'unclear',
          actualClassification: 'irrelevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q19',
          expectedClassification: 'unclear',
          actualClassification: 'relevant',
          isCorrect: false,
        }),
        createTestRecord({
          question: 'q20',
          expectedClassification: 'unclear',
          actualClassification: 'relevant',
          isCorrect: false,
        }),
      ];

      const result = service['calculateOverallMetrics'](
        classMetrics,
        allRecords,
      );

      expect(result.totalQuestions).toBe(20);
      expect(result.totalCorrectClassifications).toBe(14);
      expect(result.totalIncorrectClassifications).toBe(6);

      // Macro-averaged precision: (0.8 + 0.6 + 1.0 + 0.4) / 4 = 0.7
      expect(result.overallPrecision).toBeCloseTo(0.7);

      // Macro-averaged recall: (0.8 + 0.6 + 1.0 + 0.4) / 4 = 0.7
      expect(result.overallRecall).toBeCloseTo(0.7);

      // Verify macro precision and recall are included
      expect(result).toHaveProperty('macroPrecision');
      expect(result).toHaveProperty('macroRecall');
      expect(result.macroPrecision).toBeCloseTo(0.7);
      expect(result.macroRecall).toBeCloseTo(0.7);
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
      expect(result.unclear).toBeUndefined();
    });
  });

  describe('saveIterationRecords', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should persist records for the iteration under the records directory', async () => {
      const iterationRecords = [
        createTestRecord({ question: 'iteration-2-q1' }),
        createTestRecord({ question: 'iteration-2-q2' }),
      ];

      const result = createTestResult({
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
      const metricsResultOne = createTestResult({
        iterationNumber: 1,
        classMetrics: [
          {
            classLabel: 'relevant',
            totalQuestions: 5,
            correctClassifications: 4,
            incorrectClassifications: 1,
            precision: 0.8,
            recall: 0.8,
            macroPrecision: 0.8,
            macroRecall: 0.8,
            timestamp: MOCK_TIMESTAMP,
          },
        ],
        overallMetrics: {
          totalQuestions: 5,
          totalCorrectClassifications: 4,
          totalIncorrectClassifications: 1,
          overallPrecision: 0.8,
          overallRecall: 0.8,
          macroPrecision: 0.8,
          macroRecall: 0.8,
          timestamp: MOCK_TIMESTAMP,
        },
        macroMetricsPerIteration: [
          {
            iteration: 1,
            macroPrecision: 0.8,
            macroRecall: 0.8,
            timestamp: MOCK_TIMESTAMP,
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
      const incorrectRecordOne = createTestRecord({
        question: 'incorrect-1',
        actualClassification: 'irrelevant',
        isCorrect: false,
      });
      const incorrectRecordTwo = createTestRecord({
        question: 'incorrect-2',
        actualClassification: 'dangerous',
        isCorrect: false,
      });

      const result: QuestionClassificationTestResults = createTestResult({
        iterationNumber: 1,
        records: [
          createTestRecord({ question: 'correct-1' }),
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
      const result: QuestionClassificationTestResults = createTestResult({
        iterationNumber: 1,
        records: [createTestRecord({ question: 'correct-only' })],
      });

      const saveSpy = jest
        .spyOn(FileHelper, 'appendToJsonArray')
        .mockResolvedValue(undefined as void);

      await service['saveIncorrectClassifications'](result, 'unit-prefix');

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});
