import { plainToInstance } from 'class-transformer';

import { CampusResponseMapper } from 'src/modules/campus/campus-response.mapper';
import { LearningOutcome } from 'src/modules/course/types/course-learning-outcome-v2.type';
import { CourseOffering } from 'src/modules/course/types/course-offering.type';
import { CourseView } from 'src/modules/course/types/course.type';
import { MatchedSkillLearningOutcomes } from 'src/modules/course/types/skill-learning-outcome.type';
import { FacultyResponseMapper } from 'src/modules/faculty/faculty-response.mapper';

import {
  CourseOfferingDto,
  CourseOutputDto,
  LearningOutcomeDto,
  MatchedSkillLearningOutcomesDto,
} from '../dto/responses/answer-question.response.dto';

export class CourseResponseMapper {
  static toCourseOutputDto(courseViews: CourseView[]): CourseOutputDto[] {
    return courseViews.map((courseView) =>
      this.toCourseOutputDtoSingle(courseView),
    );
  }

  static toCourseOutputDtoSingle(courseView: CourseView): CourseOutputDto {
    const courseOutputDto: CourseOutputDto = {
      id: courseView.id,
      campus: CampusResponseMapper.toCampusViewResponseDto(courseView.campus),
      faculty: FacultyResponseMapper.toFacultyViewResponseDto(
        courseView.faculty,
      ),
      subjectCode: courseView.subjectCode,
      subjectName: courseView.subjectName,
      isGenEd: courseView.isGenEd,
      courseLearningOutcomes: courseView.courseLearningOutcomes.map((lo) =>
        this.toLearningOutcomeDto(lo),
      ),
      matchedSkills: courseView.matchedSkills.map((skill) =>
        this.toMatchedSkillLearningOutcomesDto(skill),
      ),
      courseOfferings: courseView.courseOfferings.map((offering) =>
        this.toCourseOfferingDto(offering),
      ),
      score: courseView.score,
      totalClicks: courseView.totalClicks,
    };

    return plainToInstance(CourseOutputDto, courseOutputDto, {
      excludeExtraneousValues: true,
    });
  }

  static toLearningOutcomeDto(
    learningOutcome: LearningOutcome,
  ): LearningOutcomeDto {
    const learningOutcomeDto: LearningOutcomeDto = {
      loId: learningOutcome.loId,
      originalName: learningOutcome.originalName,
      cleanedName: learningOutcome.cleanedName,
    };

    return plainToInstance(LearningOutcomeDto, learningOutcomeDto, {
      excludeExtraneousValues: true,
    });
  }

  static toCourseOfferingDto(
    courseOffering: CourseOffering,
  ): CourseOfferingDto {
    const courseOfferingDto: CourseOfferingDto = {
      id: courseOffering.id,
      courseId: courseOffering.courseId,
      semester: courseOffering.semester,
      academicYear: courseOffering.academicYear,
      createdAt: courseOffering.createdAt,
    };

    return plainToInstance(CourseOfferingDto, courseOfferingDto, {
      excludeExtraneousValues: true,
    });
  }

  static toMatchedSkillLearningOutcomesDto(
    matchedSkill: MatchedSkillLearningOutcomes,
  ): MatchedSkillLearningOutcomesDto {
    const matchedSkillDto: MatchedSkillLearningOutcomesDto = {
      skill: matchedSkill.skill,
      relevanceScore: matchedSkill.relevanceScore,
      learningOutcomes: matchedSkill.learningOutcomes.map((lo) =>
        this.toLearningOutcomeDto(lo),
      ),
    };

    return plainToInstance(MatchedSkillLearningOutcomesDto, matchedSkillDto, {
      excludeExtraneousValues: true,
    });
  }
}
