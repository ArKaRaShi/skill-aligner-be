import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V2,
  getAnswerSynthesisUserPromptV2,
} from './answer-synthesis-v2.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V3,
  getAnswerSynthesisUserPromptV3,
} from './answer-synthesis-v3.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V4,
  getAnswerSynthesisUserPromptV4,
} from './answer-synthesis-v4.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V5,
  getAnswerSynthesisUserPromptV5,
} from './answer-synthesis-v5.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT,
  getAnswerSynthesisUserPrompt,
} from './answer-synthesis.prompt';

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
