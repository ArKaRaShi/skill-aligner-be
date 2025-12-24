import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';

import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { ICourseRelevanceFilterService } from '../../contracts/i-course-relevance-filter-service.contract';
import {
  CourseRelevanceFilterPromptFactory,
  CourseRelevanceFilterPromptVersion,
} from '../../prompts/course-relevance-filter';
import { CourseRelevanceFilterResultSchema } from '../../schemas/course-relevance-filter.schema';
import {
  CourseRelevanceFilterItem,
  CourseRelevanceFilterResult,
} from '../../types/course-relevance-filter.type';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class CourseRelevanceFilterService
  implements ICourseRelevanceFilterService
{
  private readonly logger = new Logger(CourseRelevanceFilterService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
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
            return {
              relevantCoursesBySkill: new Map<
                string,
                CourseWithLearningOutcomeV2Match[]
              >(),
              nonRelevantCoursesBySkill: new Map<
                string,
                CourseWithLearningOutcomeV2Match[]
              >(),
              model: this.modelName,
              userPrompt: '',
              systemPrompt: '',
              promptVersion,
            };
          }

          this.logger.log(
            `[CourseRelevanceFilter] Skill: "${skill}" has ${courses.length} matched courses.`,
          );

          const coursesData = this.buildCoursesData(courses);
          this.logger.log(
            `[CourseRelevanceFilter] Courses data for skill "${skill}": ${coursesData}`,
          );

          const { object } = await this.llmProviderClient.generateObject({
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
            model: this.modelName,
            userPrompt: getUserPrompt(question, skill, coursesData),
            systemPrompt,
            promptVersion,
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
}
