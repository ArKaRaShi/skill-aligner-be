import {
  ClassClassificationMetrics,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
} from '../types/test-result.type';

export class QuestionClassificationMetricsHelper {
  static calculateClassMetrics(
    classLabel: string,
    records: QuestionClassificationTestRecord[],
  ): {
    precision: number;
    recall: number;
  } {
    const truePositives = records.filter(
      (r) =>
        r.actualClassification === classLabel &&
        r.expectedClassification === classLabel,
    ).length;
    const falsePositives = records.filter(
      (r) =>
        r.actualClassification === classLabel &&
        r.expectedClassification !== classLabel,
    ).length;
    const falseNegatives = records.filter(
      (r) =>
        r.actualClassification !== classLabel &&
        r.expectedClassification === classLabel,
    ).length;

    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;
    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;

    return { precision, recall };
  }

  static calculateOverallMetrics(
    classMetrics: ClassClassificationMetrics[],
    allRecords: QuestionClassificationTestRecord[],
  ): OverallClassificationMetrics {
    const totalQuestions = allRecords.length;
    const totalCorrectClassifications = allRecords.filter(
      (r) => r.isCorrect,
    ).length;
    const totalIncorrectClassifications =
      totalQuestions - totalCorrectClassifications;

    const totalPrecision = classMetrics.reduce(
      (sum, metric) => sum + metric.precision,
      0,
    );
    const totalRecall = classMetrics.reduce(
      (sum, metric) => sum + metric.recall,
      0,
    );
    const overallPrecision =
      classMetrics.length > 0 ? totalPrecision / classMetrics.length : 0;
    const overallRecall =
      classMetrics.length > 0 ? totalRecall / classMetrics.length : 0;

    const macroPrecision = overallPrecision;
    const macroRecall = overallRecall;

    return {
      totalQuestions,
      totalCorrectClassifications,
      totalIncorrectClassifications,
      overallPrecision,
      overallRecall,
      macroPrecision,
      macroRecall,
      timestamp: new Date().toISOString(),
    };
  }

  static calculateMacroMetrics(
    classLabel: string,
    records: QuestionClassificationTestRecord[],
  ): {
    macroPrecision: number;
    macroRecall: number;
  } {
    const { precision, recall } = this.calculateClassMetrics(
      classLabel,
      records,
    );

    return {
      macroPrecision: precision,
      macroRecall: recall,
    };
  }
}
