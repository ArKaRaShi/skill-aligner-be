import { Module } from '@nestjs/common';

import { GptLlmModule } from '../gpt-llm/gpt-llm.module';
import { QueryProcessorModule } from '../query-processor/query-processor.module';
import { EvaluatorController } from './evaluator.controller';
import { QuestionClassificationEvaluatorService } from './services/question-classification-evaluator.service';
import { QuestionSetCreatorService } from './services/question-set-creator.service';

@Module({
  imports: [QueryProcessorModule, GptLlmModule],
  controllers: [EvaluatorController],
  providers: [
    QuestionSetCreatorService,
    QuestionClassificationEvaluatorService,
  ],
})
export class EvaluatorModule {}
