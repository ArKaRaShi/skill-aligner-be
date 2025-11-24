type CourseOutput = {
  courseName: string;
  reason: string;
};

export type AnswerQuestionUseCaseOutput = {
  answer: string | null;
  suggestQuestion: string | null;
  skillGroupedCourses: {
    skill: string;
    courses: CourseOutput[];
  }[];
};
