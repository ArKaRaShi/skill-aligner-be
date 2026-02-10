import { Inject, Injectable, Logger } from '@nestjs/common';

import { AppException } from 'src/shared/kernel/exception/app-exception';
import { ErrorCode } from 'src/shared/kernel/exception/exception.constant';

import {
  I_QUESTION_LOG_REPOSITORY_TOKEN,
  type IQuestionLogRepository,
} from 'src/modules/question-analyses/contracts/repositories/i-question-log-repository.contract';

import {
  I_COURSE_CLICK_LOG_REPOSITORY_TOKEN,
  type ICourseClickLogRepository,
} from '../contracts/i-course-click-log-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  type ICourseRepository,
} from '../contracts/i-course-repository.contract';
import type {
  LogCourseClickUseCaseInput,
  LogCourseClickUseCaseOutput,
} from '../use-cases/types/log-course-click.use-case.type';

/**
 * Use case for logging course click events
 *
 * Validation logic:
 * - Validates questionId and courseId exist before logging
 * - Uses upsert for race-condition safe idempotency
 */
@Injectable()
export class LogCourseClickUseCase {
  private readonly logger = new Logger(LogCourseClickUseCase.name);

  constructor(
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_CLICK_LOG_REPOSITORY_TOKEN)
    private readonly courseClickLogRepository: ICourseClickLogRepository,
    @Inject(I_QUESTION_LOG_REPOSITORY_TOKEN)
    private readonly questionLogRepository: IQuestionLogRepository,
  ) {}

  async execute(
    input: LogCourseClickUseCaseInput,
  ): Promise<LogCourseClickUseCaseOutput> {
    const { questionId, courseId } = input;

    this.logger.log(
      `Logging course click: questionId=${questionId}, courseId=${courseId}`,
    );

    // Validate questionId exists
    const questionLog = await this.questionLogRepository.findById(questionId);
    if (!questionLog) {
      this.logger.warn(
        `QuestionLog not found for questionId=${questionId}, rejecting click log`,
      );
      throw new AppException({
        message: `QuestionLog with id ${questionId} does not exist`,
        errorCode: ErrorCode.INVALID_INPUT,
        context: { questionId },
      });
    }

    // Validate courseId exists
    await this.courseRepository.findByIdOrThrow(courseId);

    // Create or get existing click log (race-condition safe)
    const clickLog = await this.courseClickLogRepository.upsert({
      questionId,
      courseId,
    });

    this.logger.log(
      `Course click logged successfully: clickLogId=${clickLog.id}`,
    );

    return clickLog;
  }
}
