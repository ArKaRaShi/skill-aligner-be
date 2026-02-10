import { SkillExpansionPromptVersion } from '../../prompts/skill-expansion';

export class ExpandSkillsUseCaseInput {
  public readonly question: string;
  public readonly promptVersion: SkillExpansionPromptVersion;

  constructor(params: {
    question: string;
    promptVersion: SkillExpansionPromptVersion;
  }) {
    this.question = params.question;
    this.promptVersion = params.promptVersion;
  }
}
