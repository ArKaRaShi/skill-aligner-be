import { CourseMatch } from '../types/course.type';

export const I_COURSE_REPOSITORY_TOKEN = Symbol('ICourseRepository');

type FindCoursesBySkillsSemanticParams = {
  skills: string[];
  matchesPerSkill?: number;
  threshold?: number;
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
}
