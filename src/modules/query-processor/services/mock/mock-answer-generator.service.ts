import { Injectable } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';

@Injectable()
export class MockAnswerGeneratorService implements IAnswerGeneratorService {
  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<string> {
    const skillsSummary = Array.from(skillCourseMatchMap.entries()).map(
      ([skill, courses]) => {
        const courseSummaries = courses.map((course) => {
          const courseName =
            course.subjectNameTh ??
            course.subjectNameEn ??
            course.subjectCode ??
            'Unknown course';
          return `  - ${courseName}`;
        });

        const courseLines =
          courseSummaries.length > 0
            ? courseSummaries.join('\n')
            : '  - No courses found.';

        return [`Skill: ${skill}`, 'Courses:', courseLines].join('\n');
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return [
      `Mock answer for question: "${question}"`,
      skillsSummary.join('\n\n') || 'No skill matches available.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
}
