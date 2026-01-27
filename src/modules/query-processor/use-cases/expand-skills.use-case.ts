import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';

import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { ExpandSkillsUseCaseInput } from './inputs/expand-skills.use-case.input';
import { ExpandSkillsUseCaseOutput } from './outputs/expand-skills.use-case.output';

@Injectable()
export class ExpandSkillsUseCase
  implements IUseCase<ExpandSkillsUseCaseInput, ExpandSkillsUseCaseOutput>
{
  private readonly logger = new Logger(ExpandSkillsUseCase.name);

  constructor(
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
  ) {}

  async execute(
    input: ExpandSkillsUseCaseInput,
  ): Promise<ExpandSkillsUseCaseOutput> {
    this.logger.log(
      `Expanding skills for question: "${input.question}" with prompt version: ${input.promptVersion}`,
    );

    const result = await this.skillExpanderService.expandSkills(
      input.question,
      input.promptVersion,
    );

    this.logger.log(
      `Skill expansion completed. Found ${result.skillItems.length} skills.`,
    );

    return result;
  }
}
