import { Identifier } from 'src/common/domain/types/identifier';

import { Course } from '../../types/course.type';
import { RawCourseWithCLOs } from '../types/raw-course.type';

export class PrismaCourseMapper {
  static toDomain(rawCourse: RawCourseWithCLOs): Course {
    return {
      ...PrismaCourseMapper.mapCourseInfo(rawCourse),
      metadata: rawCourse.metadata,
      createdAt: rawCourse.created_at,
      updatedAt: rawCourse.updated_at,
      courseLearningOutcomes: [], // Empty array since it's not in the raw type
      courseOfferings: [], // Empty array since it's not in the raw type
      courseClickLogs: [], // Empty array since it's not in the raw type
    };
  }

  private static mapCourseInfo(rawCourse: RawCourseWithCLOs) {
    return {
      id: rawCourse.id as Identifier,
      campusId: rawCourse.campus_id as Identifier,
      facultyId: rawCourse.faculty_id as Identifier,
      subjectCode: rawCourse.subject_code,
      subjectName: rawCourse.subject_name,
      isGenEd: rawCourse.is_gen_ed,
    };
  }
}
