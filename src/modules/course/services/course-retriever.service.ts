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
  FindCoursesWithLosBySkillsWithFilterParams,
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
    embeddingConfiguration,
    threshold,
    topN,
    enableLlmFilter,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindCoursesWithLosBySkillsWithFilterParams): Promise<
    Map<string, CourseWithLearningOutcomeV2Match[]>
  > {
    // TODO: Implement LLM filtering when enableLlmFilter is true
    if (enableLlmFilter) {
      console.warn('LLM filtering is not yet implemented');
    }
    const learningOutcomesBySkills =
      await this.courseLearningOutcomeRepository.findLosBySkills({
        skills,
        embeddingConfiguration,
        threshold,
        topN,
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
              (match) => match.id === course.id,
            );

            const { courseLearningOutcomes, ...courseWithoutLearningOutcomes } =
              course;

            if (existingCourseMatch) {
              existingCourseMatch.matchedLearningOutcomes.push(
                matchingLearningOutcome,
              );
            } else {
              courseMatches.push({
                ...courseWithoutLearningOutcomes,
                matchedLearningOutcomes: [matchingLearningOutcome],
                remainingLearningOutcomes: courseLearningOutcomes.filter(
                  (lo) => lo.loId !== learningOutcomeId,
                ),
                allLearningOutcomes: courseLearningOutcomes,
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
