import { Test, TestingModule } from '@nestjs/testing';

import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from '../../contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from '../../contracts/i-course-repository.contract';
import { LearningOutcomeMatch } from '../../types/course-learning-outcome-v2.type';
import { CourseWithLearningOutcomeV2Match } from '../../types/course.type';
import { CourseRetrieverService } from '../course-retriever.service';

const createMockLearningOutcomeMatch = (
  overrides: Partial<LearningOutcomeMatch> = {},
): LearningOutcomeMatch => ({
  loId: 'lo-1' as Identifier,
  originalNameTh: 'Original LO TH',
  originalNameEn: 'Original LO EN',
  cleanedNameTh: 'Cleaned LO TH',
  cleanedNameEn: 'Cleaned LO EN',
  skipEmbedding: false,
  hasEmbedding768: true,
  hasEmbedding1536: false,
  metadata: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  similarityScore: 0.85,
  ...overrides,
});

const createMockCourseWithLearningOutcomeV2Match = (
  overrides: Partial<CourseWithLearningOutcomeV2Match> = {},
): CourseWithLearningOutcomeV2Match => ({
  courseId: 'course-1' as Identifier,
  campusId: 'campus-1' as Identifier,
  facultyId: 'faculty-1' as Identifier,
  academicYear: 2024,
  semester: 1,
  subjectCode: 'SUBJ101',
  subjectNameTh: 'Subject TH',
  subjectNameEn: 'Subject EN',
  metadata: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  learningOutcomeMatch: createMockLearningOutcomeMatch(),
  learningOutcomes: [createMockLearningOutcomeMatch()],
  ...overrides,
});

