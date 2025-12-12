import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V2,
  getClassificationUserPromptV2,
} from './classify-question-v2.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V3,
  getClassificationUserPromptV3,
} from './classify-question-v3.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V4,
  getClassificationUserPromptV4,
} from './classify-question-v4.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V5,
  getClassificationUserPromptV5,
} from './classify-question-v5.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V6,
  getClassificationUserPromptV6,
} from './classify-question-v6.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT,
  getClassificationUserPrompt,
} from './classify-question.prompt';

type QuestionClassificationPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string) => string;
};

const QuestionClassificationPrompts: Record<
  'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6',
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
  v3: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V3,
    getUserPrompt: getClassificationUserPromptV3,
  },
  v4: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V4,
    getUserPrompt: getClassificationUserPromptV4,
  },
  v5: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V5,
    getUserPrompt: getClassificationUserPromptV5,
  },
  v6: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V6,
    getUserPrompt: getClassificationUserPromptV6,
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
