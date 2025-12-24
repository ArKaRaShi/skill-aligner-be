import { Identifier } from 'src/common/domain/types/identifier';

import { Campus, CampusView } from 'src/modules/campus/types/campus.type';
import { FacultyView } from 'src/modules/faculty/types/faculty-view.type';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

import { CourseClickLog } from './course-click-log.type';
import {
  LearningOutcome,
  MatchedLearningOutcome,
} from './course-learning-outcome-v2.type';
import { CourseLearningOutcomeMatch } from './course-learning-outcome.type';
import { CourseOffering } from './course-offering.type';
import { MatchedSkillLearningOutcomes } from './skill-learning-outcome.type';

export type Course = {
  id: Identifier;
  campusId: Identifier;
  facultyId: Identifier;

  subjectCode: string;
  subjectName: string;
  isGenEd: boolean;
  courseLearningOutcomes: LearningOutcome[];
  courseOfferings: CourseOffering[];
  courseClickLogs: CourseClickLog[];

  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseMatch = Omit<Course, 'courseLearningOutcomes'> & {
  cloMatches: CourseLearningOutcomeMatch[];
};

export type CourseWithLearningOutcomeV2Match = Omit<
  Course,
  'courseLearningOutcomes'
> & {
  matchedLearningOutcomes: MatchedLearningOutcome[];
  remainingLearningOutcomes: LearningOutcome[];
  allLearningOutcomes: LearningOutcome[];
};

// use for ranking with score
export type CourseWithLearningOutcomeV2MatchWithScore =
  CourseWithLearningOutcomeV2Match & {
    score: number;
  };

export type AggregatedCourseSkills = Course & {
  matchedSkills: MatchedSkillLearningOutcomes[];
  score?: number;
};

export type CourseView = {
  id: Identifier;
  campus: Campus;
  faculty: Faculty;

  subjectCode: string;
  subjectName: string;
  isGenEd: boolean;
  courseLearningOutcomes: LearningOutcome[];
  matchedSkills: MatchedSkillLearningOutcomes[];
  courseOfferings: CourseOffering[];
  totalClicks: number;
  score: number;

  createdAt: Date;
  updatedAt: Date;
};
