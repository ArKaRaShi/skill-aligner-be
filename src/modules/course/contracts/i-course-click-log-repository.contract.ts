/**
 * Repository contract for course click logs
 * Defines the interface for tracking course click events
 */
import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseClickLog } from '../types/course-click-log.type';

export const I_COURSE_CLICK_LOG_REPOSITORY_TOKEN = Symbol(
  'ICourseClickLogRepository',
);

/**
 * Repository interface for course click log operations
 * Provides CRUD operations for CourseClickLog entities
 */
export interface ICourseClickLogRepository {
  /**
   * Create a new course click log
   * @param data - The course click log data
   * @returns The created course click log
   */
  create(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog>;

  /**
   * Find a course click log by question and course IDs
   * @param questionId - The question log identifier
   * @param courseId - The course identifier
   * @returns The course click log if found, null otherwise
   */
  findByQuestionAndCourse(
    questionId: Identifier,
    courseId: Identifier,
  ): Promise<CourseClickLog | null>;

  /**
   * Create a course click log or return existing if already exists
   * This provides idempotency for duplicate clicks
   * @param data - The course click log data
   * @returns The created or existing course click log
   */
  findOrCreate(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog>;

  /**
   * Atomically create or get existing course click log using upsert
   * This is race-condition safe and truly idempotent
   * @param data - The course click log data
   * @returns The created or existing course click log
   */
  upsert(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog>;
}
