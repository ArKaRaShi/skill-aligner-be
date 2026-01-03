import { Identifier } from 'src/shared/domain/value-objects/identifier';

export type FacultyView = {
  id: Identifier;
  code: string;
  name: string | null;
};
