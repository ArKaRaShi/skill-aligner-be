import { Module } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from '../../shared/adapters/llm/contracts/i-llm-router-service.contract';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { QueryLoggingModule } from '../query-logging/query-logging.module';
import { QueryProcessorModule } from '../query-processor/query-processor.module';
// Answer Synthesis imports
import { AnswerSynthesisJudgeEvaluator } from './answer-synthesis/evaluators/answer-synthesis-judge.evaluator';
import { AnswerSynthesisTestSetLoaderService } from './answer-synthesis/loaders/answer-synthesis-test-set-loader.service';
import { AnswerSynthesisTestSetTransformer } from './answer-synthesis/loaders/answer-synthesis-test-set-transformer.service';
import { AnswerSynthesisComparisonService } from './answer-synthesis/services/answer-synthesis-comparison.service';
import { AnswerSynthesisLowFaithfulnessAnalyzerService } from './answer-synthesis/services/answer-synthesis-low-faithfulness-analyzer.service';
import { AnswerSynthesisMetricsCalculator } from './answer-synthesis/services/answer-synthesis-metrics-calculator.service';
import { AnswerSynthesisResultManagerService } from './answer-synthesis/services/answer-synthesis-result-manager.service';
import { AnswerSynthesisRunnerService } from './answer-synthesis/services/answer-synthesis-runner.service';
// Course Relevance Filter imports
import { CourseFilterJudgeEvaluator } from './course-relevance-filter/evaluators/course-filter-judge.evaluator';
import { CourseFilterTestSetLoaderService } from './course-relevance-filter/loaders/course-filter-test-set-loader.service';
import { CourseFilterTestSetTransformer } from './course-relevance-filter/loaders/course-filter-test-set-transformer.service';
import { CourseComparisonService } from './course-relevance-filter/services/course-comparison.service';
import { CourseFilterEvaluationRunnerService } from './course-relevance-filter/services/course-filter-evaluation-runner.service';
import { CourseFilterResultManagerService } from './course-relevance-filter/services/course-filter-result-manager.service';
import { DisagreementAnalyzerService } from './course-relevance-filter/services/disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from './course-relevance-filter/services/metrics-calculator.service';
import { CourseRetrieverEvaluator } from './course-retrieval/evaluators/course-retriever.evaluator';
import { EvaluationProgressTrackerService } from './course-retrieval/evaluators/evaluation-progress-tracker.service';
import { CourseRetrievalTestSetLoaderService } from './course-retrieval/loaders/course-retrieval-test-set-loader.service';
import { CourseRetrievalTestSetTransformer } from './course-retrieval/loaders/course-retrieval-test-set-transformer.service';
import { CourseRetrievalComparisonService } from './course-retrieval/services/course-retrieval-comparison.service';
import { CourseRetrievalResultManagerService } from './course-retrieval/services/course-retrieval-result-manager.service';
import { CourseRetrievalRunnerService } from './course-retrieval/services/course-retrieval-runner.service';
import { EvaluatorController } from './evaluator.controller';
import { QuestionClassificationEvaluatorService } from './question-classification/evaluators/question-classification-evaluator.service';
import { EvaluatorJudgeConfig } from './shared/configs';
import { QuestionSetCreatorService } from './shared/services/question-set-creator.service';
import { TestSetBuilderService } from './shared/services/test-set-builder.service';
import { TestSetTransformer } from './shared/transformers/test-set.transformer';
// Skill Expansion imports
import { SkillExpansionJudgeEvaluator } from './skill-expansion/evaluators/skill-expansion-judge.evaluator';
import { SkillExpansionTestSetLoaderService } from './skill-expansion/loaders/skill-expansion-test-set-loader.service';
import { SkillExpansionComparisonService } from './skill-expansion/services/skill-expansion-comparison.service';
import { SkillExpansionMetricsCalculator } from './skill-expansion/services/skill-expansion-metrics-calculator.service';
import { SkillExpansionResultManagerService } from './skill-expansion/services/skill-expansion-result-manager.service';
import { SkillExpansionEvaluationRunnerService } from './skill-expansion/services/skill-expansion-runner.service';

@Module({
  imports: [QueryProcessorModule, GptLlmModule, QueryLoggingModule],
  controllers: [EvaluatorController],
  providers: [
    QuestionSetCreatorService,
    QuestionClassificationEvaluatorService,
    {
      provide: CourseRetrieverEvaluator,
      inject: [I_LLM_ROUTER_SERVICE_TOKEN],
      useFactory: (llmRouter: ILlmRouterService): CourseRetrieverEvaluator => {
        return new CourseRetrieverEvaluator(
          llmRouter,
          EvaluatorJudgeConfig.COURSE_RETRIEVAL.JUDGE_MODEL,
        );
      },
    },
    CourseRetrievalResultManagerService,
    EvaluationProgressTrackerService,
    CourseRetrievalComparisonService,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseRetrievalTestSetTransformer,
    CourseRetrievalRunnerService,
    // Course Relevance Filter providers
    CourseFilterTestSetTransformer,
    CourseFilterTestSetLoaderService,
    CourseFilterJudgeEvaluator,
    CourseComparisonService,
    DisagreementAnalyzerService,
    CourseFilterMetricsCalculator,
    CourseFilterResultManagerService,
    CourseFilterEvaluationRunnerService,
    // Skill Expansion providers
    SkillExpansionTestSetLoaderService,
    SkillExpansionJudgeEvaluator,
    SkillExpansionComparisonService,
    SkillExpansionMetricsCalculator,
    SkillExpansionResultManagerService,
    SkillExpansionEvaluationRunnerService,
    // Answer Synthesis providers
    AnswerSynthesisTestSetLoaderService,
    AnswerSynthesisTestSetTransformer,
    AnswerSynthesisJudgeEvaluator,
    AnswerSynthesisComparisonService,
    AnswerSynthesisMetricsCalculator,
    AnswerSynthesisLowFaithfulnessAnalyzerService,
    AnswerSynthesisResultManagerService,
    AnswerSynthesisRunnerService,
  ],
  exports: [
    CourseRetrievalRunnerService,
    CourseRetrievalTestSetLoaderService,
    CourseRetrievalTestSetTransformer,
    TestSetTransformer,
    TestSetBuilderService,
    CourseFilterEvaluationRunnerService,
    SkillExpansionTestSetLoaderService,
    SkillExpansionEvaluationRunnerService,
    AnswerSynthesisTestSetLoaderService,
    AnswerSynthesisTestSetTransformer,
    AnswerSynthesisRunnerService,
  ],
})
export class EvaluatorModule {}
