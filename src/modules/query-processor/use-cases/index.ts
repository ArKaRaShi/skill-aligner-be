import { AnswerQuestionStreamUseCase } from './answer-question-stream.use-case';
import { AnswerQuestionUseCase } from './answer-question.use-case';
import { ExpandSkillsUseCase } from './expand-skills.use-case';

export const QueryProcessorUseCases = [
  AnswerQuestionUseCase,
  AnswerQuestionStreamUseCase,
  ExpandSkillsUseCase,
];
