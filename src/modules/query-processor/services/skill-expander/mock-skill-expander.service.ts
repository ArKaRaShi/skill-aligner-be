import { Injectable } from '@nestjs/common';

import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  SkillExpansion,
  SkillExpansionV2,
} from '../../types/skill-expansion.type';

@Injectable()
export class MockSkillExpanderService implements ISkillExpanderService {
  async expandSkills(question: string): Promise<SkillExpansion> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return {
      skills: [
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
      rawQuestion: question,
    };
  }

  async expandSkillsV2(question: string): Promise<SkillExpansionV2> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return {
      core_skills: [
        {
          skill: 'mock core skill 1',
          reason: 'Essential for achieving the goal',
        },
        {
          skill: 'mock core skill 2',
          reason: 'Directly related to user objective',
        },
      ],
      supporting_skills: [
        {
          skill: 'mock supporting skill 1',
          reason: 'Helpful but not required',
        },
      ],
      expandable_skill_paths: [
        {
          path_name: 'advanced path',
          skills: [
            {
              skill: 'mock advanced skill 1',
              reason: 'For specialization in advanced topics',
            },
          ],
        },
        {
          path_name: 'beginner path',
          skills: [
            {
              skill: 'mock beginner skill 1',
              reason: 'For getting started with basics',
            },
          ],
        },
      ],
      rawQuestion: question,
    };
  }
}
