import { Test, TestingModule } from '@nestjs/testing';

import { ILlmRouterService } from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';

import {
  FindLosByQueryOutput,
  FindLosBySkillsOutput,
  ICourseLearningOutcomeRepository,
} from '../../contracts/i-course-learning-outcome-repository.contract';
import { ICourseRepository } from '../../contracts/i-course-repository.contract';
import {
  FindCoursesWithLosBySkillsWithFilterParams,
  FindLosByQueryWithFilterParams,
} from '../../contracts/i-course-retriever-service.contract';
import {
  LearningOutcome,
  MatchedLearningOutcome,
} from '../../types/course-learning-outcome-v2.type';
import {
  Course,
  CourseWithLearningOutcomeV2Match,
} from '../../types/course.type';
import { CourseRetrieverService } from '../course-retriever.service';

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
      findLosByQuery: jest.fn(),
    } as jest.Mocked<ICourseLearningOutcomeRepository>;

    const mockLlmRouter: Partial<jest.Mocked<ILlmRouterService>> = {
      generateText: jest.fn(),
      generateObject: jest.fn().mockResolvedValue({
        object: { learning_outcomes: [] },
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
    } as Partial<jest.Mocked<ILlmRouterService>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CourseRetrieverService,
          useFactory: () => {
            return new CourseRetrieverService(
              courseRepository,
              loRepository,
              mockLlmRouter as jest.Mocked<ILlmRouterService>,
              'e5-base', // embeddingModel
              'local', // embeddingProvider (optional, but we provide it)
              'gpt-4', // filterLoLlmModel
            );
          },
        },
      ],
    }).compile();

    service = module.get(CourseRetrieverService);
  });

  const baseParams: FindCoursesWithLosBySkillsWithFilterParams = {
    skills: ['skill1', 'skill2'],
    loThreshold: 0.5,
    topNLos: 10,
    enableLlmFilter: false,
  };

  describe('getCoursesWithLosBySkillsWithFilter', () => {
    it('returns empty arrays per skill when no learning outcomes are found', async () => {
      const mockOutput: FindLosBySkillsOutput = {
        losBySkill: new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
        embeddingUsage: {
          bySkill: [
            {
              skill: 'skill1',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill1',
              generatedAt: new Date().toISOString(),
              promptTokens: 0,
              totalTokens: 0,
            },
            {
              skill: 'skill2',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill2',
              generatedAt: new Date().toISOString(),
              promptTokens: 0,
              totalTokens: 0,
            },
          ],
          totalTokens: 0,
        },
      };
      loRepository.findLosBySkills.mockResolvedValue(mockOutput);

      const result =
        await service.getCoursesWithLosBySkillsWithFilter(baseParams);

      expect(result.coursesBySkill).toEqual(
        new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
      );
      expect(
        courseRepository.findCourseByLearningOutcomeIds,
      ).not.toHaveBeenCalled();
    });

    it('passes through embedding usage metadata from repository', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });

      const mockOutput: FindLosBySkillsOutput = {
        losBySkill: new Map([
          ['skill1', [lo1]],
          ['skill2', []],
        ]),
        embeddingUsage: {
          bySkill: [
            {
              skill: 'skill1',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill1',
              generatedAt: '2024-01-01T00:00:00.000Z',
              promptTokens: 5,
              totalTokens: 5,
            },
            {
              skill: 'skill2',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill2',
              generatedAt: '2024-01-01T00:00:01.000Z',
              promptTokens: 6,
              totalTokens: 6,
            },
          ],
          totalTokens: 11,
        },
      };
      loRepository.findLosBySkills.mockResolvedValue(mockOutput);

      const course = buildCourse({
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-1' as Identifier }),
        ],
      });

      courseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, Course[]>([['lo-1' as Identifier, [course]]]),
      );

      const result =
        await service.getCoursesWithLosBySkillsWithFilter(baseParams);

      // Verify embedding metadata is passed through correctly
      expect(result.embeddingUsage.bySkill).toHaveLength(2);
      expect(result.embeddingUsage.bySkill[0]).toEqual({
        skill: 'skill1',
        model: 'e5-base',
        provider: 'e5',
        dimension: 768,
        embeddedText: 'skill1',
        generatedAt: '2024-01-01T00:00:00.000Z',
        promptTokens: 5,
        totalTokens: 5,
      });
      expect(result.embeddingUsage.bySkill[1]).toEqual({
        skill: 'skill2',
        model: 'e5-base',
        provider: 'e5',
        dimension: 768,
        embeddedText: 'skill2',
        generatedAt: '2024-01-01T00:00:01.000Z',
        promptTokens: 6,
        totalTokens: 6,
      });
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

      const mockOutput: FindLosBySkillsOutput = {
        losBySkill: new Map([
          ['skill1', [lo1, lo2]],
          ['skill2', []],
        ]),
        embeddingUsage: {
          bySkill: [
            {
              skill: 'skill1',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill1',
              generatedAt: new Date().toISOString(),
              promptTokens: 0,
              totalTokens: 0,
            },
            {
              skill: 'skill2',
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'skill2',
              generatedAt: new Date().toISOString(),
              promptTokens: 0,
              totalTokens: 0,
            },
          ],
          totalTokens: 0,
        },
      };
      loRepository.findLosBySkills.mockResolvedValue(mockOutput);

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

      const matches = result.coursesBySkill.get('skill1');
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

  const baseQueryParams: FindLosByQueryWithFilterParams = {
    query: 'test query',
    loThreshold: 0.5,
    topNLos: 10,
  };

  describe('getCoursesByQuery', () => {
    it('returns empty courses array when no learning outcomes are found', async () => {
      const mockOutput: FindLosByQueryOutput = {
        learningOutcomes: [],
        embeddingUsage: {
          query: 'test query',
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 0,
          totalTokens: 0,
        },
      };
      loRepository.findLosByQuery.mockResolvedValue(mockOutput);

      const result = await service.getCoursesByQuery(baseQueryParams);

      expect(result.courses).toEqual([]);
      expect(
        courseRepository.findCourseByLearningOutcomeIds,
      ).not.toHaveBeenCalled();
    });

    it('passes through embedding usage metadata from repository', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });

      const mockOutput: FindLosByQueryOutput = {
        learningOutcomes: [lo1],
        embeddingUsage: {
          query: 'test query',
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          embeddedText: 'test query',
          generatedAt: '2024-01-01T00:00:00.000Z',
          promptTokens: 5,
          totalTokens: 5,
        },
      };
      loRepository.findLosByQuery.mockResolvedValue(mockOutput);

      const course = buildCourse({
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-1' as Identifier }),
        ],
      });

      courseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, Course[]>([['lo-1' as Identifier, [course]]]),
      );

      const result = await service.getCoursesByQuery(baseQueryParams);

      // Verify embedding metadata is passed through correctly
      expect(result.embeddingUsage).toEqual({
        query: 'test query',
        model: 'e5-base',
        provider: 'local',
        dimension: 768,
        embeddedText: 'test query',
        generatedAt: '2024-01-01T00:00:00.000Z',
        promptTokens: 5,
        totalTokens: 5,
      });
    });

    it('aggregates courses with matched learning outcomes', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });
      const lo2 = buildMatchedLearningOutcome({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.8,
      });

      const mockOutput: FindLosByQueryOutput = {
        learningOutcomes: [lo1, lo2],
        embeddingUsage: {
          query: 'test query',
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 0,
          totalTokens: 0,
        },
      };
      loRepository.findLosByQuery.mockResolvedValue(mockOutput);

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

      const result = await service.getCoursesByQuery(baseQueryParams);

      expect(result.courses).toHaveLength(1);
      const [courseMatch] = result.courses;
      expect(courseMatch.id).toBe(course.id);
      expect(courseMatch.matchedLearningOutcomes).toHaveLength(2);
      expect(courseMatch.matchedLearningOutcomes.map((lo) => lo.loId)).toEqual([
        'lo-1',
        'lo-2',
      ]);
      expect(courseMatch.remainingLearningOutcomes).toHaveLength(1);
      expect(courseMatch.allLearningOutcomes).toHaveLength(2);
    });

    it('sorts courses by highest similarity score', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.7,
      });
      const lo2 = buildMatchedLearningOutcome({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.95,
      });

      const mockOutput: FindLosByQueryOutput = {
        learningOutcomes: [lo1, lo2],
        embeddingUsage: {
          query: 'test query',
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 0,
          totalTokens: 0,
        },
      };
      loRepository.findLosByQuery.mockResolvedValue(mockOutput);

      const course1 = buildCourse({
        id: 'course-1' as Identifier,
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-1' as Identifier }),
        ],
      });
      const course2 = buildCourse({
        id: 'course-2' as Identifier,
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-2' as Identifier }),
        ],
      });

      courseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, Course[]>([
          ['lo-1' as Identifier, [course1]],
          ['lo-2' as Identifier, [course2]],
        ]),
      );

      const result = await service.getCoursesByQuery(baseQueryParams);

      expect(result.courses).toHaveLength(2);
      // course2 has higher similarity (0.95) than course1 (0.7)
      expect(result.courses[0].id).toBe('course-2');
      expect(result.courses[1].id).toBe('course-1');

      // Verify scores are correctly calculated
      expect(result.courses[0].matchedLearningOutcomes[0].similarityScore).toBe(
        0.95,
      );
      expect(result.courses[1].matchedLearningOutcomes[0].similarityScore).toBe(
        0.7,
      );
    });

    it('handles multiple courses with different learning outcomes', async () => {
      const lo1 = buildMatchedLearningOutcome({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.85,
      });
      const lo2 = buildMatchedLearningOutcome({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.75,
      });

      const mockOutput: FindLosByQueryOutput = {
        learningOutcomes: [lo1, lo2],
        embeddingUsage: {
          query: 'test query',
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 0,
          totalTokens: 0,
        },
      };
      loRepository.findLosByQuery.mockResolvedValue(mockOutput);

      const course1 = buildCourse({
        id: 'course-1' as Identifier,
        subjectName: 'Course 1',
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-1' as Identifier }),
        ],
      });
      const course2 = buildCourse({
        id: 'course-2' as Identifier,
        subjectName: 'Course 2',
        courseLearningOutcomes: [
          buildLearningOutcome({ loId: 'lo-2' as Identifier }),
        ],
      });

      courseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, Course[]>([
          ['lo-1' as Identifier, [course1]],
          ['lo-2' as Identifier, [course2]],
        ]),
      );

      const result = await service.getCoursesByQuery(baseQueryParams);

      expect(result.courses).toHaveLength(2);
      expect(result.courses.map((c) => c.subjectName)).toEqual([
        'Course 1',
        'Course 2',
      ]);
      expect(result.courses[0].matchedLearningOutcomes).toHaveLength(1);
      expect(result.courses[1].matchedLearningOutcomes).toHaveLength(1);
    });
  });
});
