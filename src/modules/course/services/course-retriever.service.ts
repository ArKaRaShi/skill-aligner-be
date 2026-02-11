import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from '../contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from '../contracts/i-course-repository.contract';
import {
  CourseRetrieverOutput,
  CoursesByQueryOutput,
  FindCoursesWithLosBySkillsWithFilterParams,
  FindLosByQueryWithFilterParams,
  ICourseRetrieverService,
} from '../contracts/i-course-retriever-service.contract';
import { FilterLoPromptFactory } from '../prompts';
import { FilterLoSchema, LlmFilterLoItem } from '../schemas/filter-lo.schema';
import { MatchedLearningOutcome } from '../types/course-learning-outcome-v2.type';
import { CourseWithLearningOutcomeV2Match } from '../types/course.type';
import { FilterLoItem } from '../types/filter-lo.type';

@Injectable()
export class CourseRetrieverService implements ICourseRetrieverService {
  private readonly logger = new Logger(CourseRetrieverService.name);
  private readonly filterLoPromptFactory = FilterLoPromptFactory();

  constructor(
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly embeddingModel: string,
    @Optional() private readonly embeddingProvider: string = 'local',
    private readonly filterLoLlmModel: string,
  ) {}

  async getCoursesWithLosBySkillsWithFilter({
    skills,
    loThreshold,
    topNLos,
    enableLlmFilter,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
    embeddingModel,
  }: FindCoursesWithLosBySkillsWithFilterParams): Promise<CourseRetrieverOutput> {
    this.logger.debug(`Retrieving courses for skills: ${skills.join(', ')}`);
    const repositoryResult =
      await this.courseLearningOutcomeRepository.findLosBySkills({
        skills,
        embeddingConfiguration: {
          model: embeddingModel ?? this.embeddingModel,
          provider: this.embeddingProvider,
        },
        threshold: loThreshold,
        topN: topNLos,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });
    let learningOutcomesBySkills = repositoryResult.losBySkill;
    this.logger.debug(
      `Retrieved learning outcomes for skills: ${[
        ...learningOutcomesBySkills.keys(),
      ].join(', ')}`,
    );

    // Optionally filter non-relevant learning outcomes using LLM
    if (enableLlmFilter) {
      this.logger.debug(`Filtering non-relevant learning outcomes using LLM`);
      learningOutcomesBySkills =
        await this.filterNonRelevantLearningOutcomesForSkills(
          learningOutcomesBySkills,
        );
    }

    // Now, fan out to get courses for each skill's learning outcomes
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
      this.logger.debug(
        `Retrieving courses for skill: ${skill} with LO IDs: ${learningOutcomeIds.join(', ')}`,
      );
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

    this.logger.debug(`Completed course retrieval for all skills`);

    return {
      coursesBySkill: coursesBySkills,
      embeddingUsage: repositoryResult.embeddingUsage,
    };
  }

