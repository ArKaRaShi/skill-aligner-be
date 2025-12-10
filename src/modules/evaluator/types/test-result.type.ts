export type QuestionClassificationTestRecord = {
  question: string;
  expectedClassification: string;
  actualClassification: string;
  isCorrect: boolean;
};

export type ClassClassificationMetrics = {
  classLabel: string;
  totalQuestions: number;
  correctClassifications: number;
  incorrectClassifications: number;
  precision: number;
  recall: number;
};

export type OverallClassificationMetrics = {
  totalQuestions: number;
  totalCorrectClassifications: number;
  totalIncorrectClassifications: number;
  overallPrecision: number;
  overallRecall: number;
};

export type ClassifierMetadata = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  promptVersion: string;
};

export type QuestionClassificationTestResults = {
  records: QuestionClassificationTestRecord[];
  classMetrics: ClassClassificationMetrics[];
  overallMetrics: OverallClassificationMetrics;
  classifierMetadata: ClassifierMetadata;
};
