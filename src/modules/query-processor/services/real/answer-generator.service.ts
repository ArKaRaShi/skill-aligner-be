import { Inject, Injectable } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import {
  GENERATE_ANSWER_SYSTEM_PROMPT,
  getGenerateAnswerUserPrompt,
} from '../../prompts/generate-answer.prompt';

@Injectable()
export class AnswerGeneratorService implements IAnswerGeneratorService {
  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<string> {
    const context = this.buildContext(skillCourseMatchMap);

    console.log(
      'Generated context for answer generation:',
      JSON.stringify(context, null, 2),
    );

    const text = await this.llmProviderClient.generateText({
      prompt: getGenerateAnswerUserPrompt(question, context),
      systemPrompt: GENERATE_ANSWER_SYSTEM_PROMPT,
    });

    return text;
  }

  private buildContext(
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): string {
    const formattedSkills = Array.from(skillCourseMatchMap.entries()).map(
      ([skill, courses]) => {
        if (!courses.length) {
          return [`Skill: ${skill}`, 'Courses:', '  - No courses found.'].join(
            '\n',
          );
        }

        const formattedCourses = courses
          .map((course) => {
            const courseName =
              course.subjectNameTh ??
              course.subjectNameEn ??
              course.subjectCode;

            const learningObjectives = course.cloMatches
              .map((clo) => {
                return (
                  clo.cleanedCLONameTh ??
                  clo.cleanedCLONameEn ??
                  clo.originalCLONameTh ??
                  clo.originalCLONameEn ??
                  null
                );
              })
              .filter((objective): objective is string => Boolean(objective));

            const learningObjectivesText =
              learningObjectives.length > 0
                ? learningObjectives
                    .map(
                      (objective, index) => `      ${index + 1}. ${objective}`,
                    )
                    .join('\n')
                : '      No learning objectives available.';

            return [
              `  - Name: ${courseName}`,
              '    Learning Objectives:',
              learningObjectivesText,
            ].join('\n');
          })
          .join('\n');

        return [`Skill: ${skill}`, 'Courses:', formattedCourses].join('\n');
      },
    );

    return formattedSkills.join('\n\n');
  }
}
