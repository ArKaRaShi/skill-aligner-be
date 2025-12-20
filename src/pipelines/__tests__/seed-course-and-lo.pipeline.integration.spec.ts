import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

import { SeedCourseAndLoPipeline } from '../seed-course-and-lo.pipeline';

// Mock data for testing
const MOCK_CAMPUS1_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_CAMPUS2_ID = '22222222-2222-2222-2222-222222222222';
const MOCK_FACULTY1_ID = '33333333-3333-3333-3333-333333333333';
const MOCK_FACULTY2_ID = '44444444-4444-4444-4444-444444444444';
const MOCK_COURSE1_ID = '66666666-6666-6666-6666-666666666661';

const mockCleanCoursesWithCLO: CleanCourseWithCLO[] = [
  {
    academic_year: 2024,
    semester: 1,
    campus_code: 'CAMPUS1',
    faculty_code: 'FACULTY1',
    subject_code: 'CS101',
    subject_name_th: 'คอมพิวเตอร์วิทยา 1',
    clo_no: 1,
    original_clo_name_th: 'เขียนโปรแกรมพื้นฐาน',
    clean_clo_name_th: 'เขียนโปรแกรมพื้นฐาน',
    skipEmbedding: false,
    keywords: ['programming', 'basic'],
  },
  {
    academic_year: 2024,
    semester: 2,
    campus_code: 'CAMPUS2',
    faculty_code: 'FACULTY2',
    subject_code: 'MATH201',
    subject_name_th: 'คณิตศาสตร์ 1',
    clo_no: 1,
    original_clo_name_th: 'แคลคูลัส',
    clean_clo_name_th: 'แคลคูลัส',
    skipEmbedding: true,
    keywords: ['mathematics', 'calculus'],
  },
];

