import { Injectable } from '@nestjs/common';

import type { Identifier } from 'src/shared/contracts/types/identifier';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

import type { ICourseClickLogRepository } from '../contracts/i-course-click-log-repository.contract';
import type { CourseClickLog } from '../types/course-click-log.type';
import { PrismaCourseClickLogMapper } from './mappers/prisma-course-click-log.mapper';

/**
 * Prisma implementation of CourseClickLog repository
 * Handles data access operations for course click tracking
 */
@Injectable()
export class PrismaCourseClickLogRepository
  implements ICourseClickLogRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new course click log
   */
  async create(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog> {
    const clickLog = await this.prisma.courseClickLog.create({
      data: {
        id: uuidv4(),
        questionId: data.questionId as string,
        courseId: data.courseId as string,
      },
    });

    return PrismaCourseClickLogMapper.toDomainCourseClickLog(clickLog);
  }

  /**
   * Find a course click log by question and course IDs
   */
  async findByQuestionAndCourse(
    questionId: Identifier,
    courseId: Identifier,
  ): Promise<CourseClickLog | null> {
    const clickLog = await this.prisma.courseClickLog.findFirst({
      where: {
        questionId: questionId as string,
        courseId: courseId as string,
      },
    });

    if (!clickLog) {
      return null;
    }

    return PrismaCourseClickLogMapper.toDomainCourseClickLog(clickLog);
  }

  /**
   * Create a course click log or return existing if already exists
   * This provides idempotency for duplicate clicks
   */
  async findOrCreate(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog> {
    // First, try to find existing
    const existing = await this.findByQuestionAndCourse(
      data.questionId,
      data.courseId,
    );

    if (existing) {
      return existing;
    }

    // If not found, create new
    return this.create(data);
  }

  /**
   * Atomically create or get existing course click log using upsert
   * This is race-condition safe and truly idempotent
   *
   * Handles race conditions where multiple concurrent requests try to insert
   * the same (questionId, courseId) pair by catching the unique constraint
   * violation and retrying the upsert (which will then find the existing record).
   */
  async upsert(data: {
    questionId: Identifier;
    courseId: Identifier;
  }): Promise<CourseClickLog> {
    try {
      const clickLog = await this.prisma.courseClickLog.upsert({
        where: {
          unique_question_course_click: {
            questionId: data.questionId as string,
            courseId: data.courseId as string,
          },
        },
        create: {
          id: uuidv4(),
          questionId: data.questionId as string,
          courseId: data.courseId as string,
        },
        update: {}, // No updates needed, just return existing
      });

      return PrismaCourseClickLogMapper.toDomainCourseClickLog(clickLog);
    } catch (error: unknown) {
      // Handle race condition: if another request inserted the record between
      // our find and create, retry the upsert which will now find the record.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        // P2002: Unique constraint violation - retry once to find the now-existing record
        const clickLog = await this.prisma.courseClickLog.findUnique({
          where: {
            unique_question_course_click: {
              questionId: data.questionId as string,
              courseId: data.courseId as string,
            },
          },
        });

        if (clickLog) {
          return PrismaCourseClickLogMapper.toDomainCourseClickLog(clickLog);
        }
      }

      // Re-throw if it's not a race condition we can handle
      throw error;
    }
  }
}
