import { Identifier } from 'src/shared/contracts/types/identifier';

export class CourseOffering {
  id: Identifier;
  courseId: Identifier;
  semester: number;
  academicYear: number;
  createdAt: Date;
}
