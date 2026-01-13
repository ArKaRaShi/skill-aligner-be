import { AnswerQuestionStreamUseCase } from './answer-question-stream.use-case';
import { AnswerQuestionUseCase } from './answer-question.use-case';

export const QueryProcessorUseCases = [
  AnswerQuestionUseCase,
  AnswerQuestionStreamUseCase,
];
