import { CourseOutputDto } from '../adapters/inbound/http/dto/responses/answer-question.response.dto';
import { TClassificationCategory } from './question-classification.type';

/**
 * SSE event data types emitted during pipeline execution.
 * The event name is passed separately to emitter.emit(data, eventName).
 *
 * Reuses HTTP DTOs (CourseOutputDto) for consistency between REST and SSE endpoints.
 * This ensures frontend receives the same data structure whether using SSE or REST API.
 *
 * Each event type has a single responsibility - no mixing of concerns.
 *
 * Supports both streaming and non-streaming modes via the stream flag.
 * - Non-stream mode (stream: false): All data in DONE event
 * - Streaming mode (stream: true): Courses in COURSES event, text chunks in TEXT_CHUNK events
 */
export type StepSseEvent =
  | {
      /** Pipeline step progress update */
      step: number;
      total: number;
      name: string;
      displayName: string;
      status: 'started' | 'completed';
    }
  | {
      /** Course results emitted after aggregation (step 5) - streaming mode only */
      courses: CourseOutputDto[];
    }
  | {
      /** Text chunk emitted during answer synthesis streaming (step 6) - streaming mode only */
      chunk: string;
      isFirst: boolean;
      isLast: boolean;
    }
  | {
      /** Fallback response for irrelevant/dangerous questions */
      category: TClassificationCategory;
      reason: string;
      answer: string | null;
      suggestQuestion: string | null;
      relatedCourses: CourseOutputDto[];
    }
  | {
      /** Final completion event with answer text */
      answer: string;
      suggestQuestion: string | null;
      /** Courses included only in non-streaming mode. In streaming mode, use COURSES event. */
      relatedCourses?: CourseOutputDto[];
    }
  | {
      /** Error event */
      message: string;
    };

/**
 * SSE event name constants for type safety.
 */
export const SSE_EVENT_NAME = {
  STEP: 'step',
  COURSES: 'courses',
  TEXT_CHUNK: 'text_chunk',
  FALLBACK: 'fallback',
  DONE: 'done',
  ERROR: 'error',
} as const;
