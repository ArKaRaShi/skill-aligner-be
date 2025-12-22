import { Identifier } from 'src/common/domain/types/identifier';

export type FacultyView = {
  id: Identifier;
  code: string;
  name: string | null;
};
