import { Identifier } from 'src/common/domain/types/identifier';

export class CourseOffering {
  id: Identifier;
  courseId: Identifier;
  semester: number;
  academicYear: number;
  createdAt: Date;
}
