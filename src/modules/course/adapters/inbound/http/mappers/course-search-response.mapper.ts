import { plainToInstance } from 'class-transformer';

import { CourseViewWithSimilarity } from '../../../../types/course.type';
import {
  CourseSearchItemResponseDto,
  CourseSearchResponseDto,
} from '../dto/responses/course-search-item.response.dto';

/**
 * Mapper for transforming course search domain models to DTOs
 * Experimental: For frontend search results display
 */
export class CourseSearchResponseMapper {
  static toCourseSearchResponseDto(
    courses: CourseViewWithSimilarity[],
    embeddingUsage: {
      query: string;
      model: string;
      provider: string;
      dimension: number;
    },
  ): CourseSearchResponseDto {
    const results = courses.map((course) =>
      CourseSearchResponseMapper.toCourseSearchItemResponseDto(course),
    );

    const responseDto: CourseSearchResponseDto = {
      results: plainToInstance(CourseSearchItemResponseDto, results, {
        excludeExtraneousValues: true,
      }),
      total: results.length,
      embeddingUsage: {
        query: embeddingUsage.query,
        model: embeddingUsage.model,
        provider: embeddingUsage.provider,
        dimension: embeddingUsage.dimension,
      },
    };

    return plainToInstance(CourseSearchResponseDto, responseDto, {
      excludeExtraneousValues: true,
    });
  }

  static toCourseSearchItemResponseDto(
    course: CourseViewWithSimilarity,
  ): CourseSearchItemResponseDto {
    const itemDto: CourseSearchItemResponseDto = {
      id: course.id,
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      isGenEd: course.isGenEd,
      campus: {
        id: course.campus.campusId,
        code: course.campus.code,
        name: course.campus.nameTh ?? course.campus.code,
      },
      faculty: {
        id: course.faculty.facultyId,
        code: course.faculty.code,
        name: course.faculty.nameTh ?? course.faculty.code,
      },
      score: course.score,
      matchedLearningOutcomes: course.matchedLearningOutcomes.map((lo) => ({
        name: lo.cleanedName ?? lo.originalName,
        similarityScore: lo.similarityScore,
      })),
      matchedLoCount: course.matchedLearningOutcomes.length,
      totalLoCount: course.courseLearningOutcomes.length,
    };

    return plainToInstance(CourseSearchItemResponseDto, itemDto, {
      excludeExtraneousValues: true,
    });
  }
}