describe('SeedCourseAndLoPipeline (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: SeedCourseAndLoPipeline;
  let prisma: PrismaService;
  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [SeedCourseAndLoPipeline, PrismaService],
    }).compile();

    pipeline = moduleRef.get(SeedCourseAndLoPipeline);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcome_vectors, course_learning_outcomes, courses, faculties, campuses RESTART IDENTITY CASCADE;`;

    // Reset mock
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seedTestData() {
    // Create campuses
    await prisma.campus.create({
      data: {
        id: MOCK_CAMPUS1_ID,
        code: 'CAMPUS1',
        nameTh: 'วิทยาเขต 1',
        nameEn: 'Campus 1',
      },
    });

    await prisma.campus.create({
      data: {
        id: MOCK_CAMPUS2_ID,
        code: 'CAMPUS2',
        nameTh: 'วิทยาเขต 2',
        nameEn: 'Campus 2',
      },
    });

    // Create faculties with new one-to-many relationship
    await prisma.faculty.create({
      data: {
        id: MOCK_FACULTY1_ID,
        code: 'FACULTY1',
        nameTh: 'คณะ 1',
        nameEn: 'Faculty 1',
        campus: {
          connect: {
            id: MOCK_CAMPUS1_ID,
          },
        },
      },
    });

    await prisma.faculty.create({
      data: {
        id: MOCK_FACULTY2_ID,
        code: 'FACULTY2',
        nameTh: 'คณะ 2',
        nameEn: 'Faculty 2',
        campus: {
          connect: {
            id: MOCK_CAMPUS2_ID,
          },
        },
      },
    });
  }

  describe('findAllAndBuildCampusFacultyMap', () => {
    it('should build campus-faculty map with new one-to-many relationship', async () => {
      await seedTestData();

      const result = await pipeline.findAllAndBuildCampusFacultyMap();

      expect(result.size).toBe(2);

      // Check CAMPUS1-FACULTY1 mapping
      const campus1Faculty1Key = 'CAMPUS1-FACULTY1';
      const campus1Faculty1Mapping = result.get(campus1Faculty1Key);
      expect(campus1Faculty1Mapping).toBeDefined();
      expect(campus1Faculty1Mapping?.campusId).toBe(MOCK_CAMPUS1_ID);
      expect(campus1Faculty1Mapping?.facultyId).toBe(MOCK_FACULTY1_ID);

      // Check CAMPUS2-FACULTY2 mapping
      const campus2Faculty2Key = 'CAMPUS2-FACULTY2';
      const campus2Faculty2Mapping = result.get(campus2Faculty2Key);
      expect(campus2Faculty2Mapping).toBeDefined();
      expect(campus2Faculty2Mapping?.campusId).toBe(MOCK_CAMPUS2_ID);
      expect(campus2Faculty2Mapping?.facultyId).toBe(MOCK_FACULTY2_ID);
    });

    it('should return empty map when no faculties exist', async () => {
      const result = await pipeline.findAllAndBuildCampusFacultyMap();

      expect(result.size).toBe(0);
    });
  });

  describe('seedCourseAndLO', () => {
    it('should seed course and learning outcomes successfully', async () => {
      await seedTestData();

      // Create campus-faculty map
      const campusFacultyMap = new Map<
        string,
        { campusId: string; facultyId: string }
      >();
      campusFacultyMap.set('CAMPUS1-FACULTY1', {
        campusId: MOCK_CAMPUS1_ID,
        facultyId: MOCK_FACULTY1_ID,
      });

      const courseData = mockCleanCoursesWithCLO[0];

      await pipeline.seedCourseAndLO({
        course: courseData,
        campusFacultyMap,
      });

      // Verify course was created
      const course = await prisma.course.findUnique({
        where: { subjectCode: 'CS101' },
        include: {
          courseOfferings: true,
          courseLearningOutcomes: true,
        },
      });

      expect(course).toBeDefined();
      expect(course?.subjectCode).toBe('CS101');
      expect(course?.subjectName).toBe('คอมพิวเตอร์วิทยา 1');
      expect(course?.campusId).toBe(MOCK_CAMPUS1_ID);
      expect(course?.facultyId).toBe(MOCK_FACULTY1_ID);

      // Verify course offering was created
      expect(course?.courseOfferings).toHaveLength(1);
      const offering = course?.courseOfferings[0];
      expect(offering?.academicYear).toBe(2024);
      expect(offering?.semester).toBe(1);

      // Verify course learning outcome was created
      expect(course?.courseLearningOutcomes).toHaveLength(1);
      const clo = course?.courseLearningOutcomes[0];
      expect(clo?.cloNo).toBe(1);
      expect(clo?.originalCloName).toBe('เขียนโปรแกรมพื้นฐาน');
      expect(clo?.cleanedCloName).toBe('เขียนโปรแกรมพื้นฐาน');
      expect(clo?.skipEmbedding).toBe(false);
      expect(clo?.hasEmbedding768).toBe(false);
      expect(clo?.hasEmbedding1536).toBe(false);
    });

    it('should throw error when campus-faculty mapping is missing', async () => {
      const campusFacultyMap = new Map<
        string,
        { campusId: string; facultyId: string }
      >();
      const courseData = mockCleanCoursesWithCLO[0];

      await expect(
        pipeline.seedCourseAndLO({
          course: courseData,
          campusFacultyMap,
        }),
      ).rejects.toThrow('Missing campus/faculty mapping for CAMPUS1-FACULTY1');
    });
  });

  describe('execute', () => {
    it('should execute full pipeline with delete and seed options', async () => {
      await seedTestData();

      // Mock FileHelper to return our test data
      const { FileHelper } = await import(
        'src/modules/course/pipelines/helpers/file.helper'
      );
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockCleanCoursesWithCLO);

      await pipeline.execute({
        deleteExisting: true,
        seeds: true,
      });

      // Verify courses were created
      const courses = await prisma.course.findMany({
        include: {
          courseOfferings: true,
          courseLearningOutcomes: true,
        },
      });

      expect(courses).toHaveLength(2);

      // Verify first course
      const cs101Course = courses.find((c) => c.subjectCode === 'CS101');
      expect(cs101Course).toBeDefined();
      expect(cs101Course?.subjectName).toBe('คอมพิวเตอร์วิทยา 1');
      expect(cs101Course?.courseOfferings).toHaveLength(1);
      expect(cs101Course?.courseLearningOutcomes).toHaveLength(1);

      // Verify second course
      const math201Course = courses.find((c) => c.subjectCode === 'MATH201');
      expect(math201Course).toBeDefined();
      expect(math201Course?.subjectName).toBe('คณิตศาสตร์ 1');
      expect(math201Course?.courseOfferings).toHaveLength(1);
      expect(math201Course?.courseLearningOutcomes).toHaveLength(1);
    });

    it('should delete existing data when deleteExisting is true', async () => {
      // Seed some initial data
      await seedTestData();
      await prisma.course.create({
        data: {
          id: MOCK_COURSE1_ID,
          campusId: MOCK_CAMPUS1_ID,
          facultyId: MOCK_FACULTY1_ID,
          subjectCode: 'EXISTING',
          subjectName: 'Existing Course',
        },
      });

      // Mock FileHelper to return empty data
      const { FileHelper } = await import(
        'src/modules/course/pipelines/helpers/file.helper'
      );
      jest.spyOn(FileHelper, 'loadLatestJson').mockResolvedValue([]);

      await pipeline.execute({
        deleteExisting: true,
        seeds: false,
      });

      // Verify courses were deleted
      const courses = await prisma.course.findMany();
      expect(courses).toHaveLength(0);
    });

    it('should not seed when seeds is false', async () => {
      await seedTestData();

      // Mock FileHelper to return test data
      const { FileHelper } = await import(
        'src/modules/course/pipelines/helpers/file.helper'
      );
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockCleanCoursesWithCLO);

      await pipeline.execute({
        deleteExisting: false,
        seeds: false,
      });

      // Verify no courses were created
      const courses = await prisma.course.findMany();
      expect(courses).toHaveLength(0);
    });
  });

  describe('buildKey', () => {
    it('should build correct key from campus and faculty codes', () => {
      const key = pipeline.buildKey('CAMPUS1', 'FACULTY1');
      expect(key).toBe('CAMPUS1-FACULTY1');
    });
  });
});
