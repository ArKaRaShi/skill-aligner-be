import {
  FILTER_LO_SYSTEM_PROMPT_V1,
  getFilterLoPromptV1,
} from './filter-lo-v1.prompt';
import {
  FILTER_LO_SYSTEM_PROMPT_V2,
  getFilterLoPromptV2,
} from './filter-lo-v2.prompt';

type FilterLoPrompt = {
  systemPrompt: string;
  getUserPrompt: (skill: string, los: string) => string;
};

export const FilterLoPromptVersions = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type FilterLoPromptVersion =
  (typeof FilterLoPromptVersions)[keyof typeof FilterLoPromptVersions];

const FilterLoPrompts: Record<FilterLoPromptVersion, FilterLoPrompt> = {
  v1: {
    systemPrompt: FILTER_LO_SYSTEM_PROMPT_V1,
    getUserPrompt: getFilterLoPromptV1,
  },
  v2: {
    systemPrompt: FILTER_LO_SYSTEM_PROMPT_V2,
    getUserPrompt: getFilterLoPromptV2,
  },
};

export const FilterLoPromptFactory = () => {
  const getPrompts = (version: keyof typeof FilterLoPrompts) => {
    const prompts = FilterLoPrompts[version];
    if (!prompts) {
      throw new Error(`Unsupported Filter LO prompt version: ${version}`);
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = FilterLoPromptFactory();
// const prompts = getPrompts('v2');
// const userPrompt = prompts.getUserPrompt(skill, los);
// const systemPrompt = prompts.systemPrompt;
