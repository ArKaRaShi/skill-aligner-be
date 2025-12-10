import { Test, TestingModule } from '@nestjs/testing';

import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';
import { QuestionClassification } from 'src/modules/query-processor/types/question-classification.type';

import { QuestionSetItem } from '../../test-set/question-set.constant';
import {
  ClassClassificationMetrics,
  QuestionClassificationTestRecord,
} from '../../types/test-result.type';
import { QuestionClassificationEvaluatorService } from '../question-classification-evaluator.service';

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
    it('should classify all questions and calculate metrics correctly', async () => {
      // Mock classification responses
      mockClassifierService.classify.mockImplementation(
        (question: string): Promise<QuestionClassification> => {
          if (
            question.includes('Python') ||
            question.includes('AI') ||
            question.includes('วิเคราะห์') ||
            question.includes('การเงิน') ||
            question.includes('เว็บ')
          ) {
            return Promise.resolve({
              classification: 'relevant',
              reason: 'Course-related content',
              model: 'test-model',
              userPrompt: question,
              systemPrompt: 'test-system-prompt',
              promptVersion: 'v1',
            });
          } else if (
            question.includes('ยาเรียนอะไรดี') ||
            question.includes('ขอวิชาหน่อย') ||
            question.includes('มีคอร์สอะไรรึเปล่า') ||
            question.includes('เรียนยังไงดี') ||
            question.includes('ช่วยแนะนำด้วย')
          ) {
            return Promise.resolve({
              classification: 'unclear',
              reason: 'Unclear intent',
              model: 'test-model',
              userPrompt: question,
              systemPrompt: 'test-system-prompt',
              promptVersion: 'v1',
            });
          } else if (
            question.includes('ผิดกฎหมาย') ||
            question.includes('กัญชา') ||
            question.includes('แฮก') ||
            question.includes('ระเบิด') ||
            question.includes('โกง')
          ) {
            return Promise.resolve({
              classification: 'dangerous',
              reason: 'Dangerous content',
              model: 'test-model',
              userPrompt: question,
              systemPrompt: 'test-system-prompt',
              promptVersion: 'v1',
            });
          } else {
            return Promise.resolve({
              classification: 'irrelevant',
              reason: 'Irrelevant content',
              model: 'test-model',
              userPrompt: question,
              systemPrompt: 'test-system-prompt',
              promptVersion: 'v1',
            });
          }
        },
      );

      const result = await service.evaluateTestSet();

      // Verify structure
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('classMetrics');
      expect(result).toHaveProperty('overallMetrics');

      // Verify records
      expect(result.records).toHaveLength(20);
      expect(
        result.records.every(
          (record) =>
            'question' in record &&
            'expectedClassification' in record &&
            'actualClassification' in record &&
            'isCorrect' in record,
        ),
      ).toBe(true);

      // Verify class metrics
      expect(result.classMetrics).toHaveLength(4);
      const classLabels = result.classMetrics.map(
        (metric) => metric.classLabel,
      );
      expect(classLabels).toContain('relevant');
      expect(classLabels).toContain('irrelevant');
      expect(classLabels).toContain('dangerous');
      expect(classLabels).toContain('unclear');

      // Verify overall metrics
      expect(result.overallMetrics.totalQuestions).toBe(20);
      expect(result.overallMetrics).toHaveProperty(
        'totalCorrectClassifications',
      );
      expect(result.overallMetrics).toHaveProperty(
        'totalIncorrectClassifications',
      );
      expect(result.overallMetrics).toHaveProperty('overallPrecision');
      expect(result.overallMetrics).toHaveProperty('overallRecall');
    });
  });

  describe('calculateClassMetrics', () => {
    it('should calculate precision and recall correctly', () => {
      const records: QuestionClassificationTestRecord[] = [
        {
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q3',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        }, // False negative
        {
          question: 'q4',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }, // False positive
        {
          question: 'q5',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        },
      ];

      const result = service['calculateClassMetrics']('relevant', records);

      // For 'relevant' class: TP=2, FP=1, FN=1
      expect(result.precision).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
      expect(result.recall).toBeCloseTo(2 / (2 + 1)); // 2/3 = 0.667
    });

    it('should handle edge case with no true positives', () => {
      const records: QuestionClassificationTestRecord[] = [
        {
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        },
        {
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'unclear',
          isCorrect: false,
        },
        {
          question: 'q3',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        }, // False positive
      ];

      const result = service['calculateClassMetrics']('relevant', records);

      // For 'relevant' class: TP=0, FP=1, FN=2
      expect(result.precision).toBe(0); // 0 / (0 + 1) = 0
      expect(result.recall).toBe(0); // 0 / (0 + 2) = 0
    });
  });

  describe('calculateOverallMetrics', () => {
    it('should calculate overall metrics correctly', () => {
      const classMetrics: ClassClassificationMetrics[] = [
        {
          classLabel: 'relevant',
          totalQuestions: 5,
          correctClassifications: 4,
          incorrectClassifications: 1,
          precision: 0.8,
          recall: 0.8,
        },
        {
          classLabel: 'irrelevant',
          totalQuestions: 5,
          correctClassifications: 3,
          incorrectClassifications: 2,
          precision: 0.6,
          recall: 0.6,
        },
        {
          classLabel: 'dangerous',
          totalQuestions: 5,
          correctClassifications: 5,
          incorrectClassifications: 0,
          precision: 1.0,
          recall: 1.0,
        },
        {
          classLabel: 'unclear',
          totalQuestions: 5,
          correctClassifications: 2,
          incorrectClassifications: 3,
          precision: 0.4,
          recall: 0.4,
        },
      ];

      const allRecords: QuestionClassificationTestRecord[] = [
        {
          question: 'q1',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q2',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q3',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q4',
          expectedClassification: 'relevant',
          actualClassification: 'relevant',
          isCorrect: true,
        },
        {
          question: 'q5',
          expectedClassification: 'relevant',
          actualClassification: 'irrelevant',
          isCorrect: false,
        },
        {
          question: 'q6',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        },
        {
          question: 'q7',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        },
        {
          question: 'q8',
          expectedClassification: 'irrelevant',
          actualClassification: 'irrelevant',
          isCorrect: true,
        },
        {
          question: 'q9',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        },
        {
          question: 'q10',
          expectedClassification: 'irrelevant',
          actualClassification: 'relevant',
          isCorrect: false,
        },
        {
          question: 'q11',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        },
        {
          question: 'q12',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        },
        {
          question: 'q13',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        },
        {
          question: 'q14',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        },
        {
          question: 'q15',
          expectedClassification: 'dangerous',
          actualClassification: 'dangerous',
          isCorrect: true,
        },
        {
          question: 'q16',
          expectedClassification: 'unclear',
          actualClassification: 'unclear',
          isCorrect: true,
        },
        {
          question: 'q17',
          expectedClassification: 'unclear',
          actualClassification: 'unclear',
          isCorrect: true,
        },
        {
          question: 'q18',
          expectedClassification: 'unclear',
          actualClassification: 'irrelevant',
          isCorrect: false,
        },
        {
          question: 'q19',
          expectedClassification: 'unclear',
          actualClassification: 'relevant',
          isCorrect: false,
        },
        {
          question: 'q20',
          expectedClassification: 'unclear',
          actualClassification: 'relevant',
          isCorrect: false,
        },
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
});
