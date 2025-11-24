import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from 'src/modules/course/contracts/i-course.repository';

import {
  I_ANSWER_GENERATOR_SERVICE_TOKEN,
  IAnswerGeneratorService,
} from '../contracts/i-answer-generator-service.contract';
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
    @Inject(I_ANSWER_GENERATOR_SERVICE_TOKEN)
    private readonly answerGeneratorService: IAnswerGeneratorService,
  ) {}

  async execute(question: string): Promise<AnswerQuestionUseCaseOutput> {
    // Parallelize classification and skill expansion
    // More token usage but reduces latency
    const [{ classification, reason }, queryProfile] = await Promise.all([
      this.questionClassifierService.classify(question),
      this.queryProfileBuilderService.buildQueryProfile(question),
    ]);

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
        relatedCourses: [],
      };
    }

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

    const courses = await this.courseRepository.findCoursesBySkillsViaLO({
      skills: skills.map((skill) => skill.skill),
      matchesPerSkill: 5, // tune this value as needed
      threshold: 0.82, // beware of Mar Terraform Engineer, tune this value as needed
    });

    const { answerText } = await this.answerGeneratorService.generateAnswer(
      question,
      courses,
    );

    console.log(
      'Answer generation details:',
      JSON.stringify({ answerText }, null, 2),
    );

    return {
      answer: answerText,
      suggestQuestion: null,
      relatedCourses: Array.from(courses.entries()).flatMap(
        ([skill, courses]) => {
          return courses.map((course) => {
            return {
              skill,
              courseName: course.subjectNameTh,
              matchLO: course.cloMatches[0].cleanedCLONameTh,
              similarity: course.cloMatches[0].similarityScore,
            };
          });
        },
      ),
    };
  }

  private getFallbackAnswerForClassification(
    classification: Classification,
  ): AnswerQuestionUseCaseOutput | null {
    if (classification === 'out_of_scope') {
      return {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
      };
    }

    if (classification === 'dangerous') {
      return {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
      };
    }

    if (classification === 'unclear') {
      return {
        answer: 'ขออภัย คำถามของคุณไม่ชัดเจน กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        relatedCourses: [],
      };
    }

    return null;
  }
}
