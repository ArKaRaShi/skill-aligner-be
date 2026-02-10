import { Test, TestingModule } from '@nestjs/testing';

import { QueryEmbeddingUsage } from 'src/shared/contracts/types/embedding-usage.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { I_CAMPUS_REPOSITORY_TOKEN } from 'src/modules/campus/contracts/i-campus-repository.contract';
import { Campus } from 'src/modules/campus/types/campus.type';
import { I_COURSE_RETRIEVER_SERVICE_TOKEN } from 'src/modules/course/contracts/i-course-retriever-service.contract';
import { I_FACULTY_REPOSITORY_TOKEN } from 'src/modules/faculty/contracts/i-faculty.contract';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

import {
  LearningOutcome,
  MatchedLearningOutcome,
} from '../../types/course-learning-outcome-v2.type';
import { CourseWithLearningOutcomeV2Match } from '../../types/course.type';
import { GetCoursesByQueryUseCase } from '../get-courses-by-query.use-case';
import { GetCoursesByQueryUseCaseInput } from '../types/get-courses-by-query.use-case.type';

// Helper to create Identifier from string for tests
const toId = (id: string): Identifier => id as Identifier;

// Mock all dependencies
const mockCourseRetrieverService = {
  getCoursesByQuery: jest.fn(),
};

const mockFacultyRepository = {
  findMany: jest.fn(),
};

const mockCampusRepository = {
  findMany: jest.fn(),
};

