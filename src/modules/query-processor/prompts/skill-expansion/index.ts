import {
  EXPAND_SKILL_SYSTEM_PROMPT_V2,
  getExpandSkillUserPromptV2,
} from './expand-skill-v2.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V4,
  getExpandSkillUserPromptV4,
} from './expand-skill-v4.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT,
  getExpandSkillUserPrompt,
} from './expand-skill.prompt';

type SkillExpansionPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string) => string;
};

export const SkillExpansionPromptVersions = {
  V1: 'v1',
  V2: 'v2',
  V4: 'v4',
} as const;

export type SkillExpansionPromptVersion =
  (typeof SkillExpansionPromptVersions)[keyof typeof SkillExpansionPromptVersions];

const SkillExpansionPrompts: Record<
  SkillExpansionPromptVersion,
  SkillExpansionPrompt
> = {
  v1: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT,
    getUserPrompt: getExpandSkillUserPrompt,
  },
  v2: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V2,
    getUserPrompt: getExpandSkillUserPromptV2,
  },
  v4: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V4,
    getUserPrompt: getExpandSkillUserPromptV4,
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
