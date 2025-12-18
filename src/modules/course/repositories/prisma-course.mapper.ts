import { Identifier } from 'src/common/domain/types/identifier';

import { CourseLearningOutcomeMatch } from '../types/course-learning-outcome.type';
import { CourseMatch } from '../types/course.type';
import {
  RawCourseCLO,
  RawCourseLearningOutcome,
  RawCourseWithCLOs,
} from './types/raw-course.type';

export class PrismaCourseMapper {
  static toDomain(rawCourse: RawCourseWithCLOs): CourseMatch {
    return {
      ...PrismaCourseMapper.mapCourseInfo(rawCourse),
      metadata: rawCourse.metadata,
      createdAt: rawCourse.created_at,
      updatedAt: rawCourse.updated_at,
      cloMatches: PrismaCourseMapper.mapCLOs(rawCourse.course_clos),
    };
  }

  private static mapCourseInfo(rawCourse: RawCourseWithCLOs) {
    return {
      courseId: rawCourse.id as Identifier,
      campusId: rawCourse.campus_id as Identifier,
      facultyId: rawCourse.faculty_id as Identifier,
      academicYear: rawCourse.academic_year,
      semester: rawCourse.semester,
      subjectCode: rawCourse.subject_code,
      subjectNameEn: rawCourse.subject_name_en,
      subjectNameTh: rawCourse.subject_name_th,
    };
  }

  private static mapCLOs(
    rawCLOs: RawCourseCLO[],
  ): CourseLearningOutcomeMatch[] {
    if (!rawCLOs) return [];

    return rawCLOs
      .filter((clo) => PrismaCourseMapper.isValidCLO(clo))
      .map((clo) => PrismaCourseMapper.cloToDomain(clo))
      .filter((clo): clo is CourseLearningOutcomeMatch => clo !== null);
  }

  private static isValidCLO(
    clo: RawCourseCLO,
  ): clo is RawCourseCLO & { learning_outcome: RawCourseLearningOutcome } {
    return !!clo && !!clo.learning_outcome;
  }

  private static cloToDomain(
    rawCLO: RawCourseCLO & { learning_outcome: RawCourseLearningOutcome },
  ): CourseLearningOutcomeMatch {
    const lo = rawCLO.learning_outcome;

    return {
      cloId: lo.id as Identifier,
      courseId: rawCLO.course_id as Identifier,
      cloNo: rawCLO.clo_no,

      originalCLONameTh: lo.original_clo_name,
      originalCLONameEn: lo.original_clo_name_en,
      cleanedCloName: lo.cleaned_clo_name_th,
      cleanedCLONameEn: lo.cleaned_clo_name_en,
      embedding: lo.embedding,
      skipEmbedding: lo.skip_embedding,
      isEmbedded: lo.is_embedded,
      metadata: lo.metadata,

      createdAt: lo.created_at,
      updatedAt: lo.updated_at,
      similarityScore: 0,
    };
  }
}
