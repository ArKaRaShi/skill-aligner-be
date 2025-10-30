import { Injectable } from '@nestjs/common';

import { ICourseRepository } from '../contracts/i-course.repository';
import { CourseMatch } from '../types/course.type';

@Injectable()
export class PrismaCourseRepository implements ICourseRepository {
  async findCoursesBySkillsViaLO(params: {
    skills: string[];
    limit?: number | undefined;
    threshold?: number | undefined;
  }): Promise<CourseMatch[]> {
    // Implementation goes here
    return [];
  }
}
