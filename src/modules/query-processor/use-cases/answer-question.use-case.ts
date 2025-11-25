import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from 'src/modules/course/contracts/i-course.repository';

import {
  I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
  IAnswerSynthesisService,
} from '../contracts/i-answer-synthesis-service.contract';
import {
  I_COURSE_CLASSIFICATION_SERVICE_TOKEN,
  ICourseClassificationService,
} from '../contracts/i-course-classification-service.contract';
import {
  I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN,
  IQueryProfileBuilderService,
} from '../contracts/i-query-profile-builder-service.contract';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { CourseClassificationResult } from '../types/course-classification.type';
import { Classification } from '../types/question-classification.type';
import { SkillExpansion } from '../types/skill-expansion.type';
import { AnswerQuestionUseCaseOutput } from './types/answer-question.use-case.type';

@Injectable()
export class AnswerQuestionUseCase {
  private readonly logger = new Logger(AnswerQuestionUseCase.name);

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
    @Inject(I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN)
    private readonly queryProfileBuilderService: IQueryProfileBuilderService,
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_CLASSIFICATION_SERVICE_TOKEN)
    private readonly courseClassificationService: ICourseClassificationService,
    @Inject(I_ANSWER_SYNTHESIS_SERVICE_TOKEN)
    private readonly answerSynthesisService: IAnswerSynthesisService,
  ) {}

  async execute(question: string): Promise<AnswerQuestionUseCaseOutput> {
    // More token usage but reduces latency
    console.time('AnswerQuestionUseCaseExecute');
    console.time('AnswerQuestionUseCaseExecute-Step1');
    const [{ classification, reason }, queryProfile] = await Promise.all([
      this.questionClassifierService.classify(question),
      this.queryProfileBuilderService.buildQueryProfile(question),
    ]);
    console.timeEnd('AnswerQuestionUseCaseExecute-Step1');

    this.logger.log(
      `Question classification result: ${JSON.stringify(
        { classification, reason },
        null,
        2,
      )}`,
    );
    this.logger.log(
      `Query profile result: ${JSON.stringify(queryProfile, null, 2)}`,
    );

    const fallbackResponse =
      this.getFallbackAnswerForClassification(classification);

    if (fallbackResponse) {
      return fallbackResponse;
    }

    const { intents } = queryProfile;

    // Check for unknown intents first (early exit)
    const unknownIntent = intents.find(
      (intent) => intent.augmented === 'unknown',
    );
    if (unknownIntent && intents.length === 1) {
      this.logger.warn(`Unknown intent detected in question: "${question}"`);
      return {
        answer: 'ขออภัย เราไม่แน่ใจว่าคุณต้องการอะไร กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    console.time('AnswerQuestionUseCaseExecute-Step2');
    // Hybrid Approach: Structure for future dependency management
    // Phase 1: Start independent operations in parallel
    const independentOperations: Promise<any>[] = [];

    // Check if skill expansion is needed
    const needsSkillExpansion = intents.some(
      (intent) => intent.augmented === 'ask-skills',
    );

    let skillExpansionPromise: Promise<SkillExpansion> | null = null;
    if (needsSkillExpansion) {
      skillExpansionPromise = this.skillExpanderService.expandSkills(question);
      independentOperations.push(skillExpansionPromise);
    }

    // Phase 2: Wait for independent operations to complete
    let skillExpansion: SkillExpansion | null = null;
    if (independentOperations.length > 0) {
      const results = await Promise.all(independentOperations);

      // Extract skill expansion result if it was executed
      if (skillExpansionPromise) {
        skillExpansion = results[0] as SkillExpansion;
      }
    }

    // Phase 3: Execute dependent operations (structured for future dependency management)
    const skills = skillExpansion?.skills || [];
    console.timeEnd('AnswerQuestionUseCaseExecute-Step2');

    this.logger.log(`Expanded skills: ${JSON.stringify(skills, null, 2)}`);

    console.time('AnswerQuestionUseCaseExecute-Step3');
    const courses = await this.courseRepository.findCoursesBySkillsViaLO({
      skills: skills.map((skill) => skill.skill),
      matchesPerSkill: 5, // tune this value as needed
      // Adjust from 8.2 to 8.0 because of courses with lower relevance but still useful
      threshold: 0.8, // beware of Mar Terraform Engineer, tune this value as needed
    });

    console.timeEnd('AnswerQuestionUseCaseExecute-Step3');

    console.time('AnswerQuestionUseCaseExecute-Step4');
    const classificationResult =
      await this.courseClassificationService.classifyCourses(question, courses);
    console.timeEnd('AnswerQuestionUseCaseExecute-Step4');

    console.time('AnswerQuestionUseCaseExecute-Step5');
    const synthesisResult = await this.answerSynthesisService.synthesizeAnswer(
      question,
      classificationResult,
    );
    console.timeEnd('AnswerQuestionUseCaseExecute-Step5');

    this.logger.log(
      `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
    );
    console.timeEnd('AnswerQuestionUseCaseExecute');

    return {
      answer: synthesisResult.answerText,
      suggestQuestion: null,
      skillGroupedCourses: this.filterIncludedCourses(classificationResult),
    };
  }

  private filterIncludedCourses(
    classificationResult: CourseClassificationResult,
  ) {
    const skillGroupedCourses: {
      skill: string;
      courses: { courseName: string; reason: string }[];
    }[] = [];

    for (const classification of classificationResult.classifications) {
      const includedCourses = classification.courses
        .filter((course) => course.decision === 'include')
        .map((course) => ({
          courseName: course.name,
          reason: course.reason,
        }));

      skillGroupedCourses.push({
        skill: classification.skill,
        courses: includedCourses,
      });
    }

    return skillGroupedCourses;
  }

  private getFallbackAnswerForClassification(
    classification: Classification,
  ): AnswerQuestionUseCaseOutput | null {
    if (classification === 'out_of_scope') {
      return {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    if (classification === 'dangerous') {
      return {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    if (classification === 'unclear') {
      return {
        answer: 'ขออภัย คำถามของคุณไม่ชัดเจน กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    return null;
  }
}
