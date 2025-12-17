import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import {
  AnswerSynthesizeInput,
  IAnswerSynthesisService,
} from '../../contracts/i-answer-synthesis-service.contract';
import { AnswerSynthesisPromptFactory } from '../../prompts/answer-synthesis';
import { AnswerSynthesisResult } from '../../types/answer-synthesis.type';
import { CourseClassificationResult } from '../../types/course-classification.type';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class AnswerSynthesisService implements IAnswerSynthesisService {
  private readonly logger = new Logger(AnswerSynthesisService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {}

  async synthesizeAnswer(
    input: AnswerSynthesizeInput,
  ): Promise<AnswerSynthesisResult> {
    const { question, promptVersion, queryProfile, classificationResult } =
      input;
    const context = this.buildContext(classificationResult, queryProfile);

    this.logger.log(
      `[AnswerSynthesis] Synthesizing answer for question: "${question}" using model: ${this.modelName}`,
    );

    this.logger.log(
      `[AnswerSynthesis] Context data sent to prompt: ${context}`,
    );

    const { getPrompts } = AnswerSynthesisPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
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

  private buildContext(
    classificationResult: CourseClassificationResult,
    queryProfile: QueryProfile,
  ): string {
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

    const encodedContext = encode(skillWithCourses);
    const encodedQueryProfile = encode(queryProfile);
    return `Classification Results:\n${encodedContext}\n\nUser Query Profile:\n${encodedQueryProfile}`;
  }
}
