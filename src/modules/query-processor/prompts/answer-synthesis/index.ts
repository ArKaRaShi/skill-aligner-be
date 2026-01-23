import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V7,
  getAnswerSynthesisUserPromptV7,
} from './answer-synthesis-v7.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V8,
  getAnswerSynthesisUserPromptV8,
} from './answer-synthesis-v8.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V9,
  getAnswerSynthesisUserPromptV9,
} from './answer-synthesis-v9.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V10,
  getAnswerSynthesisUserPromptV10,
} from './answer-synthesis-v10.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V11,
  getAnswerSynthesisUserPromptV11,
} from './answer-synthesis-v11.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V12,
  getAnswerSynthesisUserPromptV12,
} from './answer-synthesis-v12.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V13,
  getAnswerSynthesisUserPromptV13,
} from './answer-synthesis-v13.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V14,
  getAnswerSynthesisUserPromptV14,
} from './answer-synthesis-v14.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT,
  getAnswerSynthesisUserPrompt,
} from './answer-synthesis.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V2,
  getAnswerSynthesisUserPromptV2,
} from './archives/answer-synthesis-v2.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V3,
  getAnswerSynthesisUserPromptV3,
} from './archives/answer-synthesis-v3.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V4,
  getAnswerSynthesisUserPromptV4,
} from './archives/answer-synthesis-v4.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V5,
  getAnswerSynthesisUserPromptV5,
} from './archives/answer-synthesis-v5.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V6,
  getAnswerSynthesisUserPromptV6,
} from './archives/answer-synthesis-v6.prompt';

type AnswerSynthesisPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string, context: string) => string;
};

export const AnswerSynthesisPromptVersions = {
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
} as const;

export type AnswerSynthesisPromptVersion =
  (typeof AnswerSynthesisPromptVersions)[keyof typeof AnswerSynthesisPromptVersions];

const AnswerSynthesisPrompts: Record<
  AnswerSynthesisPromptVersion,
  AnswerSynthesisPrompt
> = {
  v1: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT,
    getUserPrompt: getAnswerSynthesisUserPrompt,
  },
  v2: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V2,
    getUserPrompt: getAnswerSynthesisUserPromptV2,
  },
  v3: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V3,
    getUserPrompt: getAnswerSynthesisUserPromptV3,
  },
  v4: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V4,
    getUserPrompt: getAnswerSynthesisUserPromptV4,
  },
  v5: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V5,
    getUserPrompt: getAnswerSynthesisUserPromptV5,
  },
  v6: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V6,
    getUserPrompt: getAnswerSynthesisUserPromptV6,
  },
  v7: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V7,
    getUserPrompt: getAnswerSynthesisUserPromptV7,
  },
  v8: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V8,
    getUserPrompt: getAnswerSynthesisUserPromptV8,
  },
  v9: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V9,
    getUserPrompt: getAnswerSynthesisUserPromptV9,
  },
  v10: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V10,
    getUserPrompt: getAnswerSynthesisUserPromptV10,
  },
  v11: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V11,
    getUserPrompt: getAnswerSynthesisUserPromptV11,
  },
  v12: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V12,
    getUserPrompt: getAnswerSynthesisUserPromptV12,
  },
  v13: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V13,
    getUserPrompt: getAnswerSynthesisUserPromptV13,
  },
  v14: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V14,
    getUserPrompt: getAnswerSynthesisUserPromptV14,
  },
};

export const AnswerSynthesisPromptFactory = () => {
  const getPrompts = (version: keyof typeof AnswerSynthesisPrompts) => {
    const prompts = AnswerSynthesisPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Answer Synthesis prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = AnswerSynthesisPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(question, context);
// const systemPrompt = prompts.systemPrompt;
