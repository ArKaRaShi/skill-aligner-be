import {
  EXPAND_SKILL_SYSTEM_PROMPT_V2,
  getExpandSkillUserPromptV2,
} from './archives/expand-skill-v2.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V4,
  getExpandSkillUserPromptV4,
} from './archives/expand-skill-v4.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V5,
  getExpandSkillUserPromptV5,
} from './archives/expand-skill-v5.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V7,
  getExpandSkillUserPromptV7,
} from './archives/expand-skill-v7.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V8,
  getExpandSkillUserPromptV8,
} from './archives/expand-skill-v8.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V9,
  getExpandSkillUserPromptV9,
} from './expand-skill-v9.prompt';
import {
  EXPAND_SKILL_SYSTEM_PROMPT_V10,
  getExpandSkillUserPromptV10,
} from './expand-skill-v10.prompt';
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
  V5: 'v5',
  V7: 'v7',
  V8: 'v8',
  V9: 'v9',
  V10: 'v10',
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
  v5: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V5,
    getUserPrompt: getExpandSkillUserPromptV5,
  },
  v7: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V7,
    getUserPrompt: getExpandSkillUserPromptV7,
  },
  v8: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V8,
    getUserPrompt: getExpandSkillUserPromptV8,
  },
  v9: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V9,
    getUserPrompt: getExpandSkillUserPromptV9,
  },
  v10: {
    systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT_V10,
    getUserPrompt: getExpandSkillUserPromptV10,
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