describe('GetCoursesByQueryUseCase', () => {
  let useCase: GetCoursesByQueryUseCase;

  // Test fixtures
  const defaultInput: GetCoursesByQueryUseCaseInput = {
    query: 'machine learning',
    loThreshold: 0.6,
    topNLos: 10,
  };

  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  const mockFaculties: Faculty[] = [
    {
      facultyId: toId('faculty-1'),
      code: 'ENG',
      nameEn: 'Engineering',
      nameTh: 'วิศวกรรม',
      createdAt: baseDate,
      updatedAt: baseDate,
      campuses: [],
      courses: [],
    },
    {
      facultyId: toId('faculty-2'),
      code: 'SCI',
      nameEn: 'Science',
      nameTh: 'วิทยาศาสตร์',
      createdAt: baseDate,
      updatedAt: baseDate,
      campuses: [],
      courses: [],
    },
  ];

  const mockCampuses: Campus[] = [
    {
      campusId: toId('campus-1'),
      code: 'B',
      nameEn: 'Bangkok',
      nameTh: 'กรุงเทพ',
      createdAt: baseDate,
      updatedAt: baseDate,
      faculties: [],
      courses: [],
    },
    {
      campusId: toId('campus-2'),
      code: 'CM',
      nameEn: 'Chiang Mai',
      nameTh: 'เชียงใหม่',
      createdAt: baseDate,
      updatedAt: baseDate,
      faculties: [],
      courses: [],
    },
  ];

  const buildLearningOutcome = (
    overrides: Partial<LearningOutcome> = {},
  ): LearningOutcome => ({
    loId: toId('lo-1'),
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
    similarityScore: 0.85,
    ...overrides,
  });

  const mockCourseWithMatch: CourseWithLearningOutcomeV2Match = {
    id: toId('course-1'),
    campusId: toId('campus-1'),
    facultyId: toId('faculty-1'),
    subjectCode: 'CS101',
    subjectName: 'Intro to CS',
    isGenEd: true,
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    matchedLearningOutcomes: [
      buildMatchedLearningOutcome({
        loId: toId('lo-1'),
        similarityScore: 0.9,
      }),
      buildMatchedLearningOutcome({
        loId: toId('lo-2'),
        similarityScore: 0.75,
      }),
    ],
    remainingLearningOutcomes: [buildLearningOutcome({ loId: toId('lo-3') })],
    allLearningOutcomes: [
      buildMatchedLearningOutcome({ loId: toId('lo-1'), similarityScore: 0.9 }),
      buildMatchedLearningOutcome({
        loId: toId('lo-2'),
        similarityScore: 0.75,
      }),
      buildLearningOutcome({ loId: toId('lo-3') }),
    ],
  };

  const mockEmbeddingUsage: QueryEmbeddingUsage = {
    query: 'machine learning',
    model: 'e5-base',
    provider: 'local',
    dimension: 768,
    embeddedText: 'machine learning',
    generatedAt: baseDate.toISOString(),
    promptTokens: 5,
    totalTokens: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCoursesByQueryUseCase,
        {
          provide: I_COURSE_RETRIEVER_SERVICE_TOKEN,
          useValue: mockCourseRetrieverService,
        },
        {
          provide: I_FACULTY_REPOSITORY_TOKEN,
          useValue: mockFacultyRepository,
        },
        {
          provide: I_CAMPUS_REPOSITORY_TOKEN,
          useValue: mockCampusRepository,
        },
      ],
    }).compile();

    useCase = module.get(GetCoursesByQueryUseCase);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return courses with similarity scores', async () => {
      // Arrange
      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [mockCourseWithMatch],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]).toMatchObject({
        id: toId('course-1'),
        subjectCode: 'CS101',
        subjectName: 'Intro to CS',
        score: 0.9, // Max similarity score
        totalClicks: 0,
      });

      // Verify campus and faculty are populated
      expect(result.courses[0].campus).toEqual(mockCampuses[0]);
      expect(result.courses[0].faculty).toEqual(mockFaculties[0]);

      // Verify matchedLearningOutcomes with similarity scores
      expect(result.courses[0].matchedLearningOutcomes).toHaveLength(2);
      expect(result.courses[0].matchedLearningOutcomes[0].similarityScore).toBe(
        0.9,
      );
      expect(result.courses[0].matchedLearningOutcomes[1].similarityScore).toBe(
        0.75,
      );

      // Verify embedding usage is returned
      expect(result.embeddingUsage).toEqual(mockEmbeddingUsage);

      // Verify service calls
      expect(mockCourseRetrieverService.getCoursesByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'machine learning',
          loThreshold: 0.6,
          topNLos: 10,
        }),
      );
      expect(mockFacultyRepository.findMany).toHaveBeenCalled();
      expect(mockCampusRepository.findMany).toHaveBeenCalledWith({
        includeFaculties: false,
      });
    });

    it('should handle empty course results', async () => {
      // Arrange
      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert
      expect(result.courses).toEqual([]);
      expect(result.embeddingUsage).toEqual(mockEmbeddingUsage);
    });

    it('should handle courses with no matched learning outcomes', async () => {
      // Arrange
      const courseWithNoMatches: CourseWithLearningOutcomeV2Match = {
        ...mockCourseWithMatch,
        matchedLearningOutcomes: [],
      };

      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [courseWithNoMatches],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert
      expect(result.courses[0].matchedLearningOutcomes).toEqual([]);
      expect(result.courses[0].score).toBe(0);
    });

    it('should handle multiple courses with different similarity scores', async () => {
      // Arrange
      const course1: CourseWithLearningOutcomeV2Match = {
        ...mockCourseWithMatch,
        id: toId('course-1'),
        matchedLearningOutcomes: [
          buildMatchedLearningOutcome({ similarityScore: 0.9 }),
        ],
      };
      const course2: CourseWithLearningOutcomeV2Match = {
        ...mockCourseWithMatch,
        id: toId('course-2'),
        campusId: toId('campus-2'),
        facultyId: toId('faculty-2'),
        matchedLearningOutcomes: [
          buildMatchedLearningOutcome({ similarityScore: 0.7 }),
          buildMatchedLearningOutcome({ similarityScore: 0.85 }),
        ],
      };

      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [course1, course2],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert
      expect(result.courses).toHaveLength(2);
      expect(result.courses[0].score).toBe(0.9); // Max of [0.9]
      expect(result.courses[1].score).toBe(0.85); // Max of [0.7, 0.85]

      // Verify correct campus/faculty mapping
      expect(result.courses[0].campus.campusId).toBe(toId('campus-1'));
      expect(result.courses[1].campus.campusId).toBe(toId('campus-2'));
    });

    it('should handle missing campus or faculty gracefully', async () => {
      // Arrange
      const courseWithInvalidIds: CourseWithLearningOutcomeV2Match = {
        ...mockCourseWithMatch,
        campusId: toId('invalid-campus'),
        facultyId: toId('invalid-faculty'),
      };

      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [courseWithInvalidIds],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert - should return empty objects for missing entities
      expect(result.courses[0].campus).toEqual({});
      expect(result.courses[0].faculty).toEqual({});
    });

    it('should pass all filters to the service', async () => {
      // Arrange
      const inputWithFilters: GetCoursesByQueryUseCaseInput = {
        query: 'data science',
        campusId: toId('campus-1'),
        facultyId: toId('faculty-1'),
        isGenEd: true,
        academicYearSemesters: [
          { academicYear: 2024, semesters: [1, 2] },
          { academicYear: 2023 },
        ],
        loThreshold: 0.7,
        topNLos: 5,
      };

      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      await useCase.execute(inputWithFilters);

      // Assert
      expect(mockCourseRetrieverService.getCoursesByQuery).toHaveBeenCalledWith(
        {
          query: 'data science',
          campusId: toId('campus-1'),
          facultyId: toId('faculty-1'),
          isGenEd: true,
          academicYearSemesters: [
            { academicYear: 2024, semesters: [1, 2] },
            { academicYear: 2023 },
          ],
          loThreshold: 0.7,
          topNLos: 5,
        },
      );
    });
  });

  describe('transformToCourseViews', () => {
    it('should populate all CourseViewWithSimilarity fields correctly', async () => {
      // Arrange
      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [mockCourseWithMatch],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert - verify all required fields are present
      const courseView = result.courses[0];
      expect(courseView).toHaveProperty('id');
      expect(courseView).toHaveProperty('campus');
      expect(courseView).toHaveProperty('faculty');
      expect(courseView).toHaveProperty('subjectCode');
      expect(courseView).toHaveProperty('subjectName');
      expect(courseView).toHaveProperty('isGenEd');
      expect(courseView).toHaveProperty('courseLearningOutcomes');
      expect(courseView).toHaveProperty('courseOfferings');
      expect(courseView).toHaveProperty('matchedLearningOutcomes');
      expect(courseView).toHaveProperty('totalClicks');
      expect(courseView).toHaveProperty('score');
      expect(courseView).toHaveProperty('createdAt');
      expect(courseView).toHaveProperty('updatedAt');

      // Verify specific values
      expect(courseView.courseLearningOutcomes).toEqual(
        mockCourseWithMatch.allLearningOutcomes,
      );
      expect(courseView.courseOfferings).toEqual([]);
      expect(courseView.totalClicks).toBe(0);
    });

    it('should calculate score as max similarity from matched LOs', async () => {
      // Arrange
      const courseWithMultipleScores: CourseWithLearningOutcomeV2Match = {
        ...mockCourseWithMatch,
        matchedLearningOutcomes: [
          buildMatchedLearningOutcome({ similarityScore: 0.5 }),
          buildMatchedLearningOutcome({ similarityScore: 0.95 }),
          buildMatchedLearningOutcome({ similarityScore: 0.8 }),
        ],
      };

      mockCourseRetrieverService.getCoursesByQuery.mockResolvedValue({
        courses: [courseWithMultipleScores],
        embeddingUsage: mockEmbeddingUsage,
      });
      mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
      mockCampusRepository.findMany.mockResolvedValue(mockCampuses);

      // Act
      const result = await useCase.execute(defaultInput);

      // Assert
      expect(result.courses[0].score).toBe(0.95); // Max of [0.5, 0.95, 0.8]
    });
  });
});
