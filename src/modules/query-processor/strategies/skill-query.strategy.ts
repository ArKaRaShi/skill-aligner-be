import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  EmbeddingModels,
  EmbeddingProviders,
  VectorDimensions,
} from 'src/core/embedding/clients';

import { Identifier } from 'src/common/domain/types/identifier';
import { TimeLogger, TimingMap } from 'src/common/helpers/time-logger.helper';

import {
  I_CAMPUS_REPOSITORY_TOKEN,
  ICampusRepository,
} from 'src/modules/campus/contracts/i-campus-repository.contract';
import { Campus } from 'src/modules/campus/types/campus.type';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from 'src/modules/course/contracts/i-course-retriever-service.contract';
import {
  AggregatedCourseSkills,
  CourseView,
} from 'src/modules/course/types/course.type';
import {
  I_FACULTY_REPOSITORY_TOKEN,
  IFacultyRepository,
} from 'src/modules/faculty/contracts/i-faculty.contract';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

import {
  I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
  IAnswerSynthesisService,
} from '../contracts/i-answer-synthesis-service.contract';
import {
  I_COURSE_CLASSIFICATION_SERVICE_TOKEN,
  ICourseClassificationService,
} from '../contracts/i-course-classification-service.contract';
import { IQueryStrategy } from '../contracts/i-query-strategy.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { AnswerSynthesisPromptVersions } from '../prompts/answer-synthesis';
import { SkillExpansionPromptVersions } from '../prompts/skill-expansion';
import { QueryProfile } from '../types/query-profile.type';
import { AnswerQuestionUseCaseOutput } from '../use-cases/outputs/answer-question.use-case.output';

@Injectable()
export class SkillQueryStrategy implements IQueryStrategy {
  private readonly logger = new Logger(SkillQueryStrategy.name);
  private readonly timeLogger = new TimeLogger();

  constructor(
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_CLASSIFICATION_SERVICE_TOKEN)
    private readonly courseClassificationService: ICourseClassificationService,
    @Inject(I_ANSWER_SYNTHESIS_SERVICE_TOKEN)
    private readonly answerSynthesisService: IAnswerSynthesisService,
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,

    @Inject(I_FACULTY_REPOSITORY_TOKEN)
    private readonly facultyRepository: IFacultyRepository,
    @Inject(I_CAMPUS_REPOSITORY_TOKEN)
    private readonly campusRepository: ICampusRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canHandle(queryProfile: QueryProfile): boolean {
    // For now, this strategy will handle all skill-related queries
    return true;
  }

  async execute(
    question: string,
    queryProfile: QueryProfile,
    timing: TimingMap,
  ): Promise<AnswerQuestionUseCaseOutput> {
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    const skillExpansion = await this.skillExpanderService.expandSkillsV2(
      question,
      SkillExpansionPromptVersions.V5,
    );
    const skills = skillExpansion.skillItems;
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    this.logger.log(`Expanded skills: ${JSON.stringify(skills, null, 2)}`);

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');

    const skillCoursesMap =
      await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
        skills: skills.map((skill) => skill.skill),
        embeddingConfiguration: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: VectorDimensions.DIM_768,
        },
        loThreshold: 0.7,
        topNLos: 5,
      });

    // Create a map to dedupe courses by subjectCode and aggregate their skills
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of skillCoursesMap.entries()) {
      for (const course of courses) {
        const subjectCode = course.subjectCode;

        if (!courseMap.has(subjectCode)) {
          // Create a new AggregatedCourseSkills entry for this course
          courseMap.set(subjectCode, {
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
          });
        }

        // Add the current skill and its matched learning outcomes to the course
        const aggregatedCourse = courseMap.get(subjectCode)!;
        aggregatedCourse.matchedSkills.push({
          skill: skill,
          learningOutcomes: course.matchedLearningOutcomes,
        });
      }
    }

    // Convert the map to an array
    const aggregatedCourseSkills: AggregatedCourseSkills[] = [
      ...Array.from(courseMap.values()),
    ];

    // const skillCoursesMap =
    //   await this.courseRepository.findCoursesBySkillsViaLO({
    //     skills: skills.map((skill) => skill.skill),
    //     matchesPerSkill: 5, // tune this value as needed
    //     // Adjust from 8.2 to 8.0 because of courses with lower relevance but still useful
    //     threshold: 0.7, // beware of Mar Terraform Engineer, tune this value as needed
    //   });

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');

    // this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');
    // const classificationPromises: Promise<CourseClassificationResult>[] = [];
    // for (const [skill, courses] of skillCoursesMap.entries()) {
    //   if (!courses?.length) {
    //     continue;
    //   }

    //   classificationPromises.push(
    //     this.courseClassificationService.classifyCourses(
    //       question,
    //       queryProfile,
    //       new Map<string, CourseWithLearningOutcomeV2Match[]>([
    //         [skill, courses],
    //       ]),
    //     ),
    //   );
    // }
    // const classificationResults = await Promise.all(classificationPromises);

    // // Merge classification results
    // const classificationResult: CourseClassificationResult = {
    //   classifications: classificationResults.flatMap(
    //     (result) => result.classifications,
    //   ),
    //   question: classificationResults[0]?.question,
    //   context: classificationResults
    //     .map((result) => result.context)
    //     .join('\n\n'),
    // };

    // this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');
    const synthesisResult = await this.answerSynthesisService.synthesizeAnswer({
      question,
      promptVersion: AnswerSynthesisPromptVersions.V6,
      queryProfile,
      aggregatedCourseSkills,
    });
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');

    this.logger.log(
      `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
    );

    const relatedCourses = await this.transformToCourseViews(
      aggregatedCourseSkills,
    );

    return {
      answer: synthesisResult.answerText,
      suggestQuestion: null,
      relatedCourses,
    };
  }
  private async transformToCourseViews(
    aggregatedCourses: AggregatedCourseSkills[],
  ): Promise<CourseView[]> {
    const [faculties, campuses] = await Promise.all([
      this.facultyRepository.findMany(),
      this.campusRepository.findMany({ includeFaculties: false }),
    ]);
    const facultyMap = new Map<Identifier, Faculty>();
    for (const faculty of faculties) {
      facultyMap.set(faculty.facultyId, faculty);
    }
    const campusMap = new Map<Identifier, Campus>();
    for (const campus of campuses) {
      campusMap.set(campus.campusId, campus);
    }

    return aggregatedCourses.map((course) => ({
      id: course.id,
      campus: campusMap.get(course.campusId)!,
      faculty: facultyMap.get(course.facultyId)!,
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      isGenEd: course.isGenEd,
      courseLearningOutcomes: course.courseLearningOutcomes,
      courseOfferings: course.courseOfferings,
      matchedSkills: course.matchedSkills,
      totalClicks: course.courseClickLogs.length,
      score: course.score ?? 3, // default score if not set
      metadata: course.metadata,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));
  }
}
