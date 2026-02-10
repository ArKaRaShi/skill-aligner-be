import { QuestionClassificationPromptVersion } from '../../prompts/question-classification';

export class ClassifyQuestionUseCaseInput {
  public readonly question: string;
  public readonly promptVersion: QuestionClassificationPromptVersion;

  constructor(params: {
    question: string;
    promptVersion: QuestionClassificationPromptVersion;
  }) {
    this.question = params.question;
    this.promptVersion = params.promptVersion;
  }
}
