import {
  ClassClassificationMetrics,
  QuestionClassificationTestRecord,
} from '../../shared/types/test-result.type';
import { QuestionClassificationMetricsHelper } from './question-classification-metrics.helper';

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

describe('QuestionClassificationMetricsHelper', () => {
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

      const result = QuestionClassificationMetricsHelper.calculateClassMetrics(
        'relevant',
        records,
      );

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

      const result = QuestionClassificationMetricsHelper.calculateClassMetrics(
        'relevant',
        records,
      );

      // For 'relevant' class: TP=0, FP=1, FN=2
      expect(result.precision).toBe(0); // 0 / (0 + 1) = 0
      expect(result.recall).toBe(0); // 0 / (0 + 2) = 0
    });

    it('should handle empty records array', () => {
      const result = QuestionClassificationMetricsHelper.calculateClassMetrics(
        'relevant',
        [],
      );

      expect(result.precision).toBe(0);
      expect(result.recall).toBe(0);
    });

    it('should handle class with no predictions', () => {
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
          actualClassification: 'irrelevant',
          isCorrect: false,
        }),
      ];

      const result = QuestionClassificationMetricsHelper.calculateClassMetrics(
        'relevant',
        records,
      );

      expect(result.precision).toBe(0);
      expect(result.recall).toBe(0);
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

      const result =
        QuestionClassificationMetricsHelper.calculateOverallMetrics(
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
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle empty class metrics array', () => {
      const allRecords: QuestionClassificationTestRecord[] = [
        createTestRecord(),
        createTestRecord(),
      ];

      const result =
        QuestionClassificationMetricsHelper.calculateOverallMetrics(
          [],
          allRecords,
        );

      expect(result.totalQuestions).toBe(2);
      expect(result.totalCorrectClassifications).toBe(2);
      expect(result.totalIncorrectClassifications).toBe(0);
      expect(result.overallPrecision).toBe(0);
      expect(result.overallRecall).toBe(0);
      expect(result.macroPrecision).toBe(0);
      expect(result.macroRecall).toBe(0);
    });

    it('should handle empty records array', () => {
      const classMetrics: ClassClassificationMetrics[] = [
        createClassMetric({
          precision: 0.8,
          recall: 0.7,
        }),
      ];

      const result =
        QuestionClassificationMetricsHelper.calculateOverallMetrics(
          classMetrics,
          [],
        );

      expect(result.totalQuestions).toBe(0);
      expect(result.totalCorrectClassifications).toBe(0);
      expect(result.totalIncorrectClassifications).toBe(0);
      expect(result.overallPrecision).toBeCloseTo(0.8);
      expect(result.overallRecall).toBeCloseTo(0.7);
    });
  });

  describe('calculateMacroMetrics', () => {
    it('should calculate macro metrics same as regular metrics for single iteration', () => {
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
      ];

      const result = QuestionClassificationMetricsHelper.calculateMacroMetrics(
        'relevant',
        records,
      );

      // For 'relevant' class: TP=2, FP=1, FN=1
      expect(result.macroPrecision).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
      expect(result.macroRecall).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
    });

    it('should handle empty records array', () => {
      const result = QuestionClassificationMetricsHelper.calculateMacroMetrics(
        'relevant',
        [],
      );

      expect(result.macroPrecision).toBe(0);
      expect(result.macroRecall).toBe(0);
    });
  });
});
