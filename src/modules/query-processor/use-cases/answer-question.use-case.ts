import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/common/application/contracts/i-use-case.contract';
import { TimeLogger, TimingMap } from 'src/common/helpers/time-logger.helper';

import {
  I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN,
  IQueryProfileBuilderService,
} from '../contracts/i-query-profile-builder-service.contract';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import { QueryStrategyFactory } from '../strategies/query-strategy.factory';
import { TClassificationCategory } from '../types/question-classification.type';
import { AnswerQuestionUseCaseOutput } from './types/answer-question.use-case.type';

@Injectable()
export class AnswerQuestionUseCase
  implements IUseCase<string, AnswerQuestionUseCaseOutput>
{
  private readonly logger = new Logger(AnswerQuestionUseCase.name);
  private readonly timeLogger = new TimeLogger();

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
    @Inject(I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN)
    private readonly queryProfileBuilderService: IQueryProfileBuilderService,
    private readonly queryStrategyFactory: QueryStrategyFactory,
  ) {}

  async execute(question: string): Promise<AnswerQuestionUseCaseOutput> {
    // More token usage but reduces latency
    const timing = this.timeLogger.initializeTiming();

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    const [{ category, reason }, queryProfile] = await Promise.all([
      this.questionClassifierService.classify({
        question,
        promptVersion: 'v8',
      }),
      this.queryProfileBuilderService.buildQueryProfile(question),
    ]);

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    this.logger.log(
      `Question classification result: ${JSON.stringify(
        { category, reason },
        null,
        2,
      )}`,
    );
    this.logger.log(
      `Query profile result: ${JSON.stringify(queryProfile, null, 2)}`,
    );

    const fallbackResponse = this.getFallbackAnswerForClassification(category);

    if (fallbackResponse) {
      return fallbackResponse;
    }

    const { intents } = queryProfile;

    // Check for unknown intents first (early exit)
    const unknownIntent = intents.find(
      (intent) => intent.augmented === 'unknown',
    );
    if (unknownIntent && intents.length === 1) {
      this.logger.warn(`Unknown intent detected in question: "${question}"`);
      return {
        answer: 'ขออภัย เราไม่แน่ใจว่าคุณต้องการอะไร กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    // Use the strategy pattern to handle the query
    const queryStrategy = this.queryStrategyFactory.getStrategy(queryProfile);

    if (!queryStrategy) {
      this.logger.error('No suitable strategy found for the query');
      return {
        answer: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำถามของคุณ',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    const result = await queryStrategy.execute(question, queryProfile, timing);

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.logTimingResults(timing);

    return result;
  }

  private getFallbackAnswerForClassification(
    classification: TClassificationCategory,
  ): AnswerQuestionUseCaseOutput | null {
    if (classification === 'irrelevant') {
      return {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    if (classification === 'dangerous') {
      return {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    return null;
  }

  private logTimingResults(timing: TimingMap): void {
    const timingResults = {
      total: this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute?.duration,
      ),
      'step1-basic-preparation': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step1?.duration,
      ),
      'step2-skill-inference': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step2?.duration,
      ),
      'step3-retrieval': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step3?.duration,
      ),
      'step4-course-classification': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step4?.duration,
      ),
      'step5-answer-synthesis': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step5?.duration,
      ),
    };

    this.logger.log(
      `Execution timing: ${JSON.stringify(timingResults, null, 2)}`,
    );
  }
}
