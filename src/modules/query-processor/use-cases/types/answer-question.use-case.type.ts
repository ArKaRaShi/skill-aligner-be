export type LearningOutcomeOutput = {
  id: string;
  name: string;
};

export type CourseOutput = {
  id: string;
  subjectCode: string;
  name: string;
  reason: string;
  learningOutcomes: LearningOutcomeOutput[];
};

export type AnswerQuestionUseCaseOutput = {
  answer: string | null;
  suggestQuestion: string | null;
  skillGroupedCourses: {
    skill: string;
    courses: CourseOutput[];
  }[];
};
