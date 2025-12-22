import { Campus } from '../types/campus.type';

export type FindManyInput = {
  includeFaculties?: boolean;
};

export const I_CAMPUS_REPOSITORY_TOKEN = Symbol('ICampusRepository');

export interface ICampusRepository {
  /**
   * Find many campuses
   * @default
   * ```typescript
   * {
   *   includeFaculties: false,
   * }
   * ```
   * @param input - parameters to customize the query
   * @returns list of campuses
   *
   * @example
   * ```typescript
   * const campuses = await campusRepository.findMany({
   *  includeFaculties: true
   * });
   * ```
   */
  findMany(input: FindManyInput): Promise<Campus[]>;
}
