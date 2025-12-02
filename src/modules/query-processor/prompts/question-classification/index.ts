import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V2,
  getClassificationUserPromptV2,
} from './classify-question-v2.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT,
  getClassificationUserPrompt,
} from './classify-question.prompt';

type QuestionClassificationPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string) => string;
};

const QuestionClassificationPrompts: Record<
  'v1' | 'v2',
  QuestionClassificationPrompt
> = {
  v1: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT,
    getUserPrompt: getClassificationUserPrompt,
  },
  v2: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V2,
    getUserPrompt: getClassificationUserPromptV2,
  },
};

export const QuestionClassificationPromptFactory = () => {
  const getPrompts = (version: keyof typeof QuestionClassificationPrompts) => {
    const prompts = QuestionClassificationPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Question Classification prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = QuestionClassificationPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(question);
// const systemPrompt = prompts.systemPrompt;
