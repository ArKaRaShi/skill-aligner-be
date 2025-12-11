import {
  EXPAND_SKILL_SYSTEM_PROMPT_V2,
  getExpandSkillUserPromptV2,
} from './expand-skill-v2.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V3,
  getExpandSkillUserPromptV3,
} from './expand-skill-v3.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT,
  getExpandSkillUserPrompt,
} from './expand-skill.prompt';

type SkillExpansionPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string) => string;
};

const SkillExpansionPrompts: Record<'v1' | 'v2' | 'v3', SkillExpansionPrompt> =
  {
    v1: {
      systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT,
      getUserPrompt: getExpandSkillUserPrompt,
    },
    v2: {
      systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V2,
      getUserPrompt: getExpandSkillUserPromptV2,
    },
    v3: {
      systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V3,
      getUserPrompt: getExpandSkillUserPromptV3,
    },
  };

export const SkillExpansionPromptFactory = () => {
  const getPrompts = (version: keyof typeof SkillExpansionPrompts) => {
    const prompts = SkillExpansionPrompts[version];
    if (!prompts) {
      throw new Error(`Unsupported Skill Expansion prompt version: ${version}`);
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = SkillExpansionPromptFactory();
// const prompts = getPrompts('v3');
// const userPrompt = prompts.getUserPrompt(question);
// const systemPrompt = prompts.systemPrompt;
