import { AnswerQuestionStreamUseCase } from './answer-question-stream.use-case';
import { AnswerQuestionUseCase } from './answer-question.use-case';
import { ClassifyQuestionUseCase } from './classify-question.use-case';
import { ExpandSkillsUseCase } from './expand-skills.use-case';

export const QueryProcessorUseCases = [
  AnswerQuestionUseCase,
  AnswerQuestionStreamUseCase,
  ClassifyQuestionUseCase,
  ExpandSkillsUseCase,
];
