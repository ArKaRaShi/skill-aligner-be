import { QuestionClassificationPromptVersion } from '../prompts/question-classification';
import { TQuestionClassification } from '../types/question-classification.type';

export const I_QUESTION_CLASSIFIER_SERVICE_TOKEN = Symbol(
  'IQuestionClassifierService',
);

export type QuestionClassifyInput = {
  question: string;
  promptVersion: QuestionClassificationPromptVersion;
};

export interface IQuestionClassifierService {
  classify(input: QuestionClassifyInput): Promise<TQuestionClassification>;
}
