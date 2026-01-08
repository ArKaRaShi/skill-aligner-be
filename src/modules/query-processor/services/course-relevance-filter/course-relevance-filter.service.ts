import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';
import { z } from 'zod';

import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { ICourseRelevanceFilterService } from '../../contracts/i-course-relevance-filter-service.contract';
import {
  CourseRelevanceFilterPromptFactory,
  CourseRelevanceFilterPromptVersion,
} from '../../prompts/course-relevance-filter';
import {
  CourseRelevanceFilterResultSchema,
  CourseRelevanceFilterResultSchemaV2,
} from '../../schemas/course-relevance-filter.schema';
import { CourseWithLearningOutcomeV2MatchWithRelevance } from '../../types/course-aggregation.type';
import {
  CourseMatchMap,
  CourseRelevanceFilterItem,
  CourseRelevanceFilterItemV2,
  CourseRelevanceFilterResult,
  CourseRelevanceFilterResultV2,
} from '../../types/course-relevance-filter.type';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class CourseRelevanceFilterService
  implements ICourseRelevanceFilterService
{
  private readonly logger = new Logger(CourseRelevanceFilterService.name);
  /**
   * Minimum score for a course to be considered relevant
   * LLM returns scores 0-3 where:
   * - 0 = not relevant (dropped)
   * - 1, 2, 3 = relevant (with increasing relevance)
   */
  private readonly MIN_RELEVANCE_SCORE = 1;

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {}

  async batchFilterCoursesBySkill(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: CourseMatchMap,
    promptVersion: CourseRelevanceFilterPromptVersion,
  ): Promise<CourseRelevanceFilterResult[]> {
    const { getPrompts } = CourseRelevanceFilterPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);

    const results: CourseRelevanceFilterResult[] = await Promise.all(
      Array.from(skillCourseMatchMap.entries()).map(
        async ([skill, courses]: [
          string,
          CourseWithLearningOutcomeV2Match[],
        ]) => {
          if (courses.length === 0) {
            this.logger.log(
              `[CourseRelevanceFilter] No courses to filter for skill ${skill}. Skipping LLM call.`,
            );
            return this.buildEmptyFilterResult(promptVersion);
          }

          this.logger.log(
            `[CourseRelevanceFilter] Skill: ${skill} has ${courses.length} matched courses.`,
          );

          const coursesData = this.buildCoursesData(courses);
          this.logger.log(
            `[CourseRelevanceFilter] Courses data for skill ${skill}: ${coursesData}`,
          );

          const llmResult = await this.callLlmRelevanceFilter(
            getUserPrompt(question, skill, coursesData),
            systemPrompt,
            CourseRelevanceFilterResultSchema,
          );

          this.logger.log(
            `[CourseRelevanceFilter] Generated relevance filter for skill "${skill}": ${JSON.stringify(
              llmResult.object,
              null,
              2,
            )}`,
          );

          const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
            llmResult,
            llmResult.model,
            getUserPrompt(question, skill, coursesData),
            systemPrompt,
            promptVersion,
            'CourseRelevanceFilterResultSchema',
          );

          const courseItems: CourseRelevanceFilterItem[] =
            this.mapToCourseItems(llmResult.object.courses);

          const { relevantCourses, nonRelevantCourses } =
            this.categorizeCoursesByDecision(courses, courseItems, skill);

          return this.buildFilterResult(
            skill,
            relevantCourses,
            nonRelevantCourses,
            llmInfo,
            tokenUsage,
          );
        },
      ),
    );

    return results;
  }

  private buildCoursesData(
    courses: CourseWithLearningOutcomeV2Match[],
  ): string {
    const coursesData: {
      courseName: string;
      learningOutcomes: string[];
    }[] = [];
    for (const course of courses) {
      coursesData.push({
        courseName: course.subjectName,
        learningOutcomes: course.allLearningOutcomes.map(
          (lo) => lo.cleanedName,
        ),
      });
    }
    return encode(coursesData);
  }

  async batchFilterCoursesBySkillV2(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: CourseMatchMap,
    promptVersion: CourseRelevanceFilterPromptVersion,
  ): Promise<CourseRelevanceFilterResultV2[]> {
    const { getPrompts } = CourseRelevanceFilterPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);

    const results: CourseRelevanceFilterResultV2[] = await Promise.all(
      Array.from(skillCourseMatchMap.entries()).map(
        async ([skill, courses]: [
          string,
          CourseWithLearningOutcomeV2Match[],
        ]) => {
          if (courses.length === 0) {
            this.logger.log(
              `[CourseRelevanceFilterV2] No courses to filter for skill: "${skill}". Skipping LLM call.`,
            );
            return this.buildEmptyFilterResultV2(promptVersion);
          }

          this.logger.log(
            `[CourseRelevanceFilterV2] Skill: "${skill}" has ${courses.length} matched courses.`,
          );

          const coursesData = this.buildCoursesDataV2(courses);
          this.logger.log(
            `[CourseRelevanceFilterV2] Courses data for skill "${skill}": ${coursesData}`,
          );

          const llmResult = await this.callLlmRelevanceFilter(
            getUserPrompt(question, skill, coursesData),
            systemPrompt,
            CourseRelevanceFilterResultSchemaV2,
          );

          this.logger.log(
            `[CourseRelevanceFilterV2] Generated relevance filter for skill "${skill}": ${JSON.stringify(
              llmResult.object,
              null,
              2,
            )}`,
          );

          const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
            llmResult,
            llmResult.model,
            getUserPrompt(question, skill, coursesData),
            systemPrompt,
            promptVersion,
            'CourseRelevanceFilterResultSchemaV2',
          );

          const courseItems: CourseRelevanceFilterItemV2[] =
            this.mapToCourseItemsV2(llmResult.object.courses);

          const { relevantCourses, droppedCourses, missingCourses } =
            this.categorizeCoursesByScore(courses, courseItems, skill);

          this.logCategorizationV2(skill, missingCourses, droppedCourses);

          return this.buildFilterResultV2(
            skill,
            relevantCourses,
            droppedCourses,
            missingCourses,
            llmInfo,
            tokenUsage,
          );
        },
      ),
    );

    return results;
  }

  private buildCoursesDataV2(
    courses: CourseWithLearningOutcomeV2Match[],
  ): string {
    const coursesData: {
      course_code: string;
      course_name: string;
      learning_outcomes: string[];
    }[] = [];
    for (const course of courses) {
      coursesData.push({
        course_code: course.subjectCode,
        course_name: course.subjectName,
        learning_outcomes: course.allLearningOutcomes.map(
          (lo) => lo.cleanedName,
        ),
      });
    }
    return encode(coursesData);
  }

  // =========================================================================
  // PRIVATE HELPER METHODS - Separation of Concerns
  // =========================================================================

  /**
   * Calls the LLM service for relevance filtering
   * Handles LLM communication concern
   */
  private async callLlmRelevanceFilter<TSchema extends z.ZodTypeAny>(
    userPrompt: string,
    systemPrompt: string,
    schema: TSchema,
  ) {
    return this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema,
      model: this.modelName,
    });
  }

  /**
   * Builds empty result for V1 filter (when no courses to process)
   */
  private buildEmptyFilterResult(
    promptVersion: string,
  ): CourseRelevanceFilterResult {
    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildEmpty(
      this.modelName,
      promptVersion,
    );
    return {
      relevantCoursesBySkill: new Map(),
      nonRelevantCoursesBySkill: new Map(),
      llmInfo,
      tokenUsage,
    };
  }

  /**
   * Builds empty result for V2 filter (when no courses to process)
   */
  private buildEmptyFilterResultV2(
    promptVersion: string,
  ): CourseRelevanceFilterResultV2 {
    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildEmpty(
      this.modelName,
      promptVersion,
    );
    return {
      llmAcceptedCoursesBySkill: new Map(),
      llmRejectedCoursesBySkill: new Map(),
      llmMissingCoursesBySkill: new Map(),
      llmInfo,
      tokenUsage,
    };
  }

  /**
   * Maps LLM response to V1 course items
   * Handles data transformation concern
   */
  private mapToCourseItems(courses: unknown[]): CourseRelevanceFilterItem[] {
    return courses.map((course: unknown) => ({
      courseName: (course as { course_name: string }).course_name,
      decision: (course as { decision: 'yes' | 'no' }).decision,
      reason: (course as { reason: string }).reason,
    }));
  }

  /**
   * Maps LLM response to V2 course items
   * Handles data transformation concern
   */
  private mapToCourseItemsV2(
    courses: unknown[],
  ): CourseRelevanceFilterItemV2[] {
    return courses.map((course: unknown) => ({
      courseCode: (course as { course_code: string }).course_code,
      courseName: (course as { course_name: string }).course_name,
      score: (course as { score: number }).score,
      reason: (course as { reason: string }).reason,
    }));
  }

  /**
   * Categorizes courses by binary decision (yes/no) - V1 logic
   * Handles course categorization concern
   */
  private categorizeCoursesByDecision(
    courses: CourseWithLearningOutcomeV2Match[],
    courseItems: CourseRelevanceFilterItem[],
    skill: string,
  ): {
    relevantCourses: CourseWithLearningOutcomeV2Match[];
    nonRelevantCourses: CourseWithLearningOutcomeV2Match[];
  } {
    const relevantCourses = courses.filter((course) => {
      const filterDecision = courseItems.find(
        (item) => item.courseName === course.subjectName,
      );

      if (!filterDecision) {
        this.logger.warn(
          `[CourseRelevanceFilter] Course "${course.subjectName}" for skill "${skill}" not found in LLM response for skill "${skill}"`,
        );
      }

      return filterDecision?.decision === 'yes';
    });

    const nonRelevantCourses = courses.filter((course) => {
      const filterDecision = courseItems.find(
        (item) => item.courseName === course.subjectName,
      );

      if (!filterDecision) {
        this.logger.warn(
          `[CourseRelevanceFilter] Course "${course.subjectName}" for skill "${skill}" not found in LLM response for skill "${skill}"`,
        );
      }

      return filterDecision?.decision === 'no';
    });

    return { relevantCourses, nonRelevantCourses };
  }

  /**
   * Categorizes courses by score (0 vs >0) and tracks missing - V2 logic
   * Handles course categorization concern
   */
  private categorizeCoursesByScore(
    courses: CourseWithLearningOutcomeV2Match[],
    courseItems: CourseRelevanceFilterItemV2[],
    skill: string,
  ): {
    relevantCourses: CourseWithLearningOutcomeV2MatchWithRelevance[];
    droppedCourses: CourseWithLearningOutcomeV2MatchWithRelevance[];
    missingCourses: CourseWithLearningOutcomeV2MatchWithRelevance[];
  } {
    // Create a Map for O(1) lookup by course code and name
    const courseItemMap = new Map<string, CourseRelevanceFilterItemV2>();
    for (const item of courseItems) {
      courseItemMap.set(`${item.courseCode}|${item.courseName}`, item);
    }

    // Track missing courses separately from dropped courses
    const missingCourses: CourseWithLearningOutcomeV2MatchWithRelevance[] = [];
    const processedCourses: CourseWithLearningOutcomeV2MatchWithRelevance[] =
      [];

    for (const course of courses) {
      const courseItem = courseItemMap.get(
        `${course.subjectCode}|${course.subjectName}`,
      );

      if (courseItem) {
        // Course was in LLM response, include with score
        processedCourses.push({
          ...course,
          score: courseItem.score,
          reason: courseItem.reason,
        });
      } else {
        this.logger.warn(
          `[CourseRelevanceFilterV2] Course "${course.subjectCode} - ${course.subjectName}" for skill "${skill}" not found in LLM response`,
        );
        // Track as missing (not returned by LLM)
        missingCourses.push({
          ...course,
          score: 0,
          reason: 'Not found in LLM response',
        });
      }
    }

    // Filter processed courses into dropped (score=0) and relevant (score>0)
    const [droppedCourses, relevantCourses] = processedCourses.reduce<
      [
        CourseWithLearningOutcomeV2MatchWithRelevance[],
        CourseWithLearningOutcomeV2MatchWithRelevance[],
      ]
    >(
      (acc, course) => {
        if (course.score < this.MIN_RELEVANCE_SCORE) {
          acc[0].push(course);
        } else {
          acc[1].push(course);
        }
        return acc;
      },
      [[], []],
    );

    return { relevantCourses, droppedCourses, missingCourses };
  }

  /**
   * Logs V2 categorization details (missing and dropped courses)
   * Handles logging concern
   */
  private logCategorizationV2(
    skill: string,
    missingCourses: CourseWithLearningOutcomeV2MatchWithRelevance[],
    droppedCourses: CourseWithLearningOutcomeV2MatchWithRelevance[],
  ): void {
    if (missingCourses.length > 0) {
      this.logger.log(
        `[CourseRelevanceFilterV2] Missing ${missingCourses.length} courses not in LLM response for skill "${skill}": ${JSON.stringify(
          missingCourses.map((c) => ({
            courseCode: c.subjectCode,
            courseName: c.subjectName,
            score: c.score,
            reason: c.reason,
          })),
          null,
          2,
        )}`,
      );
    }

    if (droppedCourses.length > 0) {
      this.logger.log(
        `[CourseRelevanceFilterV2] Dropped ${droppedCourses.length} courses with score 0 for skill "${skill}": ${JSON.stringify(
          droppedCourses.map((c) => ({
            courseCode: c.subjectCode,
            courseName: c.subjectName,
            score: c.score,
            reason: c.reason,
          })),
          null,
          2,
        )}`,
      );
    }
  }

  /**
   * Builds final result for V1 filter
   * Handles result assembly concern
   */
  private buildFilterResult(
    skill: string,
    relevantCourses: CourseWithLearningOutcomeV2Match[],
    nonRelevantCourses: CourseWithLearningOutcomeV2Match[],
    llmInfo: LlmInfo,
    tokenUsage: TokenUsage,
  ): CourseRelevanceFilterResult {
    const relevantCoursesBySkillMap = new Map<
      string,
      CourseWithLearningOutcomeV2Match[]
    >();
    const nonRelevantCoursesBySkillMap = new Map<
      string,
      CourseWithLearningOutcomeV2Match[]
    >();

    relevantCoursesBySkillMap.set(skill, relevantCourses);
    nonRelevantCoursesBySkillMap.set(skill, nonRelevantCourses);

    return {
      relevantCoursesBySkill: relevantCoursesBySkillMap,
      nonRelevantCoursesBySkill: nonRelevantCoursesBySkillMap,
      llmInfo,
      tokenUsage,
    };
  }

  /**
   * Builds final result for V2 filter
   * Handles result assembly concern
   */
  private buildFilterResultV2(
    skill: string,
    relevantCourses: CourseWithLearningOutcomeV2MatchWithRelevance[],
    droppedCourses: CourseWithLearningOutcomeV2MatchWithRelevance[],
    missingCourses: CourseWithLearningOutcomeV2MatchWithRelevance[],
    llmInfo: LlmInfo,
    tokenUsage: TokenUsage,
  ): CourseRelevanceFilterResultV2 {
    const llmAcceptedCoursesBySkillMap = new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >();
    llmAcceptedCoursesBySkillMap.set(skill, relevantCourses);

    const llmRejectedCoursesBySkillMap = new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >();
    llmRejectedCoursesBySkillMap.set(skill, droppedCourses);

    const llmMissingCoursesBySkillMap = new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >();
    llmMissingCoursesBySkillMap.set(skill, missingCourses);

    return {
      llmAcceptedCoursesBySkill: llmAcceptedCoursesBySkillMap,
      llmRejectedCoursesBySkill: llmRejectedCoursesBySkillMap,
      llmMissingCoursesBySkill: llmMissingCoursesBySkillMap,
      llmInfo,
      tokenUsage,
    };
  }
}
