import { Faculty } from '../types/faculty.type';

export const I_FACULTY_REPOSITORY_TOKEN = Symbol('IFacultyRepository');

export interface IFacultyRepository {
  findMany(): Promise<Faculty[]>;
}
