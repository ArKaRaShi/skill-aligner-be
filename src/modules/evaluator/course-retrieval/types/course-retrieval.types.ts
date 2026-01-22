import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { TokenCostEstimateSummary } from 'src/shared/utils/token-cost-calculator.helper';

/**
 * Course information for evaluation
 */
export type CourseInfo = {
  subjectCode: string;
  subjectName: string;
  cleanedLearningOutcomes: string[];
};

/**
 * Course information formatted for LLM consumption
 */
export type LlmCouresInfo = {
  course_code: string;
  course_name: string;
  learning_outcomes: string[];
};

/**
 * Input for course retriever evaluator
 */
export type CourseRetrieverEvaluatorInput = {
  question: string;
  skill: string;
  retrievedCourses: CourseInfo[];
};

/**
 * Relevance score (0-3)
 */
type RelevanceScore = 0 | 1 | 2 | 3;

/**
 * Single course evaluation item
 */
export type EvaluationItem = {
  subjectCode: string;
  subjectName: string;
  skillRelevance: RelevanceScore;
  skillReason: string;
  contextAlignment: RelevanceScore;
  contextReason: string;
};

/**
 * Score distribution for relevance metrics
 */
export type RetrievalScoreDistribution = {
  relevanceScore: RelevanceScore;
  percentage: number;
  count: number;
};

/**
 * Retrieval performance report with metrics
 */
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

/**
 * Output from course retriever evaluator
 */
export type CourseRetrieverEvaluatorOutput = {
  question: string;
  skill: string;
  evaluations: EvaluationItem[];
  metrics: RetrievalPerformanceReport;

  llmInfo: LlmInfo;
  llmTokenUsage: TokenUsage;
  llmCostEstimateSummary: TokenCostEstimateSummary;
};

// Re-export RelevanceScore for use in schemas
export type { RelevanceScore };

/**
 * Input for course retriever evaluation (used by runner)
 */
export type EvaluateRetrieverInput = {
  /** Optional test case ID for grouping multiple skill evaluations */
  testCaseId?: string;
  question: string;
  skill: string;
  retrievedCourses: CourseInfo[];
};

/**
 * Output from course retriever evaluation (used by runner)
 */
export type EvaluateRetrieverOutput = {
  /** Optional test case ID for grouping multiple skill evaluations */
  testCaseId?: string;
  question: string;
  skill: string;
  retrievedCount: number;
  evaluations: {
    subjectCode: string;
    subjectName: string;
    skillRelevance: number;
    contextAlignment: number;
    skillReason: string;
    contextReason: string;
  }[];
  metrics: {
    averageSkillRelevance: number;
    averageContextAlignment: number;
    alignmentGap: number;
    contextMismatchRate: number;
    contextMismatchCourses: {
      subjectCode: string;
      subjectName: string;
      skillRelevance: number;
      contextAlignment: number;
    }[];
  };
  llmModel: string;
  llmProvider: string;
  inputTokens: number;
  outputTokens: number;
};
