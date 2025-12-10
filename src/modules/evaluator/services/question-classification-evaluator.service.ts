import { Inject, Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';

import {
  QUESTION_SET_V2,
  QuestionSetItem,
} from '../test-set/question-set.constant';
import {
  ClassClassificationMetrics,
  ClassifierMetadata,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
  QuestionClassificationTestResults,
} from '../types/test-result.type';

@Injectable()
export class QuestionClassificationEvaluatorService {
  private readonly logger = new Logger(
    QuestionClassificationEvaluatorService.name,
  );
  private readonly classLabels = [
    'relevant',
    'irrelevant',
    'dangerous',
    'unclear',
  ];

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
  ) {}

  async evaluateTestSet(): Promise<QuestionClassificationTestResults> {
    const testSet = QUESTION_SET_V2;
    const classMetrics: ClassClassificationMetrics[] = [];
    const allRecords: QuestionClassificationTestRecord[] = [];

    // First, classify all questions
    const classificationPromises = testSet.map(async (questionObj) => {
      this.logger.log(
        `Classifying question for evaluation: "${questionObj.question}"`,
      );

      const {
        classification: actualClassification,
        userPrompt,
        systemPrompt,
        model,
        promptVersion,
      } = await this.questionClassifierService.classify(questionObj.question);
      const isCorrect = actualClassification === questionObj.expectedCategory;

      return {
        question: questionObj.question,
        expectedClassification: questionObj.expectedCategory,
        actualClassification,
        isCorrect,
        userPrompt,
        systemPrompt,
        model,
        promptVersion,
      };
    });

    const classifiedRecords = await Promise.all(classificationPromises);

    const metadata: ClassifierMetadata = {
      model: classifiedRecords[0]?.model || 'unknown',
      systemPrompt: classifiedRecords[0]?.systemPrompt || 'unknown',
      userPrompt: classifiedRecords[0]?.userPrompt || 'unknown',
      promptVersion: classifiedRecords[0]?.promptVersion || 'unknown',
    };

    allRecords.push(
      ...classifiedRecords.map(
        ({
          question,
          expectedClassification,
          actualClassification,
          isCorrect,
        }) => ({
          question,
          expectedClassification,
          actualClassification,
          isCorrect,
        }),
      ),
    );

    // Group questions by expected category for metrics calculation
    const questionsByCategory = this.groupQuestionsByCategory(testSet);

    // Then calculate metrics for each class using all records
    for (const classLabel of this.classLabels) {
      const questions = questionsByCategory[classLabel] || [];
      const classRecords = allRecords.filter(
        (r) => r.expectedClassification === classLabel,
      );
      const { precision, recall } = this.calculateClassMetrics(
        classLabel,
        allRecords,
      );

      const questionsCount = questions.length;
      const correctCount = classRecords.filter((r) => r.isCorrect).length;

      classMetrics.push({
        classLabel,
        totalQuestions: questionsCount,
        correctClassifications: correctCount,
        incorrectClassifications: questionsCount - correctCount,
        precision,
        recall,
      });
    }

    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(
      classMetrics,
      allRecords,
    );

    const testResults: QuestionClassificationTestResults = {
      records: allRecords,
      classMetrics,
      overallMetrics,
      classifierMetadata: metadata,
    };

    // Save results to JSON file
    await FileHelper.saveLatestJson(
      'data/evaluation/question-classification/question-classification-results',
      testResults,
    );

    return testResults;
  }

  calculateClassMetrics(
    classLabel: string,
    records: QuestionClassificationTestRecord[],
  ): {
    precision: number;
    recall: number;
  } {
    const tp = records.filter(
      (r) =>
        r.actualClassification === classLabel &&
        r.expectedClassification === classLabel,
    ).length;
    const fp = records.filter(
      (r) =>
        r.actualClassification === classLabel &&
        r.expectedClassification !== classLabel,
    ).length;
    const fn = records.filter(
      (r) =>
        r.actualClassification !== classLabel &&
        r.expectedClassification === classLabel,
    ).length;

    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);

    return { precision, recall };
  }

  calculateOverallMetrics(
    classMetrics: ClassClassificationMetrics[],
    allRecords: QuestionClassificationTestRecord[],
  ): OverallClassificationMetrics {
    const totalQuestions = allRecords.length;
    const totalCorrectClassifications = allRecords.filter(
      (r) => r.isCorrect,
    ).length;
    const totalIncorrectClassifications =
      totalQuestions - totalCorrectClassifications;

    // Calculate overall precision and recall using macro-averaging
    const totalPrecision = classMetrics.reduce(
      (sum, metric) => sum + metric.precision,
      0,
    );
    const totalRecall = classMetrics.reduce(
      (sum, metric) => sum + metric.recall,
      0,
    );
    const overallPrecision = totalPrecision / classMetrics.length;
    const overallRecall = totalRecall / classMetrics.length;

    return {
      totalQuestions,
      totalCorrectClassifications,
      totalIncorrectClassifications,
      overallPrecision,
      overallRecall,
    };
  }

  groupQuestionsByCategory(
    testSet: QuestionSetItem[],
  ): Record<string, QuestionSetItem[]> {
    return testSet.reduce(
      (acc, questionObj) => {
        const category = questionObj.expectedCategory;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(questionObj);
        return acc;
      },
      {} as Record<string, QuestionSetItem[]>,
    );
  }
}
