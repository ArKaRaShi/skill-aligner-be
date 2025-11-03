import { Inject, Injectable } from '@nestjs/common';

import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from 'src/modules/course/contracts/i-course.repository';

import {
  I_ANSWER_GENERATOR_SERVICE_TOKEN,
  IAnswerGeneratorService,
} from '../contracts/i-answer-generator-service.contract';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { Classification } from '../types/question-classification.type';
import { AnswerQuestionUseCaseOutput } from './types/answer-question.use-case.type';

// TODO: Implement the IUseCase interface
@Injectable()
export class AnswerQuestionUseCase {
  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
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
    const [{ classification, reason }, { skills }] = await Promise.all([
      this.questionClassifierService.classify(question),
      this.skillExpanderService.expandSkills(question),
    ]);

    console.log(
      'Question classification result:',
      JSON.stringify({ classification, reason }, null, 2),
    );
    console.log(
      'Expanded skills from question:',
      JSON.stringify(skills, null, 2),
    );

    const fallbackResponse =
      this.getFallbackAnswerForClassification(classification);

    if (fallbackResponse) {
      return fallbackResponse;
    }

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
