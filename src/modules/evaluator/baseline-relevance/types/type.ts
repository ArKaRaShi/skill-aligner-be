export type RelevanceInput = {
  id: string;
  userQuestion: string;
  recommendedCourse: {
    courseCode: string;
    courseName: string;
    learningOutcomes: string[];
  };
};

export type RelevanceOutput = {
  id: string;
  score: number; // 0-3
  reason: string; // Short explanation
};
