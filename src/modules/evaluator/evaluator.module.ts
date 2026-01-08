import { Module } from '@nestjs/common';

import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import { QueryLoggingModule } from '../query-logging/query-logging.module';
import { QueryProcessorModule } from '../query-processor/query-processor.module';
import { CourseRetrieverEvaluator } from './course-retrieval/evaluators/course-retriever.evaluator';
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
    CourseRetrieverEvaluator,
    EvaluationResultManagerService,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
    CourseRetrieverEvaluationRunnerService,
    {
      provide: I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
      useClass: CourseRetrieverEvaluationRunnerService,
    },
  ],
  exports: [
    I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
    TestSetTransformer,
    TestSetBuilderService,
    CourseRetrievalTestSetLoaderService,
  ],
})
export class EvaluatorModule {}
