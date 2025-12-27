import { Injectable } from '@nestjs/common';

import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  TSkillExpansion,
  TSkillExpansionV2,
} from '../../types/skill-expansion.type';

@Injectable()
export class MockSkillExpanderService implements ISkillExpanderService {
  async expandSkills(question: string): Promise<TSkillExpansion> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return {
      skillItems: [
        {
          skill: 'Mock Skill 1',
          reason: 'Expanded from question context',
        },
        {
          skill: 'Mock Skill 2',
          reason: 'Relevant to the topic',
        },
        {
          skill: 'Mock Skill 3',
          reason: 'Related to user query',
        },
      ],
    };
  }

  async expandSkillsV2(question: string): Promise<TSkillExpansionV2> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return {
      skillItems: [
        {
          skill: 'Mock Skill A',
          learningOutcome: 'Mock Learning Outcome A',
          reason: `Derived from ${question}`,
        },
      ],
    };
  }
}
