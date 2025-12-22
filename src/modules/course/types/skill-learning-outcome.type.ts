import { MatchedLearningOutcome } from './course-learning-outcome-v2.type';

export type MatchedSkillLearningOutcomes = {
  skill: string;
  learningOutcomes: MatchedLearningOutcome[];
};
