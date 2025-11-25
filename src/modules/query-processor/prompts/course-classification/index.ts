import {
  COURSE_CLASSIFICATION_SYSTEM_PROMPT_V2,
  getCourseClassificationUserPromptV2,
} from './course-classification-v2.prompt';
import {
  COURSE_CLASSIFICATION_SYSTEM_PROMPT_V3,
  getCourseClassificationUserPromptV3,
} from './course-classification-v3.prompt';
import {
  COURSE_CLASSIFICATION_SYSTEM_PROMPT_V4,
  getCourseClassificationUserPromptV4,
} from './course-classification-v4.prompt';
import {
  COURSE_CLASSIFICATION_SYSTEM_PROMPT_V1,
  getCourseClassificationUserPromptV1,
} from './course-classification.prompt';

type CourseClassificationPrompt = {
  systemPrompt: string;
  getUserPrompt: (question: string, context: string) => string;
};

const CourseClassificationPrompts: Record<
  'v1' | 'v2' | 'v3' | 'v4',
  CourseClassificationPrompt
> = {
  v1: {
    systemPrompt: COURSE_CLASSIFICATION_SYSTEM_PROMPT_V1,
    getUserPrompt: getCourseClassificationUserPromptV1,
  },
  v2: {
    systemPrompt: COURSE_CLASSIFICATION_SYSTEM_PROMPT_V2,
    getUserPrompt: getCourseClassificationUserPromptV2,
  },
  v3: {
    systemPrompt: COURSE_CLASSIFICATION_SYSTEM_PROMPT_V3,
    getUserPrompt: getCourseClassificationUserPromptV3,
  },
  v4: {
    systemPrompt: COURSE_CLASSIFICATION_SYSTEM_PROMPT_V4,
    getUserPrompt: getCourseClassificationUserPromptV4,
  },
};

export const CourseClassificationPromptFactory = () => {
  const getPrompts = (version: keyof typeof CourseClassificationPrompts) => {
    const prompts = CourseClassificationPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Course Classification prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = CourseClassificationPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(question, context);
// const systemPrompt = prompts.systemPrompt;
