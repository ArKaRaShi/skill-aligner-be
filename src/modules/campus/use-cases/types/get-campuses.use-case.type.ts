import { Campus } from '../../types/campus.type';

export type GetCampusesUseCaseInput = {
  includeFaculties?: boolean;
};

export type GetCampusesUseCaseOutput = {
  campuses: Campus[];
};
