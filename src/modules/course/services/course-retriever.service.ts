import { Inject, Injectable } from '@nestjs/common';

import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from '../contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from '../contracts/i-course-repository.contract';
import {
  FindLosBySkillsWithFilterParams,
  ICourseRetrieverService,
} from '../contracts/i-course-retriever-service.contract';
import { CourseWithLearningOutcomeV2Match } from '../types/course.type';

@Injectable()
export class CourseRetrieverService implements ICourseRetrieverService {
  constructor(
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,
  ) {}

  async getCoursesBySkillsWithFilter({
    skills,
    threshold,
    topN,
    vectorDimension,
    enableLlmFilter,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindLosBySkillsWithFilterParams): Promise<
    Map<string, CourseWithLearningOutcomeV2Match[]>
  > {
    const learningOutcomesBySkills =
      await this.courseLearningOutcomeRepository.findLosBySkills({
        skills,
        threshold,
        topN,
        vectorDimension,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });

    const coursesBySkills = new Map<
      string,
      CourseWithLearningOutcomeV2Match[]
    >();

    for (const [
      skill,
      learningOutcomes,
    ] of learningOutcomesBySkills.entries()) {
      if (learningOutcomes.length === 0) {
        coursesBySkills.set(skill, []);
        continue;
      }

      const learningOutcomeIds = learningOutcomes.map((lo) => lo.loId);

      const coursesByLearningOutcomeIds =
        await this.courseRepository.findCourseByLearningOutcomeIds({
          learningOutcomeIds,
          campusId,
          facultyId,
          isGenEd,
          academicYearSemesters,
        });

      const courseMatches: CourseWithLearningOutcomeV2Match[] = [];

      for (const [
        learningOutcomeId,
        courses,
      ] of coursesByLearningOutcomeIds.entries()) {
        const matchingLearningOutcome = learningOutcomes.find(
          (lo) => lo.loId === learningOutcomeId,
        );

        if (matchingLearningOutcome) {
          for (const course of courses) {
            const existingCourseMatch = courseMatches.find(
              (match) => match.courseId === course.courseId,
            );

            if (existingCourseMatch) {
              existingCourseMatch.learningOutcomes.push(
                matchingLearningOutcome,
              );
            } else {
              courseMatches.push({
                ...course,
                learningOutcomeMatch: {
                  ...matchingLearningOutcome,
                  similarityScore: matchingLearningOutcome.similarityScore,
                },
                learningOutcomes: [matchingLearningOutcome],
              });
            }
          }
        }
      }

      coursesBySkills.set(skill, courseMatches);
    }

    return coursesBySkills;
  }
}
