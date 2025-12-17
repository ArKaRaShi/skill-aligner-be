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

  async getCoursesWithLosBySkillsWithFilter({
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
    // TODO: Implement LLM filtering when enableLlmFilter is true
    if (enableLlmFilter) {
      console.warn('LLM filtering is not yet implemented');
    }
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

      // Retrieve courses by learning outcome IDs
      const coursesByLearningOutcomeIds =
        await this.courseRepository.findCourseByLearningOutcomeIds({
          learningOutcomeIds,
          campusId,
          facultyId,
          isGenEd,
          academicYearSemesters,
        });

      // Map and aggregate courses with their matching learning outcomes
      const courseMatches: CourseWithLearningOutcomeV2Match[] = [];

      for (const [
        learningOutcomeId,
        courses,
      ] of coursesByLearningOutcomeIds.entries()) {
        // Find the matching learning outcome to get similarity score
        const matchingLearningOutcome = learningOutcomes.find(
          (lo) => lo.loId === learningOutcomeId,
        );

        // If there's a matching learning outcome, associate it with the courses
        if (matchingLearningOutcome) {
          for (const course of courses) {
            const existingCourseMatch = courseMatches.find(
              (match) => match.courseId === course.courseId,
            );

            if (existingCourseMatch) {
              // Add to existing matched learning outcomes
              existingCourseMatch.matchedLearningOutcomes.push(
                matchingLearningOutcome,
              );
            } else {
              // Create new course match
              courseMatches.push({
                ...course,
                matchedLearningOutcomes: [matchingLearningOutcome],
                remainingLearningOutcomes: course.learningOutcomes.filter(
                  (lo) => lo.loId !== learningOutcomeId,
                ),
                allLearningOutcomes: course.learningOutcomes,
              });
            }
          }
        }
      }

      // Sort courses by highest similarity score but don't limit (preserve all courses)
      const sortedCourseMatches = courseMatches.sort((a, b) => {
        const aMaxScore = Math.max(
          ...a.matchedLearningOutcomes.map((lo) => lo.similarityScore),
        );
        const bMaxScore = Math.max(
          ...b.matchedLearningOutcomes.map((lo) => lo.similarityScore),
        );
        return bMaxScore - aMaxScore;
      });

      coursesBySkills.set(skill, sortedCourseMatches);
    }

    return coursesBySkills;
  }
}
