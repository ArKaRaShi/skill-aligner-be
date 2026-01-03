import { Test, TestingModule } from '@nestjs/testing';

import { Identifier } from 'src/shared/domain/value-objects/identifier';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/infrastructure/llm/contracts/i-llm-router-service.contract';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from '../../contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from '../../contracts/i-course-repository.contract';
import { FindCoursesWithLosBySkillsWithFilterParams } from '../../contracts/i-course-retriever-service.contract';
import {
  LearningOutcome,
  MatchedLearningOutcome,
} from '../../types/course-learning-outcome-v2.type';
import {
  Course,
  CourseWithLearningOutcomeV2Match,
} from '../../types/course.type';
import { CourseRetrieverService } from '../course-retriever.service';

jest.mock('@toon-format/toon', () => ({
  encode: jest.fn((data) => JSON.stringify(data)),
}));

const baseDate = new Date('2024-01-01T00:00:00.000Z');

const buildLearningOutcome = (
  overrides: Partial<LearningOutcome> = {},
): LearningOutcome => ({
  loId: 'lo-1' as Identifier,
  originalName: 'Original',
  cleanedName: 'Cleaned',
  skipEmbedding: false,
  hasEmbedding768: true,
  hasEmbedding1536: false,
  createdAt: baseDate,
  updatedAt: baseDate,
  ...overrides,
});

const buildMatchedLearningOutcome = (
  overrides: Partial<MatchedLearningOutcome> = {},
): MatchedLearningOutcome => ({
  ...buildLearningOutcome(),
  similarityScore: 0.9,
  ...overrides,
});

const buildCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1' as Identifier,
  campusId: 'campus-1' as Identifier,
  facultyId: 'faculty-1' as Identifier,
  subjectCode: 'CS101',
  subjectName: 'Intro to CS',
  isGenEd: true,
  courseLearningOutcomes: [buildLearningOutcome()],
  courseOfferings: [],
  courseClickLogs: [],
  metadata: null,
  createdAt: baseDate,
  updatedAt: baseDate,
  ...overrides,
});

const embeddingConfiguration = {
  model: 'e5-base',
  provider: 'e5',
  dimension: 768,
} as const;

describe('CourseRetrieverService', () => {
  let service: CourseRetrieverService;
  let courseRepository: jest.Mocked<ICourseRepository>;
  let loRepository: jest.Mocked<ICourseLearningOutcomeRepository>;

  beforeEach(async () => {
    courseRepository = {
      findCoursesBySkillsViaLO: jest.fn(),
      findCourseByLearningOutcomeIds: jest.fn(),
      findByIdOrThrow: jest.fn(),
    } as jest.Mocked<ICourseRepository>;

    loRepository = {
      findLosBySkills: jest.fn(),
    } as jest.Mocked<ICourseLearningOutcomeRepository>;

    const mockLlmRouter: Partial<jest.Mocked<ILlmRouterService>> = {
      generateText: jest.fn(),
      generateObject: jest.fn().mockResolvedValue({
        object: { learning_outcomes: [] },
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
    } as Partial<jest.Mocked<ILlmRouterService>>;

    const mockAppConfigService = {
      filterLoLlmModel: jest.fn().mockReturnValue('gpt-4'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRetrieverService,
        { provide: I_COURSE_REPOSITORY_TOKEN, useValue: courseRepository },
        {
          provide: I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
          useValue: loRepository,
        },
        { provide: I_LLM_ROUTER_SERVICE_TOKEN, useValue: mockLlmRouter },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    }).compile();

    service = module.get(CourseRetrieverService);
  });

  const baseParams: FindCoursesWithLosBySkillsWithFilterParams = {
    skills: ['skill1', 'skill2'],
    embeddingConfiguration,
    loThreshold: 0.5,
    topNLos: 10,
    enableLlmFilter: false,
  };

  describe('getCoursesWithLosBySkillsWithFilter', () => {
    it('returns empty arrays per skill when no learning outcomes are found', async () => {
      loRepository.findLosBySkills.mockResolvedValue(
        new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
      );

      const result =
        await service.getCoursesWithLosBySkillsWithFilter(baseParams);

      expect(result).toEqual(
        new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
      );
      expect(
        courseRepository.findCourseByLearningOutcomeIds,
      ).not.toHaveBeenCalled();
    });

    it('aggregates courses by skill and merges matched learning outcomes per course', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });
      const lo2 = buildMatchedLearningOutcome({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.8,
      });

      loRepository.findLosBySkills.mockResolvedValue(
        new Map([
          ['skill1', [lo1, lo2]],
          ['skill2', []],
        ]),
      );

      const course = buildCourse({
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-1' as Identifier }),
          buildLearningOutcome({ loId: 'lo-2' as Identifier }),
        ],
      });

      courseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, Course[]>([
          ['lo-1' as Identifier, [course]],
          ['lo-2' as Identifier, [course]],
        ]),
      );

      const result =
        await service.getCoursesWithLosBySkillsWithFilter(baseParams);

      const matches = result.get('skill1');
      expect(matches).toHaveLength(1);

      const [courseMatch] = matches as CourseWithLearningOutcomeV2Match[];
      expect(courseMatch.id).toBe(course.id);
      expect(courseMatch.matchedLearningOutcomes).toHaveLength(2);
      expect(courseMatch.matchedLearningOutcomes.map((lo) => lo.loId)).toEqual([
        'lo-1',
        'lo-2',
      ]);
      expect(courseMatch.remainingLearningOutcomes).toHaveLength(1);
      expect(courseMatch.allLearningOutcomes).toHaveLength(2);
    });
  });
});
