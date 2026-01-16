import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';

import { QueryPipelineConfig } from '../../constants/config.constant';
import {
  AnswerSynthesizeInput,
  IAnswerSynthesisService,
} from '../../contracts/i-answer-synthesis-service.contract';
import { AnswerSynthesisPromptFactory } from '../../prompts/answer-synthesis';
import { Language } from '../../schemas/query-profile-builder.schema';
import { AnswerSynthesisResult } from '../../types/answer-synthesis.type';
import { AggregatedCourseSkills } from '../../types/course-aggregation.type';

@Injectable()
export class AnswerSynthesisService implements IAnswerSynthesisService {
  private readonly logger = new Logger(AnswerSynthesisService.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {}

  async synthesizeAnswer(
    input: AnswerSynthesizeInput,
  ): Promise<AnswerSynthesisResult> {
    const { question, promptVersion, language, aggregatedCourseSkills } = input;
    const context = this.buildContext(aggregatedCourseSkills, language);

    this.logger.log(
      `[AnswerSynthesis] Synthesizing answer for question: "${question}" using model: ${this.modelName}`,
    );

    this.logger.log(
      `[AnswerSynthesis] Context data sent to prompt: ${context}`,
    );

    const { getPrompts } = AnswerSynthesisPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
    const synthesisPrompt = getUserPrompt(question, context);

    const llmResult = await this.llmRouter.generateText({
      prompt: synthesisPrompt,
      systemPrompt,
      model: this.modelName,
      timeout: QueryPipelineConfig.LLM_STEP_TIMEOUTS.ANSWER_SYNTHESIS,
    });

    this.logger.log(
      `[AnswerSynthesis] Generated synthesis: ${JSON.stringify(
        llmResult,
        null,
        2,
      )}`,
    );

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
      llmResult,
      llmResult.model,
      synthesisPrompt,
      systemPrompt,
      promptVersion,
      undefined, // no schema for generateText
    );

    const synthesisResult: AnswerSynthesisResult = {
      answerText: llmResult.text,
      question,
      llmInfo,
      tokenUsage,
    };

    return synthesisResult;
  }

  private buildContext(
    aggregatedCourseSkills: AggregatedCourseSkills[],
    language: Language,
  ): string {
    const courseBlocks = aggregatedCourseSkills.map((courseSkills) => {
      // Build matched evidence section with skill context
      const matchedEvidence = courseSkills.matchedSkills
        .map(
          (ms) => `[Mapped Skill: ${ms.skill}]
${ms.learningOutcomes.map((lo) => `- ${lo.cleanedName}`).join('\n')}`,
        )
        .join('\n\n');
      // ...
      // Build full context section
      const fullContext = courseSkills.courseLearningOutcomes
        .map((lo) => `- ${lo.cleanedName}`)
        .join('\n');

      return `COURSE: ${courseSkills.subjectName} (${courseSkills.subjectCode})
RELEVANCE SCORE: ${courseSkills.relevanceScore}

SECTION 1: MATCHED EVIDENCE (Why it was picked)
${matchedEvidence}

SECTION 2: FULL CONTEXT (Center of Gravity Check)
${fullContext}`;
    });

    // \n\n---\n\n creates a perfect, clear boundary
    return `${courseBlocks.join('\n\n---\n\n')}\n\nLanguage: ${language}`;
  }
}
