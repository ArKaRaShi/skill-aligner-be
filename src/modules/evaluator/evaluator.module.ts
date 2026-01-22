import { Module } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from '../../shared/adapters/llm/contracts/i-llm-router-service.contract';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { AppConfigService } from '../../shared/kernel/config/app-config.service';
import { QueryLoggingModule } from '../query-logging/query-logging.module';
import { QueryProcessorModule } from '../query-processor/query-processor.module';
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
import { EvaluationResultManagerService } from './course-retrieval/evaluators/evaluation-result-manager.service';
import { CourseRetrievalTestSetLoaderService } from './course-retrieval/loaders/course-retrieval-test-set-loader.service';
import {
  CourseRetrieverEvaluationRunnerService,
  I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
} from './course-retrieval/runners/course-retriever-evaluation-runner.service';
import { EvaluatorController } from './evaluator.controller';
import { QuestionClassificationEvaluatorService } from './question-classification/evaluators/question-classification-evaluator.service';
import { QuestionSetCreatorService } from './shared/services/question-set-creator.service';
import { TestSetBuilderService } from './shared/services/test-set-builder.service';
import { TestSetTransformer } from './shared/transformers/test-set.transformer';

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
    EvaluationResultManagerService,
    EvaluationProgressTrackerService,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseRetrieverEvaluationRunnerService,
    {
      provide: I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
      useClass: CourseRetrieverEvaluationRunnerService,
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
  ],
  exports: [
    I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseFilterEvaluationRunnerService,
  ],
})
export class EvaluatorModule {}
