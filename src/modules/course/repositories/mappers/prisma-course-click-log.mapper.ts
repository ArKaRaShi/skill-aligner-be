import { Prisma } from '@prisma/client';

import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseClickLog } from '../../types/course-click-log.type';

type PrismaCourseClickLog = Prisma.CourseClickLogGetPayload<object>;

/**
 * Mapper for CourseClickLog domain ↔ Prisma conversion
 */
export class PrismaCourseClickLogMapper {
  /**
   * Convert Prisma CourseClickLog to domain CourseClickLog
   */
  static toDomainCourseClickLog(
    prismaClickLog: PrismaCourseClickLog,
  ): CourseClickLog {
    return {
      id: prismaClickLog.id as Identifier,
      questionId: prismaClickLog.questionId as Identifier,
      courseId: prismaClickLog.courseId as Identifier,
      createdAt: prismaClickLog.createdAt,
    };
  }
}
