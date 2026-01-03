import { Identifier } from 'src/shared/domain/value-objects/identifier';

export class CourseOffering {
  id: Identifier;
  courseId: Identifier;
  semester: number;
  academicYear: number;
  createdAt: Date;
}
