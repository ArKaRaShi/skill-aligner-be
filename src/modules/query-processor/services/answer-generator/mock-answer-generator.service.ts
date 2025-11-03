import { Injectable } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import { LlmAnswerGeneration } from '../../schemas/answer-generation.schema';
import { AnswerGeneration } from '../../types/answer-generation.type';
import { BaseAnswerGeneratorService } from './base-answer-generator.service';

@Injectable()
export class MockAnswerGeneratorService
  extends BaseAnswerGeneratorService
  implements IAnswerGeneratorService
{
  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration> {
    // Mock implementation that returns a fixed answer
    const context = Array.from(skillCourseMatchMap.entries())
      .map(([skill, courses]) => {
        const courseList = courses
          .map(
            (course) =>
              `- ${course.subjectNameEn ?? course.subjectCode} (${course.cloMatches[0].similarityScore.toFixed(
                2,
              )})`,
          )
          .join('\n');
        return `Skill: ${skill}\nCourses:\n${courseList || '  - No courses found.'}`;
      })
      .join('\n\n');

    const mockAnswer: LlmAnswerGeneration = {
      includes: [],
      excludes: [],
      answerText: `This is a mock answer for the question: "${question}". Based on the provided context, the relevant skills and courses have been identified.`,
    };

    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate async delay

    return {
      ...mockAnswer,
      rawQuestion: question,
      context: context,
    };
  }
}
