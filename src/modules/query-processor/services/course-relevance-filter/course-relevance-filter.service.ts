import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/core/gpt-llm/contracts/i-llm-router-service.contract';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import {
  CourseWithLearningOutcomeV2Match,
  CourseWithLearningOutcomeV2MatchWithScore,
} from 'src/modules/course/types/course.type';

import { ICourseRelevanceFilterService } from '../../contracts/i-course-relevance-filter-service.contract';
import {
  CourseRelevanceFilterPromptFactory,
  CourseRelevanceFilterPromptVersion,
} from '../../prompts/course-relevance-filter';
import {
  CourseRelevanceFilterResultSchema,
  CourseRelevanceFilterResultSchemaV2,
} from '../../schemas/course-relevance-filter.schema';
import {
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

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {}

  async batchFilterCoursesBySkill(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
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
              `[CourseRelevanceFilter] No courses to filter for skill: "${skill}". Skipping LLM call.`,
            );
            const tokenUsage: TokenUsage = {
              model: this.modelName,
              inputTokens: 0,
              outputTokens: 0,
            };
            const llmInfo: LlmInfo = {
              model: this.modelName,
              userPrompt: '',
              systemPrompt: '',
              promptVersion,
            };
            return {
              relevantCoursesBySkill: new Map<
                string,
                CourseWithLearningOutcomeV2Match[]
              >(),
              nonRelevantCoursesBySkill: new Map<
                string,
                CourseWithLearningOutcomeV2Match[]
              >(),
              llmInfo,
              tokenUsage,
            };
          }

          this.logger.log(
            `[CourseRelevanceFilter] Skill: "${skill}" has ${courses.length} matched courses.`,
          );

          const coursesData = this.buildCoursesData(courses);
          this.logger.log(
            `[CourseRelevanceFilter] Courses data for skill "${skill}": ${coursesData}`,
          );

          const { object, inputTokens, outputTokens } =
            await this.llmRouter.generateObject({
              prompt: getUserPrompt(question, skill, coursesData),
              systemPrompt,
              schema: CourseRelevanceFilterResultSchema,
              model: this.modelName,
            });

          this.logger.log(
            `[CourseRelevanceFilter] Generated relevance filter for skill "${skill}": ${JSON.stringify(
              object,
              null,
              2,
            )}`,
          );

          const tokenUsage: TokenUsage = {
            model: this.modelName,
            inputTokens,
            outputTokens,
          };

          const llmInfo: LlmInfo = {
            model: this.modelName,
            userPrompt: getUserPrompt(question, skill, coursesData),
            systemPrompt,
            promptVersion,
          };

          const courseItems: CourseRelevanceFilterItem[] = object.courses.map(
            (course) => ({
              courseName: course.course_name,
              decision: course.decision,
              reason: course.reason,
            }),
          );

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
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
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
            const tokenUsage: TokenUsage = {
              model: this.modelName,
              inputTokens: 0,
              outputTokens: 0,
            };
            const llmInfo: LlmInfo = {
              model: this.modelName,
              userPrompt: '',
              systemPrompt: '',
              promptVersion,
            };
            return {
              relevantCoursesBySkill: new Map<
                string,
                CourseWithLearningOutcomeV2MatchWithScore[]
              >(),
              llmInfo,
              tokenUsage,
            };
          }

          this.logger.log(
            `[CourseRelevanceFilterV2] Skill: "${skill}" has ${courses.length} matched courses.`,
          );

          const coursesData = this.buildCoursesDataV2(courses);
          this.logger.log(
            `[CourseRelevanceFilterV2] Courses data for skill "${skill}": ${coursesData}`,
          );

          const { object, inputTokens, outputTokens } =
            await this.llmRouter.generateObject({
              prompt: getUserPrompt(question, skill, coursesData),
              systemPrompt,
              schema: CourseRelevanceFilterResultSchemaV2,
              model: this.modelName,
            });

          this.logger.log(
            `[CourseRelevanceFilterV2] Generated relevance filter for skill "${skill}": ${JSON.stringify(
              object,
              null,
              2,
            )}`,
          );

          const tokenUsage: TokenUsage = {
            model: this.modelName,
            inputTokens,
            outputTokens,
          };

          const llmInfo: LlmInfo = {
            model: this.modelName,
            userPrompt: getUserPrompt(question, skill, coursesData),
            systemPrompt,
            promptVersion,
          };

          // Process the LLM response to add scores to courses
          const courseItems: CourseRelevanceFilterItemV2[] = object.courses.map(
            (course) => ({
              courseCode: course.course_code,
              courseName: course.course_name,
              score: course.score,
              reason: course.reason,
            }),
          );

          // Create a Map for O(1) lookup by course code and name
          const courseItemMap = new Map<string, CourseRelevanceFilterItemV2>();
          for (const item of courseItems) {
            courseItemMap.set(`${item.courseCode}|${item.courseName}`, item);
          }

          // Create courses with scores by matching original courses with LLM response
          const coursesWithScores: CourseWithLearningOutcomeV2MatchWithScore[] =
            courses.map((course) => {
              const courseItem = courseItemMap.get(
                `${course.subjectCode}|${course.subjectName}`,
              );

              if (!courseItem) {
                this.logger.warn(
                  `[CourseRelevanceFilterV2] Course "${course.subjectCode} - ${course.subjectName}" for skill "${skill}" not found in LLM response`,
                );
                // Default to score 0 if not found in LLM response
                return {
                  ...course,
                  score: 0,
                  reason: 'Not found in LLM response',
                };
              }

              return {
                ...course,
                score: courseItem.score,
                reason: courseItem.reason,
              };
            });

          // Filter out courses with score 0 and log them
          const [droppedCourses, filteredCoursesWithScores] =
            coursesWithScores.reduce<
              [
                CourseWithLearningOutcomeV2MatchWithScore[],
                CourseWithLearningOutcomeV2MatchWithScore[],
              ]
            >(
              (acc, course) => {
                if (course.score === 0) {
                  acc[0].push(course);
                } else {
                  acc[1].push(course);
                }
                return acc;
              },
              [[], []],
            );

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

          const relevantCoursesBySkillMap = new Map<
            string,
            CourseWithLearningOutcomeV2MatchWithScore[]
          >();
          relevantCoursesBySkillMap.set(skill, filteredCoursesWithScores);

          return {
            relevantCoursesBySkill: relevantCoursesBySkillMap,
            llmInfo,
            tokenUsage,
          };
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
}
