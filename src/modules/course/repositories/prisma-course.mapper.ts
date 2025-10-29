import { Identifier } from 'src/common/domain/types/identifier';

import { CourseLearningOutcomeMatch } from '../types/course-learning-outcome.type';
import { CourseMatch } from '../types/course.type';
import {
  RawCourseLearningOutcome,
  RawCourseWithCLOs,
} from './types/raw-course.type';

export class PrismaCourseMapper {
  static toDomain(rawCourse: RawCourseWithCLOs): CourseMatch {
    return {
      courseId: rawCourse.id as Identifier,
      campusCode: rawCourse.campus_code,
      facultyCode: rawCourse.faculty_code,
      academicYear: rawCourse.academic_year,
      semester: rawCourse.semester,

      subjectCode: rawCourse.subject_code,
      subjectNameEn: null,
      subjectNameTh: rawCourse.subject_name_th,

      createdAt: rawCourse.created_at,
      updatedAt: rawCourse.updated_at,
      cloMatches: rawCourse.course_learning_outcomes
        ? rawCourse.course_learning_outcomes.map((clo) => this.cloToDomain(clo))
        : [],
    };
  }

  static cloToDomain(
    rawCLO: RawCourseLearningOutcome & { similarity?: number },
  ): CourseLearningOutcomeMatch {
    return {
      cloId: rawCLO.id as Identifier,
      courseId: rawCLO.course_id as Identifier,

      cloNo: rawCLO.clo_no,
      cloNameTh: rawCLO.clo_name_th,
      cloNameEn: null,
      embedding: rawCLO.embedding,

      metadata: rawCLO.metadata,
      createdAt: rawCLO.created_at,
      updatedAt: rawCLO.updated_at,
      similarityScore: rawCLO.similarity ?? 0,
    };
  }
}
