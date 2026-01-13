import { Injectable, Logger } from '@nestjs/common';

import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { ICourseAggregationService } from '../../contracts/i-course-aggregation-service.contract';
import {
  AggregatedCourseSkills,
  CourseAggregationInput,
  CourseAggregationOutput,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../types/course-aggregation.type';

@Injectable()
export class CourseAggregationService implements ICourseAggregationService {
  private readonly logger = new Logger(CourseAggregationService.name);

  aggregate(input: CourseAggregationInput): CourseAggregationOutput {
    const { filteredSkillCoursesMap, rawSkillCoursesMap } = input;

    // Choose aggregation strategy based on whether we have filtered results
    const hasFilteredScores =
      filteredSkillCoursesMap && filteredSkillCoursesMap.size > 0;

    let courseMap: Map<string, AggregatedCourseSkills>;

    if (hasFilteredScores) {
      courseMap = this.aggregateWithScore(filteredSkillCoursesMap);
    } else {
      courseMap = this.aggregateWithoutScore(rawSkillCoursesMap);
    }

    // Extract and rank by relevanceScore
    const aggregatedCourses: AggregatedCourseSkills[] = Array.from(
      courseMap.values(),
    );
    const rankedCourses = this.rankByRelevanceScore(aggregatedCourses);

    this.logger.debug(
      `Aggregated ${aggregatedCourses.length} unique courses, ranked by relevance score`,
    );

    return { rankedCourses };
  }

  /** Aggregate courses with LLM relevance scores */
  private aggregateWithScore(
    skillCoursesMap: Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >,
  ): Map<string, AggregatedCourseSkills> {
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of skillCoursesMap.entries()) {
      for (const course of courses) {
        this.mergeCourseIntoMap(courseMap, course, skill, course.score);
      }
    }
    return courseMap;
  }

  /** Aggregate courses without LLM scores (use default score) */
  private aggregateWithoutScore(
    skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): Map<string, AggregatedCourseSkills> {
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of skillCoursesMap.entries()) {
      for (const course of courses) {
        // Convert to CourseWithLearningOutcomeV2MatchWithRelevance with default score
        const courseWithScore: CourseWithLearningOutcomeV2MatchWithRelevance = {
          ...course,
          score: 3, // Default score when no LLM filter
          reason: '',
        };
        this.mergeCourseIntoMap(courseMap, courseWithScore, skill, 3);
      }
    }
    return courseMap;
  }

  /** Core aggregation logic - shared by both strategies */
  private mergeCourseIntoMap(
    courseMap: Map<string, AggregatedCourseSkills>,
    course: CourseWithLearningOutcomeV2MatchWithRelevance,
    skill: string,
    score: number,
  ): void {
    const subjectCode = course.subjectCode;

    if (!courseMap.has(subjectCode)) {
      courseMap.set(subjectCode, this.createAggregatedCourse(course, score));
    }

    const aggregatedCourse = courseMap.get(subjectCode)!;
    aggregatedCourse.matchedSkills.push({
      skill,
      learningOutcomes: course.matchedLearningOutcomes,
    });

    // Keep highest relevance score across all skills
    if (score > aggregatedCourse.relevanceScore) {
      aggregatedCourse.relevanceScore = score;
    }
  }

  /** Create new AggregatedCourseSkills from base course data */
  private createAggregatedCourse(
    course: CourseWithLearningOutcomeV2MatchWithRelevance,
    relevanceScore: number,
  ): AggregatedCourseSkills {
    return {
      id: course.id,
      campusId: course.campusId,
      facultyId: course.facultyId,
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      isGenEd: course.isGenEd,
      courseLearningOutcomes: course.allLearningOutcomes,
      courseOfferings: course.courseOfferings,
      courseClickLogs: [],
      metadata: course.metadata,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      matchedSkills: [],
      relevanceScore,
    };
  }

  /** Rank courses by relevanceScore descending */
  private rankByRelevanceScore(
    courses: AggregatedCourseSkills[],
  ): AggregatedCourseSkills[] {
    return courses.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
