import {
  getQueryProfileBuilderUserPromptV2,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V2,
} from './archives/query-profile-builder-v2.prompt';
import {
  getQueryProfileBuilderUserPromptV3,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V3,
} from './query-profile-builder-v3.prompt';
import {
  getQueryProfileBuilderUserPrompt,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT,
} from './query-profile-builder.prompt';

type QueryProfileBuilderPrompt = {
  systemPrompt: string;
  getUserPrompt: (query: string) => string;
};

const QueryProfileBuilderPrompts: Record<
  'v1' | 'v2' | 'v3',
  QueryProfileBuilderPrompt
> = {
  v1: {
    systemPrompt: QUERY_PROFILE_BUILDER_SYSTEM_PROMPT,
    getUserPrompt: getQueryProfileBuilderUserPrompt,
  },
  v2: {
    systemPrompt: QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V2,
    getUserPrompt: getQueryProfileBuilderUserPromptV2,
  },
  v3: {
    systemPrompt: QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V3,
    getUserPrompt: getQueryProfileBuilderUserPromptV3,
  },
};

export const QueryProfileBuilderPromptVersions = {
  V1: 'v1',
  V2: 'v2',
  V3: 'v3',
} as const;

export type QueryProfileBuilderPromptVersion =
  (typeof QueryProfileBuilderPromptVersions)[keyof typeof QueryProfileBuilderPromptVersions];

export const QueryProfileBuilderPromptFactory = () => {
  const getPrompts = (version: keyof typeof QueryProfileBuilderPrompts) => {
    const prompts = QueryProfileBuilderPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Query Profile Builder prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = QueryProfileBuilderPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(query);
// const systemPrompt = prompts.systemPrompt;
