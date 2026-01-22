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
}
