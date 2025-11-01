export type AnswerQuestionUseCaseOutput = {
  answer: string | null;
  suggestQuestion: string | null;
  relatedCourses: {
    skill: string;
    courseName: string;
    matchLO: string;
    similarity: number;
  }[];
};
