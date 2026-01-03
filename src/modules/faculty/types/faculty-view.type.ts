import { Identifier } from 'src/shared/contracts/types/identifier';

export type FacultyView = {
  id: Identifier;
  code: string;
  name: string | null;
};
