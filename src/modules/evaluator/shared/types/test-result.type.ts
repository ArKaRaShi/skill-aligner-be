export type ClassificationMetadata = {
  model: string;
  hashedSystemPrompt: string;
  userPrompt: string;
  promptVersion: string;
  timestamp: string;
};

export type QuestionClassificationTestRecord = {
  question: string;
  expectedClassification: string;
  actualClassification: string;
  reasoning: string;
  isCorrect: boolean;
  metadata: ClassificationMetadata;
};

export type ClassClassificationMetrics = {
  classLabel: string;
  totalQuestions: number;
  correctClassifications: number;
  incorrectClassifications: number;
  precision: number;
  recall: number;
  macroPrecision: number;
  macroRecall: number;
  timestamp: string;
};

export type OverallClassificationMetrics = {
  totalQuestions: number;
  totalCorrectClassifications: number;
  totalIncorrectClassifications: number;
  overallPrecision: number;
  overallRecall: number;
  macroPrecision: number;
  macroRecall: number;
  timestamp: string;
};

export type MacroMetricsPerIteration = {
  iteration: number;
  macroPrecision: number;
  macroRecall: number;
  timestamp: string;
  classBreakdown: {
    className: string;
    precision: number;
    recall: number;
  }[];
};

export type QuestionClassificationTestResults = {
  records: QuestionClassificationTestRecord[];
  classMetrics: ClassClassificationMetrics[];
  overallMetrics: OverallClassificationMetrics;
  macroMetricsPerIteration: MacroMetricsPerIteration[];
  iterationNumber: number;
  timestamp: string;
};

export type FinalMacroMetrics = {
  macroPrecision: number;
  macroRecall: number;
  totalIterations: number;
  averageMacroPrecision: number;
  averageMacroRecall: number;
  timestamp: string;
};

export type CollapsedClassMetrics = {
  classLabel: 'acceptable' | 'not-acceptable';
  totalQuestions: number;
  correctClassifications: number;
  incorrectClassifications: number;
  precision: number;
  recall: number;
};

export type CollapsedIterationMetrics = {
  iterationNumber: number;
  sourceFile: string;
  iterationTimestamp?: string;
  generatedAt: string;
  metrics: CollapsedClassMetrics[];
};
