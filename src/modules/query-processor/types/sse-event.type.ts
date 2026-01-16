import { CourseOutputDto } from '../adapters/inbound/http/dto/responses/answer-question.response.dto';
import { TClassificationCategory } from './question-classification.type';

/**
 * SSE event data types emitted during pipeline execution.
 * The event name is passed separately to emitter.emit(data, eventName).
 *
 * Reuses HTTP DTOs (CourseOutputDto) for consistency between REST and SSE endpoints.
 * This ensures frontend receives the same data structure whether using SSE or REST API.
 */
export type StepSseEvent =
  | {
      step: number;
      total: number;
      name: string;
      displayName: string;
      status: 'started' | 'completed';
    }
  | {
      category: TClassificationCategory;
      reason: string;
      answer: string | null;
      suggestQuestion: string | null;
      relatedCourses: CourseOutputDto[];
      metadata?: {
        processingTime?: number;
        streamStep?: string;
      };
    }
  | {
      answer: string;
      suggestQuestion: string | null;
      relatedCourses: CourseOutputDto[];
    }
  | { message: string };

/**
 * SSE event name constants for type safety.
 */
export const SSE_EVENT_NAME = {
  STEP: 'step',
  FALLBACK: 'fallback',
  DONE: 'done',
  ERROR: 'error',
} as const;
