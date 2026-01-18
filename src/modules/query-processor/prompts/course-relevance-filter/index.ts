import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V1,
  getCourseRelevanceFilterUserPromptV1,
} from './archives/course-relevance-filter-v1.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V2,
  getCourseRelevanceFilterUserPromptV2,
} from './archives/course-relevance-filter-v2.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V3,
  getCourseRelevanceFilterUserPromptV3,
} from './archives/course-relevance-filter-v3.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V4,
  getCourseRelevanceFilterUserPromptV4,
} from './archives/course-relevance-filter-v4.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V5,
  getCourseRelevanceFilterUserPromptV5,
} from './course-relevance-filter-v5.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V6,
  getCourseRelevanceFilterUserPromptV6,
} from './course-relevance-filter-v6.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V7,
  getCourseRelevanceFilterUserPromptV7,
} from './course-relevance-filter-v7.prompt';
import {
  COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V8,
  getCourseRelevanceFilterUserPromptV8,
} from './course-relevance-filter-v8.prompt';

type CourseRelevanceFilterPrompt = {
  systemPrompt: string;
  getUserPrompt: (
    question: string,
    skill: string,
    coursesData: string,
  ) => string;
};

export const CourseRelevanceFilterPromptVersions = {
  V1: 'v1',
  V2: 'v2',
  V3: 'v3',
  V4: 'v4',
  V5: 'v5',
  V6: 'v6',
  V7: 'v7',
  V8: 'v8',
} as const;

export type CourseRelevanceFilterPromptVersion =
  (typeof CourseRelevanceFilterPromptVersions)[keyof typeof CourseRelevanceFilterPromptVersions];

const CourseRelevanceFilterPrompts: Record<
  CourseRelevanceFilterPromptVersion,
  CourseRelevanceFilterPrompt
> = {
  v1: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V1,
    getUserPrompt: getCourseRelevanceFilterUserPromptV1,
  },
  v2: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V2,
    getUserPrompt: getCourseRelevanceFilterUserPromptV2,
  },
  v3: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V3,
    getUserPrompt: getCourseRelevanceFilterUserPromptV3,
  },
  v4: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V4,
    getUserPrompt: getCourseRelevanceFilterUserPromptV4,
  },
  v5: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V5,
    getUserPrompt: getCourseRelevanceFilterUserPromptV5,
  },
  v6: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V6,
    getUserPrompt: getCourseRelevanceFilterUserPromptV6,
  },
  v7: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V7,
    getUserPrompt: getCourseRelevanceFilterUserPromptV7,
  },
  v8: {
    systemPrompt: COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V8,
    getUserPrompt: getCourseRelevanceFilterUserPromptV8,
  },
};

export const CourseRelevanceFilterPromptFactory = () => {
  const getPrompts = (version: keyof typeof CourseRelevanceFilterPrompts) => {
    const prompts = CourseRelevanceFilterPrompts[version];
    if (!prompts) {
      throw new Error(
        `Unsupported Course Relevance Filter prompt version: ${version}`,
      );
    }
    return prompts;
  };

  return { getPrompts };
};

// Usage Example:
// const { getPrompts } = CourseRelevanceFilterPromptFactory();
// const prompts = getPrompts('v1');
// const userPrompt = prompts.getUserPrompt(question, context);
// const systemPrompt = prompts.systemPrompt;
