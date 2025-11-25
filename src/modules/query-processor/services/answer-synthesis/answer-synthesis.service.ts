import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IAnswerSynthesisService } from '../../contracts/i-answer-synthesis-service.contract';
import { AnswerSynthesisPromptFactory } from '../../prompts/answer-synthesis';
import { AnswerSynthesisResult } from '../../types/answer-synthesis.type';
import { CourseClassificationResult } from '../../types/course-classification.type';

@Injectable()
export class AnswerSynthesisService implements IAnswerSynthesisService {
  private readonly logger = new Logger(AnswerSynthesisService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {}

  async synthesizeAnswer(
    question: string,
    classificationResult: CourseClassificationResult,
  ): Promise<AnswerSynthesisResult> {
    const skillWithCourses = classificationResult.classifications.map(
      (classification) => {
        const includedCourses = classification.courses
          .filter((course) => course.decision === 'include')
          .map((course) => ({
            courseName: course.name,
            decision: course.decision,
            reason: course.reason,
          }));

        return {
          skill: classification.skill,
          courses: includedCourses,
        };
      },
    );

    this.logger.log(
      `[AnswerSynthesis] Synthesizing answer for question: "${question}" using model: ${this.modelName}`,
    );

    this.logger.log(
      `[AnswerSynthesis] Skill data sent to prompt: ${JSON.stringify(
        skillWithCourses,
        null,
        2,
      )}`,
    );

    const context = encode(skillWithCourses);

    this.logger.log(`[AnswerSynthesis] Encoded context ${context}`);

    const { getPrompts } = AnswerSynthesisPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v3');
    const synthesisPrompt = getUserPrompt(question, context);

    const llmResult = await this.llmProviderClient.generateText({
      prompt: synthesisPrompt,
      systemPrompt,
      model: this.modelName,
    });

    this.logger.log(
      `[AnswerSynthesis] Generated synthesis: ${JSON.stringify(
        llmResult,
        null,
        2,
      )}`,
    );

    let includeCount = 0;
    let excludeCount = 0;

    for (const { courses } of classificationResult.classifications) {
      for (const course of courses) {
        if (course.decision === 'include') {
          includeCount++;
        } else if (course.decision === 'exclude') {
          excludeCount++;
        }
      }
    }

    const synthesisResult: AnswerSynthesisResult = {
      answerText: llmResult.text,
      question,
      classificationCount: classificationResult.classifications.reduce(
        (total, classification) => total + classification.courses.length,
        0,
      ),
      includeCount,
      excludeCount,
    };

    return synthesisResult;
  }
}
