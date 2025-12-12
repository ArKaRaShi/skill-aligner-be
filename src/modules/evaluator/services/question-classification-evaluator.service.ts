import { Inject, Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';

import { HashHelper } from 'src/common/helpers/hash.helper';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';
import { QuestionClassificationPromptVersion } from 'src/modules/query-processor/prompts/question-classification';

import { QuestionClassificationMetricsHelper } from '../helpers/question-classification-metrics.helper';
import { QUESTION_SET_V5 } from '../test-set/question-set-v5.constant';
import { QuestionSetItem } from '../test-set/question-set.constant';
import {
  ClassClassificationMetrics,
  ClassificationMetadata,
  CollapsedClassMetrics,
  CollapsedIterationMetrics,
  FinalMacroMetrics,
  MacroMetricsPerIteration,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
  QuestionClassificationTestResults,
} from '../types/test-result.type';

@Injectable()
export class QuestionClassificationEvaluatorService {
  private readonly logger = new Logger(
    QuestionClassificationEvaluatorService.name,
  );

  private readonly classLabels = ['relevant', 'irrelevant', 'dangerous'];

  // Configuration
  private readonly evaluationBaseDir =
    'data/evaluation/question-classification';
  private readonly recordsDirName = 'records';
  private readonly metricsDirName = 'metrics';
  private readonly testSet: QuestionSetItem[] = QUESTION_SET_V5.map((item) => {
    if (item.expectedCategory === 'unclear') {
      return {
        ...item,
        expectedCategory: 'irrelevant',
      };
    }
    return item;
  });

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
  ) {}

  async evaluateTestSet(
    currentIteration: number,
    prefixDir: string,
    promptVersion: QuestionClassificationPromptVersion,
  ): Promise<QuestionClassificationTestResults> {
    this.logger.log(`Starting evaluation iteration ${currentIteration}`);

    const iterationResult = await this.evaluateSingleIteration(
      currentIteration,
      promptVersion,
    );

    await this.saveIterationRecords(iterationResult, prefixDir);
    await this.saveIterationMetrics(iterationResult, prefixDir);
    await this.saveAggregatedFinalMetrics(prefixDir);
    await this.saveIncorrectClassifications(iterationResult, prefixDir);

    return iterationResult;
  }

  async getCollapsedIterationMetrics(
    iterationNumbers: number[],
    prefixDir: string,
  ): Promise<CollapsedIterationMetrics[]> {
    if (!prefixDir) {
      throw new Error('A prefix directory must be provided to load metrics.');
    }

    if (!iterationNumbers || iterationNumbers.length === 0) {
      throw new Error('At least one iteration number must be provided.');
    }

    const metricsDir = this.buildEvaluationPath(prefixDir, this.metricsDirName);
    const filesInDir = await FileHelper.listFiles(metricsDir);
    const availableFiles = new Set(filesInDir);

    const uniqueIterations = [...new Set(iterationNumbers)];
    const collapsedResults: CollapsedIterationMetrics[] = [];

    for (const iteration of uniqueIterations) {
      const fileName = `metrics-iteration-${iteration}.json`;

      if (!availableFiles.has(fileName)) {
        throw new Error(
          `Metrics file not found for iteration ${iteration} in ${metricsDir}`,
        );
      }

      const metricsFilePath = path.join(metricsDir, fileName);
      const iterationMetrics = await FileHelper.loadJson<{
        iterationNumber: number;
        classMetrics: ClassClassificationMetrics[];
        overallMetrics?: OverallClassificationMetrics;
      }>(metricsFilePath);

      const collapsedMetrics = this.collapseClassMetrics(
        iterationMetrics.classMetrics,
      );

      collapsedResults.push({
        iterationNumber: iterationMetrics.iterationNumber ?? iteration,
        sourceFile: fileName,
        iterationTimestamp: iterationMetrics.overallMetrics?.timestamp,
        generatedAt: new Date().toISOString(),
        metrics: collapsedMetrics,
      });
    }

    return collapsedResults;
  }

  private async evaluateSingleIteration(
    iterationNumber: number,
    promptVersion: QuestionClassificationPromptVersion,
  ): Promise<QuestionClassificationTestResults> {
    const classifiedRecords = await this.classifyAllQuestions(
      this.testSet,
      promptVersion,
    );
    const records = this.mapToTestRecords(classifiedRecords);
    const classMetrics = this.calculateAllClassMetrics(this.testSet, records);
    const overallMetrics =
      QuestionClassificationMetricsHelper.calculateOverallMetrics(
        classMetrics,
        records,
      );
    const macroMetricsPerIteration = this.createMacroMetricsForIteration(
      iterationNumber,
      overallMetrics,
      classMetrics,
    );

    const testResults: QuestionClassificationTestResults = {
      records,
      classMetrics,
      overallMetrics,
      macroMetricsPerIteration,
      iterationNumber,
      timestamp: new Date().toISOString(),
    };

    return testResults;
  }

  private async classifyAllQuestions(
    testSet: QuestionSetItem[],
    promptVersion: QuestionClassificationPromptVersion,
  ): Promise<
    Array<{
      question: string;
      expectedCategory: string;
      classification: string;
      reasoning: string;
      isCorrect: boolean;
      userPrompt: string;
      systemPrompt: string;
      model: string;
      promptVersion: string;
    }>
  > {
    const classificationPromises = testSet.map(async (questionObj) => {
      this.logger.log(
        `Classifying question for evaluation: "${questionObj.question}"`,
      );

      const {
        classification: actualClassification,
        reason,
        userPrompt,
        systemPrompt,
        model,
        promptVersion: resolvedPromptVersion,
      } = await this.questionClassifierService.classify({
        question: questionObj.question,
        promptVersion,
      });
      const isCorrect = actualClassification === questionObj.expectedCategory;

      return {
        question: questionObj.question,
        expectedCategory: questionObj.expectedCategory,
        classification: actualClassification,
        reasoning: reason,
        isCorrect,
        userPrompt,
        systemPrompt,
        model,
        promptVersion: resolvedPromptVersion,
      };
    });

    return await Promise.all(classificationPromises);
  }

  private mapToTestRecords(
    classifiedRecords: Array<{
      question: string;
      expectedCategory: string;
      classification: string;
      reasoning: string;
      isCorrect: boolean;
      userPrompt: string;
      systemPrompt: string;
      model: string;
      promptVersion: string;
    }>,
  ): QuestionClassificationTestRecord[] {
    return classifiedRecords.map(
      ({
        question,
        expectedCategory,
        classification,
        reasoning,
        isCorrect,
        userPrompt,
        systemPrompt,
        model,
        promptVersion,
      }) => ({
        question,
        expectedClassification: expectedCategory,
        actualClassification: classification,
        reasoning,
        isCorrect,
        metadata: this.buildRecordMetadata({
          model,
          systemPrompt,
          userPrompt,
          promptVersion,
        }),
      }),
    );
  }

  private buildRecordMetadata({
    model,
    systemPrompt,
    userPrompt,
    promptVersion,
  }: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    promptVersion: string;
  }): ClassificationMetadata {
    return {
      model: model || 'unknown',
      hashedSystemPrompt: systemPrompt
        ? HashHelper.generateHashSHA256(systemPrompt)
        : 'unknown',
      userPrompt: userPrompt || 'unknown',
      promptVersion: promptVersion || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  private calculateAllClassMetrics(
    testSet: QuestionSetItem[],
    records: QuestionClassificationTestRecord[],
  ): ClassClassificationMetrics[] {
    const questionsByCategory = this.groupQuestionsByCategory(testSet);
    const classMetrics: ClassClassificationMetrics[] = [];

    for (const classLabel of this.classLabels) {
      const questions = questionsByCategory[classLabel] || [];
      const classRecords = records.filter(
        (r) => r.expectedClassification === classLabel,
      );

      const { precision, recall } =
        QuestionClassificationMetricsHelper.calculateClassMetrics(
          classLabel,
          records,
        );

      const questionsCount = questions.length;
      const correctCount = classRecords.filter((r) => r.isCorrect).length;

      const { macroPrecision, macroRecall } =
        QuestionClassificationMetricsHelper.calculateMacroMetrics(
          classLabel,
          records,
        );

      classMetrics.push({
        classLabel,
        totalQuestions: questionsCount,
        correctClassifications: correctCount,
        incorrectClassifications: questionsCount - correctCount,
        precision,
        recall,
        macroPrecision,
        macroRecall,
        timestamp: new Date().toISOString(),
      });
    }

    return classMetrics;
  }

  private createMacroMetricsForIteration(
    iterationNumber: number,
    overallMetrics: OverallClassificationMetrics,
    classMetrics: ClassClassificationMetrics[],
  ): MacroMetricsPerIteration[] {
    return [
      {
        iteration: iterationNumber,
        macroPrecision: overallMetrics.macroPrecision,
        macroRecall: overallMetrics.macroRecall,
        timestamp: new Date().toISOString(),
        classBreakdown: classMetrics.map((metric) => ({
          className: metric.classLabel,
          precision: metric.precision,
          recall: metric.recall,
        })),
      },
    ];
  }

  private calculateFinalMacroMetrics(
    overallMetricsList: OverallClassificationMetrics[],
  ): FinalMacroMetrics {
    const macroPrecisions = overallMetricsList.map(
      (metrics) => metrics.macroPrecision,
    );
    const macroRecalls = overallMetricsList.map(
      (metrics) => metrics.macroRecall,
    );

    const averageMacroPrecision =
      macroPrecisions.reduce((sum, val) => sum + val, 0) /
      macroPrecisions.length;
    const averageMacroRecall =
      macroRecalls.reduce((sum, val) => sum + val, 0) / macroRecalls.length;

    return {
      macroPrecision: macroPrecisions[macroPrecisions.length - 1] || 0,
      macroRecall: macroRecalls[macroRecalls.length - 1] || 0,
      totalIterations: overallMetricsList.length,
      averageMacroPrecision,
      averageMacroRecall,
      timestamp: new Date().toISOString(),
    };
  }

  private async saveAggregatedFinalMetrics(prefixDir: string): Promise<void> {
    const metricsDir = this.buildEvaluationPath(prefixDir, this.metricsDirName);

    let files: string[];
    try {
      files = (await FileHelper.listFiles(metricsDir)).filter((file) =>
        file.endsWith('.json'),
      );
    } catch {
      this.logger.warn(
        `Metrics directory not found when aggregating final metrics: ${metricsDir}`,
      );
      return;
    }

    if (files.length === 0) {
      return;
    }

    const metricsEntries = await Promise.all(
      files.map((file) =>
        FileHelper.loadJson<{
          iterationNumber: number;
          overallMetrics: OverallClassificationMetrics;
        }>(path.join(metricsDir, file)),
      ),
    );

    metricsEntries.sort((a, b) => a.iterationNumber - b.iterationNumber);

    const finalMetrics = this.calculateFinalMacroMetrics(
      metricsEntries.map((entry) => entry.overallMetrics),
    );

    await this.saveFinalMetrics(finalMetrics, prefixDir);
  }

  private async saveIterationRecords(
    result: QuestionClassificationTestResults,
    prefixDir: string,
  ): Promise<void> {
    const filePath = path.join(
      this.buildEvaluationPath(prefixDir, this.recordsDirName),
      `records-iteration-${result.iterationNumber}.json`,
    );
    await FileHelper.saveJson(filePath, result.records);
  }

  private async saveIterationMetrics(
    result: QuestionClassificationTestResults,
    prefixDir: string,
  ): Promise<void> {
    const filePath = path.join(
      this.buildEvaluationPath(prefixDir, this.metricsDirName),
      `metrics-iteration-${result.iterationNumber}.json`,
    );
    await FileHelper.saveJson(filePath, {
      iterationNumber: result.iterationNumber,
      overallMetrics: result.overallMetrics,
      classMetrics: result.classMetrics,
      macroMetrics: result.macroMetricsPerIteration,
    });
  }

  private async saveFinalMetrics(
    finalMacroMetrics: FinalMacroMetrics,
    prefixDir: string,
  ): Promise<void> {
    const basePath = this.buildEvaluationPath(
      prefixDir,
      `final-metrics-${finalMacroMetrics.totalIterations}`,
    );
    await FileHelper.saveLatestJson(basePath, finalMacroMetrics);
  }

  private async saveIncorrectClassifications(
    result: QuestionClassificationTestResults,
    prefixDir: string,
  ): Promise<void> {
    const incorrectRecords = result.records.filter(
      (record) => !record.isCorrect,
    );

    if (incorrectRecords.length === 0) {
      return;
    }

    const summary = {
      iterationNumber: result.iterationNumber,
      totalIncorrectClassifications: incorrectRecords.length,
      incorrectRecords,
      timestamp: new Date().toISOString(),
    };

    const filePath = this.buildEvaluationPath(
      prefixDir,
      'incorrect-classifications.json',
    );
    await FileHelper.appendToJsonArray(filePath, summary);
  }

  private buildEvaluationPath(
    prefixDir: string,
    ...segments: string[]
  ): string {
    const parts = [this.evaluationBaseDir];
    if (prefixDir) {
      parts.push(prefixDir);
    }
    if (segments.length > 0) {
      parts.push(...segments);
    }
    return path.join(...parts);
  }

  private collapseClassMetrics(
    classMetrics: ClassClassificationMetrics[],
  ): CollapsedClassMetrics[] {
    const acceptableMetrics = classMetrics.filter(
      (metric) => metric.classLabel === 'relevant',
    );
    const notAcceptableMetrics = classMetrics.filter(
      (metric) => metric.classLabel !== 'relevant',
    );

    return [
      this.aggregateMetricsGroup(acceptableMetrics, 'acceptable'),
      this.aggregateMetricsGroup(notAcceptableMetrics, 'not-acceptable'),
    ];
  }

  private aggregateMetricsGroup(
    metricsGroup: ClassClassificationMetrics[],
    classLabel: 'acceptable' | 'not-acceptable',
  ): CollapsedClassMetrics {
    if (metricsGroup.length === 0) {
      return {
        classLabel,
        totalQuestions: 0,
        correctClassifications: 0,
        incorrectClassifications: 0,
        precision: 0,
        recall: 0,
      };
    }

    const totalQuestions = metricsGroup.reduce(
      (sum, metric) => sum + metric.totalQuestions,
      0,
    );
    const correctClassifications = metricsGroup.reduce(
      (sum, metric) => sum + metric.correctClassifications,
      0,
    );
    const incorrectClassifications = metricsGroup.reduce(
      (sum, metric) => sum + metric.incorrectClassifications,
      0,
    );

    const predictedPositiveCount = metricsGroup.reduce(
      (sum, metric) => sum + this.derivePredictedPositiveCount(metric),
      0,
    );

    const precision =
      predictedPositiveCount > 0
        ? correctClassifications / predictedPositiveCount
        : 0;
    const recall =
      totalQuestions > 0 ? correctClassifications / totalQuestions : 0;

    return {
      classLabel,
      totalQuestions,
      correctClassifications,
      incorrectClassifications,
      precision,
      recall,
    };
  }

  private derivePredictedPositiveCount(
    metric: ClassClassificationMetrics,
  ): number {
    if (metric.precision <= 0) {
      return metric.correctClassifications;
    }

    return metric.correctClassifications / metric.precision;
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
