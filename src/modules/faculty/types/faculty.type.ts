import { Identifier } from 'src/shared/domain/value-objects/identifier';

import type { Campus } from 'src/modules/campus/types/campus.type';
import { Course } from 'src/modules/course/types/course.type';

export type Faculty = {
  facultyId: Identifier;

  code: string;
  nameEn: string | null;
  nameTh: string | null;
  createdAt: Date;
  updatedAt: Date;

  campuses: Campus[];
  courses: Course[];
};
