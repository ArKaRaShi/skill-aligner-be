import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT_V2,
  getAnswerSynthesisUserPrompt,
} from './answer-synthesis-v2.prompt';
import {
  ANSWER_SYNTHESIS_SYSTEM_PROMPT,
  getAnswerSynthesisUserPrompt as getAnswerSynthesisUserPromptV1,
} from './answer-synthesis.prompt';

type AnswerSynthesisPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string, context: string) => string;
};

const AnswerSynthesisPrompts: Record<'v1' | 'v2', AnswerSynthesisPrompt> = {
  v1: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT,
    getUserPrompt: getAnswerSynthesisUserPromptV1,
  },
  v2: {
    systemPrompt: ANSWER_SYNTHESIS_SYSTEM_PROMPT_V2,
    getUserPrompt: getAnswerSynthesisUserPrompt,
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
