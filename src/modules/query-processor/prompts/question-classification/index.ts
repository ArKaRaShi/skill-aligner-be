import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V2,
  getClassificationUserPromptV2,
} from './archives/classify-question-v2.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V3,
  getClassificationUserPromptV3,
} from './archives/classify-question-v3.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V4,
  getClassificationUserPromptV4,
} from './archives/classify-question-v4.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V5,
  getClassificationUserPromptV5,
} from './archives/classify-question-v5.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V6,
  getClassificationUserPromptV6,
} from './archives/classify-question-v6.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V7,
  getClassificationUserPromptV7,
} from './archives/classify-question-v7.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V8,
  getClassificationUserPromptV8,
} from './archives/classify-question-v8.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V9,
  getClassificationUserPromptV9,
} from './archives/classify-question-v9.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V12,
  getClassificationUserPromptV12,
} from './archives/classify-question-v12.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V10,
  getClassificationUserPromptV10,
} from './classify-question-v10.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V11,
  getClassificationUserPromptV11,
} from './classify-question-v11.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V13,
  getClassificationUserPromptV13,
} from './classify-question-v13.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V14,
  getClassificationUserPromptV14,
} from './classify-question-v14.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V15,
  getClassificationUserPromptV15,
} from './classify-question-v15.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V16,
  getClassificationUserPromptV16,
} from './classify-question-v16.prompt';
import {
  CLASSIFY_QUESTION_SYSTEM_PROMPT_V17,
  getClassificationUserPromptV17,
} from './classify-question-v17.prompt';
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
  V11: 'v11',
  V12: 'v12',
  V13: 'v13',
  V14: 'v14',
  V15: 'v15',
  V16: 'v16',
  V17: 'v17',
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
  v11: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V11,
    getUserPrompt: getClassificationUserPromptV11,
  },
  v12: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V12,
    getUserPrompt: getClassificationUserPromptV12,
  },
  v13: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V13,
    getUserPrompt: getClassificationUserPromptV13,
  },
  v14: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V14,
    getUserPrompt: getClassificationUserPromptV14,
  },
  v15: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V15,
    getUserPrompt: getClassificationUserPromptV15,
  },
  v16: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V16,
    getUserPrompt: getClassificationUserPromptV16,
  },
  v17: {
    systemPrompt: CLASSIFY_QUESTION_SYSTEM_PROMPT_V17,
    getUserPrompt: getClassificationUserPromptV17,
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
