import {
  GENERATE_ANSWER_SYSTEM_PROMPT_V2,
  getGenerateAnswerUserPromptV2,
} from './generate-answer-v2.prompt';
import {
  GENERATE_ANSWER_SYSTEM_PROMPT,
  getGenerateAnswerUserPrompt,
} from './generate-answer.prompt';

type AnswerGeneratorPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string, context: string) => string;
};

const AnswerGeneratorPrompts: Record<'v1' | 'v2', AnswerGeneratorPrompt> = {
  v1: {
    systemPrompt: GENERATE_ANSWER_SYSTEM_PROMPT,
    getUserPrompt: getGenerateAnswerUserPrompt,
  },
  v2: {
    systemPrompt: GENERATE_ANSWER_SYSTEM_PROMPT_V2,
    getUserPrompt: getGenerateAnswerUserPromptV2,
  },
};

export const AnswerGeneratorPromptFactory = () => {
  const getPrompts = (version: keyof typeof AnswerGeneratorPrompts) => {
    const prompts = AnswerGeneratorPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Answer Generator prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = AnswerGeneratorPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(question, context);
// const systemPrompt = prompts.systemPrompt;
