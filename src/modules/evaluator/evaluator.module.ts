import { Module } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from '../../shared/adapters/llm/contracts/i-llm-router-service.contract';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { AppConfigService } from '../../shared/kernel/config/app-config.service';
import { QueryLoggingModule } from '../query-logging/query-logging.module';
import { QueryProcessorModule } from '../query-processor/query-processor.module';
// Answer Synthesis imports
import { AnswerSynthesisJudgeEvaluator } from './answer-synthesis/evaluators/answer-synthesis-judge.evaluator';
import { AnswerSynthesisTestSetLoaderService } from './answer-synthesis/loaders/answer-synthesis-test-set-loader.service';
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
import { CourseRetrievalComparisonService } from './course-retrieval/services/course-retrieval-comparison.service';
import { CourseRetrievalResultManagerService } from './course-retrieval/services/course-retrieval-result-manager.service';
import {
  CourseRetrievalRunnerService,
  I_COURSE_RETRIEVAL_RUNNER_TOKEN,
} from './course-retrieval/services/course-retrieval-runner.service';
import { EvaluatorController } from './evaluator.controller';
import { QuestionClassificationEvaluatorService } from './question-classification/evaluators/question-classification-evaluator.service';
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
      inject: [AppConfigService, I_LLM_ROUTER_SERVICE_TOKEN],
      useFactory: (
        config: AppConfigService,
        llmRouter: ILlmRouterService,
      ): CourseRetrieverEvaluator => {
        return new CourseRetrieverEvaluator(
          llmRouter,
          config.courseRetrieverEvaluatorLlmModel,
        );
      },
    },
    CourseRetrievalResultManagerService,
    EvaluationProgressTrackerService,
    CourseRetrievalComparisonService,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseRetrievalRunnerService,
    {
      provide: I_COURSE_RETRIEVAL_RUNNER_TOKEN,
      useClass: CourseRetrievalRunnerService,
    },
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
    AnswerSynthesisJudgeEvaluator,
    AnswerSynthesisComparisonService,
    AnswerSynthesisMetricsCalculator,
    AnswerSynthesisLowFaithfulnessAnalyzerService,
    AnswerSynthesisResultManagerService,
    AnswerSynthesisRunnerService,
  ],
  exports: [
    I_COURSE_RETRIEVAL_RUNNER_TOKEN,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseFilterEvaluationRunnerService,
    SkillExpansionTestSetLoaderService,
    SkillExpansionEvaluationRunnerService,
    AnswerSynthesisTestSetLoaderService,
    AnswerSynthesisRunnerService,
  ],
})
export class EvaluatorModule {}
