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
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V7,
  getClassificationUserPromptV7,
} from './classify-question-v7.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V8,
  getClassificationUserPromptV8,
} from './classify-question-v8.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V9,
  getClassificationUserPromptV9,
} from './classify-question-v9.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V10,
  getClassificationUserPromptV10,
} from './classify-question-v10.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT,
  getClassificationUserPrompt,
} from './classify-question.prompt';

type QuestionClassificationPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string) => string;
};

export const QuestionClassificationPromptVersions = {
  V1: 'v1',
  V2: 'v2',
  V3: 'v3',
  V4: 'v4',
  V5: 'v5',
  V6: 'v6',
  V7: 'v7',
  V8: 'v8',
  V9: 'v9',
  V10: 'v10',
} as const;

export type QuestionClassificationPromptVersion =
  (typeof QuestionClassificationPromptVersions)[keyof typeof QuestionClassificationPromptVersions];

const QuestionClassificationPrompts: Record<
  QuestionClassificationPromptVersion,
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
  v7: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V7,
    getUserPrompt: getClassificationUserPromptV7,
  },
  v8: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V8,
    getUserPrompt: getClassificationUserPromptV8,
  },
  v9: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V9,
    getUserPrompt: getClassificationUserPromptV9,
  },
  v10: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V10,
    getUserPrompt: getClassificationUserPromptV10,
  },
};

export const QuestionClassificationPromptFactory = () => {
  const getPrompts = (version: QuestionClassificationPromptVersion) => {
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