describe('CourseRetrieverService', () => {
  let service: CourseRetrieverService;
  let mockCourseRepository: jest.Mocked<ICourseRepository>;
  let mockCourseLearningOutcomeRepository: jest.Mocked<ICourseLearningOutcomeRepository>;

  beforeEach(async () => {
    mockCourseRepository = {
      findCoursesBySkillsViaLO: jest.fn(),
      findCourseByLearningOutcomeIds: jest.fn(),
      findByIdOrThrow: jest.fn(),
    } as jest.Mocked<ICourseRepository>;

    mockCourseLearningOutcomeRepository = {
      findLosBySkills: jest.fn(),
    } as jest.Mocked<ICourseLearningOutcomeRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRetrieverService,
        {
          provide: I_COURSE_REPOSITORY_TOKEN,
          useValue: mockCourseRepository,
        },
        {
          provide: I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
          useValue: mockCourseLearningOutcomeRepository,
        },
      ],
    }).compile();

    service = module.get<CourseRetrieverService>(CourseRetrieverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCoursesBySkillsWithFilter', () => {
    it('should return empty map when no learning outcomes found for skills', async () => {
      // Arrange
      const skills = ['skill1', 'skill2'];
      const params = {
        skills,
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768 as const,
      };

      mockCourseLearningOutcomeRepository.findLosBySkills.mockResolvedValue(
        new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
      );

      // Act
      const result = await service.getCoursesBySkillsWithFilter(params);

      // Assert
      expect(result).toEqual(
        new Map([
          ['skill1', []],
          ['skill2', []],
        ]),
      );
      expect(
        mockCourseLearningOutcomeRepository.findLosBySkills,
      ).toHaveBeenCalledWith(params);
      expect(
        mockCourseRepository.findCourseByLearningOutcomeIds,
      ).not.toHaveBeenCalled();
    });

    it('should return courses grouped by skills with learning outcome matches', async () => {
      // Arrange
      const skills = ['skill1', 'skill2'];
      const learningOutcome1 = createMockLearningOutcomeMatch({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });
      const learningOutcome2 = createMockLearningOutcomeMatch({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.8,
      });
      const learningOutcome3 = createMockLearningOutcomeMatch({
        loId: 'lo-3' as Identifier,
        similarityScore: 0.7,
      });

      const course1 = createMockCourseWithLearningOutcomeV2Match({
        courseId: 'course-1' as Identifier,
        subjectCode: 'CS101',
      });
      const course2 = createMockCourseWithLearningOutcomeV2Match({
        courseId: 'course-2' as Identifier,
        subjectCode: 'CS102',
      });

      const params = {
        skills,
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768 as const,
      };

      mockCourseLearningOutcomeRepository.findLosBySkills.mockResolvedValue(
        new Map([
          ['skill1', [learningOutcome1, learningOutcome2]],
          ['skill2', [learningOutcome3]],
        ]),
      );

      mockCourseRepository.findCourseByLearningOutcomeIds
        .mockResolvedValueOnce(
          new Map<Identifier, CourseWithLearningOutcomeV2Match[]>([
            ['lo-1' as Identifier, [course1]],
            ['lo-2' as Identifier, [course2]],
          ]),
        )
        .mockResolvedValueOnce(
          new Map<Identifier, CourseWithLearningOutcomeV2Match[]>([
            ['lo-3' as Identifier, [course1, course2]],
          ]),
        );

      // Act
      const result = await service.getCoursesBySkillsWithFilter(params);

      // Assert
      expect(
        mockCourseLearningOutcomeRepository.findLosBySkills,
      ).toHaveBeenCalledWith(params);
      expect(
        mockCourseRepository.findCourseByLearningOutcomeIds,
      ).toHaveBeenCalledTimes(2);

      const skill1Results = result.get('skill1');
      const skill2Results = result.get('skill2');

      expect(skill1Results).toHaveLength(2);
      expect(skill2Results).toHaveLength(2);

      // Check skill1 results
      expect(skill1Results![0]).toMatchObject({
        courseId: 'course-1',
        subjectCode: 'CS101',
        learningOutcomeMatch: expect.objectContaining({
          loId: 'lo-1',
          similarityScore: 0.9,
        }),
        learningOutcomes: expect.arrayContaining([
          expect.objectContaining({
            loId: 'lo-1',
            similarityScore: 0.9,
          }),
        ]),
      });

      // Check skill2 results
      expect(skill2Results![0]).toMatchObject({
        courseId: 'course-1',
        subjectCode: 'CS101',
        learningOutcomeMatch: expect.objectContaining({
          loId: 'lo-3',
          similarityScore: 0.7,
        }),
        learningOutcomes: expect.arrayContaining([
          expect.objectContaining({
            loId: 'lo-3',
            similarityScore: 0.7,
          }),
        ]),
      });
    });

    it('should handle multiple learning outcomes for the same course', async () => {
      // Arrange
      const skills = ['skill1'];
      const learningOutcome1 = createMockLearningOutcomeMatch({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });
      const learningOutcome2 = createMockLearningOutcomeMatch({
        loId: 'lo-2' as Identifier,
        similarityScore: 0.8,
      });

      const course1 = createMockCourseWithLearningOutcomeV2Match({
        courseId: 'course-1' as Identifier,
        subjectCode: 'CS101',
      });

      const params = {
        skills,
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768 as const,
      };

      mockCourseLearningOutcomeRepository.findLosBySkills.mockResolvedValue(
        new Map([['skill1', [learningOutcome1, learningOutcome2]]]),
      );

      mockCourseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, CourseWithLearningOutcomeV2Match[]>([
          ['lo-1' as Identifier, [course1]],
          ['lo-2' as Identifier, [course1]],
        ]),
      );

      // Act
      const result = await service.getCoursesBySkillsWithFilter(params);

      // Assert
      const skill1Results = result.get('skill1');
      expect(skill1Results).toHaveLength(1);

      // The course should have both learning outcomes in the learningOutcomes array
      expect(skill1Results![0].learningOutcomes).toHaveLength(2);
      expect(skill1Results![0].learningOutcomes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ loId: 'lo-1' }),
          expect.objectContaining({ loId: 'lo-2' }),
        ]),
      );
    });

    it('should pass all filter parameters to repositories', async () => {
      // Arrange
      const skills = ['skill1'];
      const campusId = 'campus-1' as Identifier;
      const facultyId = 'faculty-1' as Identifier;
      const isGenEd = true;
      const academicYearSemesters = [{ academicYear: 2024, semesters: [1, 2] }];

      const params = {
        skills,
        threshold: 0.7,
        topN: 5,
        vectorDimension: 1536 as const,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      };

      const learningOutcome1 = createMockLearningOutcomeMatch({
        loId: 'lo-1' as Identifier,
        similarityScore: 0.9,
      });

      mockCourseLearningOutcomeRepository.findLosBySkills.mockResolvedValue(
        new Map([['skill1', [learningOutcome1]]]),
      );

      mockCourseRepository.findCourseByLearningOutcomeIds.mockResolvedValue(
        new Map<Identifier, CourseWithLearningOutcomeV2Match[]>([]),
      );

      // Act
      await service.getCoursesBySkillsWithFilter(params);

      // Assert
      expect(
        mockCourseLearningOutcomeRepository.findLosBySkills,
      ).toHaveBeenCalledWith(params);
      expect(
        mockCourseRepository.findCourseByLearningOutcomeIds,
      ).toHaveBeenCalledWith({
        learningOutcomeIds: ['lo-1' as Identifier],
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });
    });
  });
});
