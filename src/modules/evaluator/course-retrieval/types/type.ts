import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { TokenCostEstimateSummary } from 'src/shared/utils/token-cost-calculator.helper';

export type CourseInfo = {
  subjectCode: string;
  subjectName: string;
  cleanedLearningOutcomes: string[];
};

export type LlmCouresInfo = {
  course_code: string;
  course_name: string;
  learning_outcomes: string[];
};

export type CourseRetrieverEvaluatorInput = {
  question: string;
  skill: string;
  retrievedCourses: CourseInfo[];
};

type RelevanceScore = 0 | 1 | 2 | 3;

export type EvaluationItem = {
  subjectCode: string;
  subjectName: string;
  skillRelevance: RelevanceScore;
  skillReason: string;
  contextAlignment: RelevanceScore;
  contextReason: string;
};

export type RetrievalScoreDistribution = {
  relevanceScore: RelevanceScore;
  percentage: number;
  count: number;
};

export type RetrievalPerformanceReport = {
  // Main metrics:
  // How good is the search at finding topics?
  averageSkillRelevance: number;
  skillRelevanceDistribution: RetrievalScoreDistribution[];

  // How good is the search at understanding the user?
  averageContextAlignment: number;
  contextAlignmentDistribution: RetrievalScoreDistribution[];

  // Diagnostic metric:
  // Percentage of "High Skill, Low Context" results
  contextMismatchRate: number;
  contextMismatchCourses: EvaluationItem[];

  // The difference (Skill - Context)
  alignmentGap: number;
};

export type CourseRetrieverEvaluatorOutput = {
  question: string;
  skill: string;
  evaluations: EvaluationItem[];
  metrics: RetrievalPerformanceReport;

  llmInfo: LlmInfo;
  llmTokenUsage: TokenUsage;
  llmCostEstimateSummary: TokenCostEstimateSummary;
};
