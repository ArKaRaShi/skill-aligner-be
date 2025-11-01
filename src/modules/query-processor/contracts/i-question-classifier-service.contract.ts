import { QuestionClassification } from '../types/question-classification.type';

export const I_QUESTION_CLASSIFIER_SERVICE_TOKEN = Symbol(
  'IQuestionClassifierService',
);

export interface IQuestionClassifierService {
  classify(question: string): Promise<QuestionClassification>;
}
