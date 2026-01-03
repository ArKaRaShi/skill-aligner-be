import { Identifier } from 'src/shared/domain/value-objects/identifier';

import { Course } from 'src/modules/course/types/course.type';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

export type Campus = {
  campusId: Identifier;

  code: string;
  nameEn: string | null;
  nameTh: string | null;
  createdAt: Date;
  updatedAt: Date;

  faculties: Faculty[];
  courses: Course[];
};

export type CampusView = {
  id: Identifier;
  code: string;
  name: string | null;
};
