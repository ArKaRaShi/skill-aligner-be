import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';

import { Response } from 'express';
import { I_SSE_EMITTER_FACTORY_TOKEN } from 'src/shared/adapters/sse/sse-emitter.factory';
import { SseEmitterFactory } from 'src/shared/adapters/sse/sse-emitter.factory';
import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { QueryPipelinePromptConfig } from '../../../constants';
import type { QuestionClassificationPromptVersion } from '../../../prompts/question-classification';
import type { SkillExpansionPromptVersion } from '../../../prompts/skill-expansion';
import { StepSseEvent } from '../../../types/sse-event.type';
import { AnswerQuestionStreamUseCase } from '../../../use-cases/answer-question-stream.use-case';
import { AnswerQuestionUseCase } from '../../../use-cases/answer-question.use-case';
import { ClassifyQuestionUseCase } from '../../../use-cases/classify-question.use-case';
import { ExpandSkillsUseCase } from '../../../use-cases/expand-skills.use-case';
import { AnswerQuestionStreamUseCaseInput } from '../../../use-cases/inputs/answer-question-stream.use-case.input';
import { AnswerQuestionUseCaseInput } from '../../../use-cases/inputs/answer-question.use-case.input';
import { ClassifyQuestionUseCaseInput } from '../../../use-cases/inputs/classify-question.use-case.input';
import { ExpandSkillsUseCaseInput } from '../../../use-cases/inputs/expand-skills.use-case.input';
import { AnswerQuestionStreamRequestDto } from './dto/requests/answer-question-stream.request.dto';
import { AnswerQuestionRequestDto } from './dto/requests/answer-question.request.dto';
import { ClassifyQuestionRequestDto } from './dto/requests/classify-question.request.dto';
import { ExpandSkillsRequestDto } from './dto/requests/expand-skills.request.dto';
import { AnswerQuestionResponseDto } from './dto/responses/answer-question.response.dto';
import { ClassifyQuestionResponseDto } from './dto/responses/classify-question.response.dto';
import { ExpandSkillsResponseDto } from './dto/responses/expand-skills.response.dto';
import { CourseResponseMapper } from './mappers/course-response.mapper';

@Controller()
export class QueryProcessorController {
  // TODO: This must be wrapped in facade pattern if there are multiple use-cases
  constructor(
    @Inject(I_SSE_EMITTER_FACTORY_TOKEN)
    private readonly sseEmitterFactory: SseEmitterFactory,
    private readonly answerQuestionUseCase: AnswerQuestionUseCase,
    private readonly answerQuestionStreamUseCase: AnswerQuestionStreamUseCase,
    private readonly classifyQuestionUseCase: ClassifyQuestionUseCase,
    private readonly expandSkillsUseCase: ExpandSkillsUseCase,
  ) {}

  @Post('/query-processor/answer-question')
  @HttpCode(HttpStatus.OK)
  async answerQuestion(
    @Body() body: AnswerQuestionRequestDto,
  ): Promise<SuccessResponseDto<AnswerQuestionResponseDto>> {
    const { question, isGenEd } = body;
    const { answer, suggestQuestion, relatedCourses, questionLogId } =
      await this.answerQuestionUseCase.execute(
        new AnswerQuestionUseCaseInput({
          question,
          isGenEd,
        }),
      );

    const mappedResult: AnswerQuestionResponseDto = {
      answer,
      suggestQuestion,
      relatedCourses: CourseResponseMapper.toCourseOutputDto(relatedCourses),
      questionLogId,
    };

    return new SuccessResponseDto<AnswerQuestionResponseDto>({
      message: 'Question answered successfully',
      data: mappedResult,
    });
  }

  @Post('/query-processor/answer-question-stream')
  @HttpCode(HttpStatus.OK)
  async answerQuestionStream(
    @Body() body: AnswerQuestionStreamRequestDto,
    @Res({ passthrough: false }) response: Response,
  ): Promise<void> {
    console.log('[Controller] SSE stream request received:', body.question);

    // Create emitter using factory
    const emitter = this.sseEmitterFactory.create<StepSseEvent>(response);

    try {
      // Execute pipeline with emitter
      await this.answerQuestionStreamUseCase.execute(
        new AnswerQuestionStreamUseCaseInput(body),
        emitter,
      );
      console.log('[Controller] Pipeline completed successfully');
      emitter.complete();
    } catch (error) {
      console.error('[Controller] Pipeline error:', error);
      emitter.error(error as Error);
    }
  }

  @Post('/query-processor/expand-skills')
  @HttpCode(HttpStatus.OK)
  async expandSkills(
    @Body() body: ExpandSkillsRequestDto,
  ): Promise<SuccessResponseDto<ExpandSkillsResponseDto>> {
    const { question, promptVersion } = body;

    // Use configured default if promptVersion not provided
    const selectedPromptVersion = promptVersion
      ? (promptVersion as SkillExpansionPromptVersion)
      : QueryPipelinePromptConfig.SKILL_EXPANSION;

    const result = await this.expandSkillsUseCase.execute(
      new ExpandSkillsUseCaseInput({
        question,
        promptVersion: selectedPromptVersion,
      }),
    );

    const mappedResult: ExpandSkillsResponseDto = {
      skillItems: result.skillItems,
      llmInfo: {
        model: result.llmInfo.model,
        provider: result.llmInfo.provider,
        inputTokens: result.llmInfo.inputTokens,
        outputTokens: result.llmInfo.outputTokens,
      },
      tokenUsage: {
        model: result.tokenUsage.model,
        inputTokens: result.tokenUsage.inputTokens,
        outputTokens: result.tokenUsage.outputTokens,
      },
    };

    return new SuccessResponseDto<ExpandSkillsResponseDto>({
      message: 'Skills expanded successfully',
      data: mappedResult,
    });
  }

  @Post('/query-processor/classify-question')
  @HttpCode(HttpStatus.OK)
  async classifyQuestion(
    @Body() body: ClassifyQuestionRequestDto,
  ): Promise<SuccessResponseDto<ClassifyQuestionResponseDto>> {
    const { question, promptVersion } = body;

    // Use configured default if promptVersion not provided
    const selectedPromptVersion = promptVersion
      ? (promptVersion as QuestionClassificationPromptVersion)
      : QueryPipelinePromptConfig.CLASSIFICATION;

    const result = await this.classifyQuestionUseCase.execute(
      new ClassifyQuestionUseCaseInput({
        question,
        promptVersion: selectedPromptVersion,
      }),
    );

    const mappedResult: ClassifyQuestionResponseDto = {
      category: result.category,
      reason: result.reason,
      llmInfo: {
        model: result.llmInfo.model,
        provider: result.llmInfo.provider,
        inputTokens: result.llmInfo.inputTokens,
        outputTokens: result.llmInfo.outputTokens,
      },
      tokenUsage: {
        model: result.tokenUsage.model,
        inputTokens: result.tokenUsage.inputTokens,
        outputTokens: result.tokenUsage.outputTokens,
      },
    };

    return new SuccessResponseDto<ClassifyQuestionResponseDto>({
      message: 'Question classified successfully',
      data: mappedResult,
    });
  }
}