  async getCoursesByQuery({
    query,
    loThreshold,
    topNLos,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
    embeddingModel,
  }: FindLosByQueryWithFilterParams): Promise<CoursesByQueryOutput> {
    this.logger.debug(`Retrieving courses for query: ${query}`);

    const repositoryResult =
      await this.courseLearningOutcomeRepository.findLosByQuery({
        query,
        embeddingConfiguration: {
          model: embeddingModel ?? this.embeddingModel,
          provider: this.embeddingProvider,
        },
        threshold: loThreshold,
        topN: topNLos,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });

    const learningOutcomes = repositoryResult.learningOutcomes;
    this.logger.debug(
      `Retrieved ${learningOutcomes.length} learning outcomes for query`,
    );

    // No learning outcomes found, return empty courses array
    if (learningOutcomes.length === 0) {
      return {
        courses: [],
        embeddingUsage: repositoryResult.embeddingUsage,
      };
    }

    // Get courses for the matched learning outcomes
    const learningOutcomeIds = learningOutcomes.map((lo) => lo.loId);
    this.logger.debug(
      `Retrieving courses for query with LO IDs: ${learningOutcomeIds.join(', ')}`,
    );

    const coursesByLearningOutcomeIds =
      await this.courseRepository.findCourseByLearningOutcomeIds({
        learningOutcomeIds,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });

    // Aggregate courses with their matching learning outcomes
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

    // Sort courses by highest similarity score
    const sortedCourseMatches = courseMatches.sort((a, b) => {
      const aMaxScore = Math.max(
        ...a.matchedLearningOutcomes.map((lo) => lo.similarityScore),
      );
      const bMaxScore = Math.max(
        ...b.matchedLearningOutcomes.map((lo) => lo.similarityScore),
      );
      return bMaxScore - aMaxScore;
    });

    this.logger.debug(
      `Completed course retrieval for query: ${query}, found ${sortedCourseMatches.length} courses`,
    );

    return {
      courses: sortedCourseMatches,
      embeddingUsage: repositoryResult.embeddingUsage,
    };
  }

  /**
   * Filters non-relevant learning outcomes for each skill using LLM.
   * @param learningOutcomesBySkills Map of skills to their matched learning outcomes
   * @returns Map of skills to their filtered relevant learning outcomes
   */
  private async filterNonRelevantLearningOutcomesForSkills(
    learningOutcomesBySkills: Map<string, MatchedLearningOutcome[]>,
  ): Promise<Map<string, MatchedLearningOutcome[]>> {
    // Create an array of promises to process each skill in parallel
    const skillProcessingPromises = Array.from(
      learningOutcomesBySkills.entries(),
    ).map(async ([skill, learningOutcomes]) => {
      const minimalLearningOutcomes = learningOutcomes.map((lo) => ({
        learning_outcome: lo.cleanedName,
      }));

      const encodedLoList = JSON.stringify(minimalLearningOutcomes, null, 2);

      const { getUserPrompt, systemPrompt } =
        this.filterLoPromptFactory.getPrompts('v2');

      // Call LLM to filter learning outcomes
      const { object } = await this.llmRouter.generateObject({
        prompt: getUserPrompt(skill, encodedLoList),
        systemPrompt: systemPrompt,
        schema: FilterLoSchema,
        model: this.filterLoLlmModel,
      });

      const filteredLos: FilterLoItem[] = object.learning_outcomes.map(
        (lo: LlmFilterLoItem) => ({
          learningOutcome: lo.learning_outcome,
          decision: lo.decision,
          reason: lo.reason,
        }),
      );
      const mappedFilteredLos = new Map<string, FilterLoItem>();
      for (const lo of filteredLos) {
        mappedFilteredLos.set(lo.learningOutcome, lo);
      }

      const filteredLosForSkill: MatchedLearningOutcome[] = [];
      for (const lo of learningOutcomes) {
        const filterResult = mappedFilteredLos.get(lo.cleanedName);
        if (!filterResult) {
          this.logger.warn(
            `No filter result found for learning outcome: ${lo.cleanedName}`,
          );
          continue;
        }
        if (filterResult.decision === 'yes') {
          filteredLosForSkill.push(lo);
        } else {
          this.logger.log(
            `Filtered out learning outcome: ${lo.cleanedName} for skill: ${skill} with reason: ${filterResult.reason}`,
          );
        }
      }

      return { skill, filteredLosForSkill };
    });

    // Wait for all skill processing to complete
    const results = await Promise.all(skillProcessingPromises);

    // Reconstruct the map with filtered results
    const filteredLearningOutcomesBySkills = new Map<
      string,
      MatchedLearningOutcome[]
    >();
    for (const { skill, filteredLosForSkill } of results) {
      filteredLearningOutcomesBySkills.set(skill, filteredLosForSkill);
    }

    return filteredLearningOutcomesBySkills;
  }
}
