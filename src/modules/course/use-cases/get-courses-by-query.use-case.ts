import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';

import {
  I_CAMPUS_REPOSITORY_TOKEN,
  ICampusRepository,
} from 'src/modules/campus/contracts/i-campus-repository.contract';
import { Campus } from 'src/modules/campus/types/campus.type';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from 'src/modules/course/contracts/i-course-retriever-service.contract';
import { CourseViewWithSimilarity } from 'src/modules/course/types/course.type';
import {
  I_FACULTY_REPOSITORY_TOKEN,
  IFacultyRepository,
} from 'src/modules/faculty/contracts/i-faculty.contract';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

import { CourseWithLearningOutcomeV2Match } from '../types/course.type';
import {
  GetCoursesByQueryUseCaseInput,
  GetCoursesByQueryUseCaseOutput,
} from './types/get-courses-by-query.use-case.type';

@Injectable()
export class GetCoursesByQueryUseCase
  implements
    IUseCase<GetCoursesByQueryUseCaseInput, GetCoursesByQueryUseCaseOutput>
{
  private readonly logger = new Logger(GetCoursesByQueryUseCase.name);

  constructor(
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,
    @Inject(I_FACULTY_REPOSITORY_TOKEN)
    private readonly facultyRepository: IFacultyRepository,
    @Inject(I_CAMPUS_REPOSITORY_TOKEN)
    private readonly campusRepository: ICampusRepository,
  ) {}

  async execute({
    query,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
    loThreshold,
    topNLos,
    embeddingModel,
  }: GetCoursesByQueryUseCaseInput): Promise<GetCoursesByQueryUseCaseOutput> {
    this.logger.debug(`Getting courses for query: ${query}`);

    // Get courses with matched learning outcomes
    const { courses, embeddingUsage } =
      await this.courseRetrieverService.getCoursesByQuery({
        query,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
        loThreshold,
        topNLos,
        embeddingModel,
      });

    this.logger.debug(
      `Retrieved ${courses.length} courses, transforming to CourseView`,
    );

    // Transform to CourseView with full campus and faculty details
    const courseViews = await this.transformToCourseViews(courses);

    this.logger.debug(
      `Completed transformation for ${courseViews.length} courses`,
    );

    return {
      courses: courseViews,
      embeddingUsage,
    };
  }

  private async transformToCourseViews(
    courses: CourseWithLearningOutcomeV2Match[],
  ): Promise<CourseViewWithSimilarity[]> {
    // Fetch all campuses and faculties in parallel
    const [faculties, campuses] = await Promise.all([
      this.facultyRepository.findMany(),
      this.campusRepository.findMany({ includeFaculties: false }),
    ]);

    // Build lookup maps for O(1) access
    const facultyMap = new Map<Identifier, Faculty>();
    for (const faculty of faculties) {
      facultyMap.set(faculty.facultyId, faculty);
    }
    const campusMap = new Map<Identifier, Campus>();
    for (const campus of campuses) {
      campusMap.set(campus.campusId, campus);
    }

    // Transform courses to CourseView
    return courses.map((course) => {
      const campus = campusMap.get(course.campusId);
      const faculty = facultyMap.get(course.facultyId);

      if (!campus || !faculty) {
        this.logger.warn(
          `Missing campus or faculty for course ${course.id}: campusId=${course.campusId}, facultyId=${course.facultyId}`,
        );
      }

      return {
        id: course.id,
        campus: campus ?? ({} as Campus),
        faculty: faculty ?? ({} as Faculty),
        subjectCode: course.subjectCode,
        subjectName: course.subjectName,
        isGenEd: course.isGenEd,
        courseLearningOutcomes: course.allLearningOutcomes,
        courseOfferings: course.courseOfferings,
        matchedLearningOutcomes: course.matchedLearningOutcomes,
        totalClicks: 0, // No click logs in CourseWithLearningOutcomeV2Match
        score:
          course.matchedLearningOutcomes.length > 0
            ? Math.max(
                ...course.matchedLearningOutcomes.map(
                  (lo) => lo.similarityScore,
                ),
              )
            : 0,
        metadata: course.metadata,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    });
  }
}
