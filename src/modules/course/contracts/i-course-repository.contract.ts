import { Identifier } from 'src/common/domain/types/identifier';

import { Course, CourseMatch } from '../types/course.type';

export const I_COURSE_REPOSITORY_TOKEN = Symbol('ICourseRepository');

type FindCoursesBySkillsSemanticParams = {
  skills: string[];
  matchesPerSkill?: number;
  threshold?: number;
};

export type AcademicYearSemesterFilter = {
  academicYear: number;
  semesters?: number[];
};

export type FindCoursesByLearningOutcomeIdsParams = {
  learningOutcomeIds: Identifier[];
  campusId?: Identifier;
  facultyId?: Identifier;
  genEdOnly?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
};

export interface ICourseRepository {
  /**
   * Find courses by multiple skills via learning outcomes semantic search.
   * @param params The parameters for finding courses.
   * @returns A map where the key is the skill and the value is an array of course matches.
   */
  findCoursesBySkillsViaLO({
    skills,
    matchesPerSkill,
    threshold,
  }: FindCoursesBySkillsSemanticParams): Promise<Map<string, CourseMatch[]>>;

  /**
   * Find courses by learning outcome IDs with filters.
   * @param params The parameters for finding courses by learning outcome IDs.
   * @returns A map where the key is the learning outcome ID and the value is an array of courses.
   */
  findCourseByLearningOutcomeIds({
    learningOutcomeIds,
    campusId,
    facultyId,
    genEdOnly,
    academicYearSemesters,
  }: FindCoursesByLearningOutcomeIdsParams): Promise<Map<Identifier, Course[]>>;

  /**
   * Find a course by its identifier or throw an error if not found.
   * @param courseId The course identifier.
   * @returns The course with the given identifier.
   * @throws Error if the course is not found.
   */
  findByIdOrThrow(courseId: Identifier): Promise<Course>;
}
