import { CourseMatch } from '../types/course.type';

type FindCoursesBySkillsSemanticParams = {
  skills: string[];
  limit?: number;
  threshold?: number;
};

export interface ICourseRepository {
  /**
   * Retrieves courses whose learning outcomes (CLOs) match the given skills semantically.
   * @param skills - List of skill keywords to search for.
   * @param limit - Optional max number of courses to return.
   * @param threshold - Optional similarity threshold for semantic match.
   */
  findCoursesBySkillsViaLO({
    skills,
    limit,
    threshold,
  }: FindCoursesBySkillsSemanticParams): Promise<CourseMatch[]>;
}
