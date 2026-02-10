export type RelevanceInput = {
  id: string;
  userQuestion: string;
  recommendedCourse: {
    subjectCode: string;
    subjectName: string;
    learningOutcomes: string[];
  };
};

export type RelevanceOutput = {
  id: string;
  score: number; // 0-3
  reason: string; // Short explanation
};
