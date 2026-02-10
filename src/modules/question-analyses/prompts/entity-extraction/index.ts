import {
  ENTITY_EXTRACTION_SYSTEM_PROMPT_V1,
  getEntityExtractionUserPromptV1,
} from './entity-extraction-v1.prompt';

type EntityExtractionPrompt = {
  systemPrompt: string;
  getUserPrompt: (questionText: string) => string;
};

export const EntityExtractionPromptVersions = {
  V1: 'v1',
} as const;

export type EntityExtractionPromptVersion =
  (typeof EntityExtractionPromptVersions)[keyof typeof EntityExtractionPromptVersions];

const EntityExtractionPrompts: Record<
  EntityExtractionPromptVersion,
  EntityExtractionPrompt
> = {
  v1: {
    systemPrompt: ENTITY_EXTRACTION_SYSTEM_PROMPT_V1,
    getUserPrompt: getEntityExtractionUserPromptV1,
  },
};

export const EntityExtractionPromptFactory = () => {
  const getPrompts = (version: keyof typeof EntityExtractionPrompts) => {
    const prompts = EntityExtractionPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Entity Extraction prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = EntityExtractionPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(questionText);
// const systemPrompt = prompts.systemPrompt;
