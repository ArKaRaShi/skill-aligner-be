import {
  getQueryProfileBuilderUserPromptV2,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V2,
} from './query-profile-builder-v2.prompt';
import {
  getQueryProfileBuilderUserPrompt,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT,
} from './query-profile-builder.prompt';

type QueryProfileBuilderPrompt = {
  systemPrompt: string;
  getUserPrompt: (query: string) => string;
};

const QueryProfileBuilderPrompts: Record<
  'v1' | 'v2',
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
};

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
