import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

import { SeedCourseAndLoPipelineV2 } from '../seed-course-and-lo.pipeline.v2';

// Mock data for testing - same as v1 to ensure equivalent results
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

// Additional test case: same course with multiple offerings and CLOs
const mockCleanCoursesWithMultipleCLOs: CleanCourseWithCLO[] = [
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
    campus_code: 'CAMPUS1',
    faculty_code: 'FACULTY1',
    subject_code: 'CS101',
    subject_name_th: 'คอมพิวเตอร์วิทยา 1',
    clo_no: 2,
    original_clo_name_th: 'ออกแบบอัลกอริทึม',
    clean_clo_name_th: 'ออกแบบอัลกอริทึม',
    skipEmbedding: false,
    keywords: ['algorithms', 'design'],
  },
  {
    academic_year: 2024,
    semester: 1,
    campus_code: 'CAMPUS1',
    faculty_code: 'FACULTY1',
    subject_code: 'CS101',
    subject_name_th: 'คอมพิวเตอร์วิทยา 1',
    clo_no: 3,
    original_clo_name_th: 'ทดสอบโปรแกรม',
    clean_clo_name_th: 'ทดสอบโปรแกรม',
    skipEmbedding: false,
    keywords: ['testing'],
  },
];

describe('SeedCourseAndLoPipelineV2 (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: SeedCourseAndLoPipelineV2;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        SeedCourseAndLoPipelineV2,
        PrismaService,
        AppConfigService,
        ConfigService,
      ],
    }).compile();

    pipeline = moduleRef.get(SeedCourseAndLoPipelineV2);
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

  describe('groupCoursesBySubjectCode', () => {
    it('should group courses by subjectCode correctly', async () => {
      await seedTestData();
      const campusFacultyMap = await pipeline.findAllAndBuildCampusFacultyMap();

      const result = pipeline['groupCoursesBySubjectCode'](
        mockCleanCoursesWithCLO,
        campusFacultyMap,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.courseGroups.size).toBe(2);

      // Check CS101 group
      const cs101Group = result.courseGroups.get('CS101');
      expect(cs101Group).toBeDefined();
      expect(cs101Group?.subjectCode).toBe('CS101');
      expect(cs101Group?.subjectName).toBe('คอมพิวเตอร์วิทยา 1');
      expect(cs101Group?.campusId).toBe(MOCK_CAMPUS1_ID);
      expect(cs101Group?.facultyId).toBe(MOCK_FACULTY1_ID);
      expect(cs101Group?.offerings).toHaveLength(1);
      expect(cs101Group?.clos).toHaveLength(1);
      expect(cs101Group?.offerings[0]).toEqual({
        academicYear: 2024,
        semester: 1,
      });
      expect(cs101Group?.clos[0]).toEqual({
        cloNo: 1,
        originalCloName: 'เขียนโปรแกรมพื้นฐาน',
        cleanedCloName: 'เขียนโปรแกรมพื้นฐาน',
        skipEmbedding: false,
      });

      // Check MATH201 group
      const math201Group = result.courseGroups.get('MATH201');
      expect(math201Group).toBeDefined();
      expect(math201Group?.subjectCode).toBe('MATH201');
      expect(math201Group?.subjectName).toBe('คณิตศาสตร์ 1');
      expect(math201Group?.campusId).toBe(MOCK_CAMPUS2_ID);
      expect(math201Group?.facultyId).toBe(MOCK_FACULTY2_ID);
      expect(math201Group?.offerings).toHaveLength(1);
      expect(math201Group?.clos).toHaveLength(1);
    });

    it('should aggregate multiple offerings and CLOs for same subjectCode', async () => {
      await seedTestData();
      const campusFacultyMap = await pipeline.findAllAndBuildCampusFacultyMap();

      const result = pipeline['groupCoursesBySubjectCode'](
        mockCleanCoursesWithMultipleCLOs,
        campusFacultyMap,
      );

      expect(result.errors).toHaveLength(0);
      expect(result.courseGroups.size).toBe(1);

      const cs101Group = result.courseGroups.get('CS101');
      expect(cs101Group).toBeDefined();

      // v2 collects ALL offerings (with duplicates) - DB handles dedup via skipDuplicates
      // Data: 3 rows = 3 offerings (semester 1, 2, and another semester 1)
      expect(cs101Group?.offerings).toHaveLength(3);

      // Should have 3 CLOs
      expect(cs101Group?.clos).toHaveLength(3);

      // Verify CLO details
      expect(cs101Group?.clos[0].cloNo).toBe(1);
      expect(cs101Group?.clos[1].cloNo).toBe(2);
      expect(cs101Group?.clos[2].cloNo).toBe(3);
    });

    it('should collect errors for missing campus-faculty mappings', () => {
      const emptyMap = new Map<
        string,
        { campusId: string; facultyId: string }
      >();

      const result = pipeline['groupCoursesBySubjectCode'](
        mockCleanCoursesWithCLO,
        emptyMap,
      );

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain(
        'Missing campus/faculty mapping for CAMPUS1-FACULTY1',
      );
      expect(result.errors[1]).toContain(
        'Missing campus/faculty mapping for CAMPUS2-FACULTY2',
      );
      expect(result.courseGroups.size).toBe(0);
    });
  });

  describe('execute', () => {
    it('should execute full pipeline with delete and seed options (equivalent to v1)', async () => {
      await seedTestData();

      // Mock FileHelper to return our test data
      const { FileHelper } = await import('src/shared/utils/file');
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockCleanCoursesWithCLO);

      await pipeline.execute({
        deleteExisting: true,
        seeds: true,
        batchSize: 100,
      });

      // Verify courses were created
      const courses = await prisma.course.findMany({
        include: {
          courseOfferings: true,
          courseLearningOutcomes: true,
        },
      });

      expect(courses).toHaveLength(2);

      // Verify first course (CS101)
      const cs101Course = courses.find((c) => c.subjectCode === 'CS101');
      expect(cs101Course).toBeDefined();
      expect(cs101Course?.subjectName).toBe('คอมพิวเตอร์วิทยา 1');
      expect(cs101Course?.campusId).toBe(MOCK_CAMPUS1_ID);
      expect(cs101Course?.facultyId).toBe(MOCK_FACULTY1_ID);
      expect(cs101Course?.courseOfferings).toHaveLength(1);
      expect(cs101Course?.courseLearningOutcomes).toHaveLength(1);

      // Verify course offering details
      const offering = cs101Course?.courseOfferings[0];
      expect(offering?.academicYear).toBe(2024);
      expect(offering?.semester).toBe(1);

      // Verify CLO details
      const clo = cs101Course?.courseLearningOutcomes[0];
      expect(clo?.cloNo).toBe(1);
      expect(clo?.originalCloName).toBe('เขียนโปรแกรมพื้นฐาน');
      expect(clo?.cleanedCloName).toBe('เขียนโปรแกรมพื้นฐาน');
      expect(clo?.skipEmbedding).toBe(false);
      expect(clo?.hasEmbedding768).toBe(false);
      expect(clo?.hasEmbedding1536).toBe(false);

      // Verify second course (MATH201)
      const math201Course = courses.find((c) => c.subjectCode === 'MATH201');
      expect(math201Course).toBeDefined();
      expect(math201Course?.subjectName).toBe('คณิตศาสตร์ 1');
      expect(math201Course?.campusId).toBe(MOCK_CAMPUS2_ID);
      expect(math201Course?.facultyId).toBe(MOCK_FACULTY2_ID);
      expect(math201Course?.courseOfferings).toHaveLength(1);
      expect(math201Course?.courseLearningOutcomes).toHaveLength(1);

      // Verify MATH201 CLO has skipEmbedding=true
      const mathClo = math201Course?.courseLearningOutcomes[0];
      expect(mathClo?.skipEmbedding).toBe(true);
    });

    it('should handle multiple offerings and CLOs for same course', async () => {
      await seedTestData();

      const { FileHelper } = await import('src/shared/utils/file');
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockCleanCoursesWithMultipleCLOs);

      await pipeline.execute({
        deleteExisting: false,
        seeds: true,
        batchSize: 100,
      });

      const courses = await prisma.course.findMany({
        include: {
          courseOfferings: true,
          courseLearningOutcomes: true,
        },
      });

      expect(courses).toHaveLength(1);

      const cs101Course = courses[0];
      expect(cs101Course.subjectCode).toBe('CS101');

      // After DB deduplication via skipDuplicates, we have 2 unique offerings
      // - Semester 1 with 2 CLOs (clo_no 1 and 3)
      // - Semester 2 with 1 CLO (clo_no 2)
      expect(cs101Course.courseOfferings).toHaveLength(2);

      // Verify unique offerings
      const uniqueOfferings = new Set(
        cs101Course.courseOfferings.map(
          (o) => `${o.academicYear}-${o.semester}`,
        ),
      );
      expect(uniqueOfferings.size).toBe(2);
      expect(uniqueOfferings.has('2024-1')).toBe(true);
      expect(uniqueOfferings.has('2024-2')).toBe(true);

      // Should have 3 CLOs total
      expect(cs101Course.courseLearningOutcomes).toHaveLength(3);

      // Verify CLOs are in order
      const sortedClos = [...cs101Course.courseLearningOutcomes].sort(
        (a, b) => a.cloNo - b.cloNo,
      );
      expect(sortedClos[0].cloNo).toBe(1);
      expect(sortedClos[1].cloNo).toBe(2);
      expect(sortedClos[2].cloNo).toBe(3);
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
      const { FileHelper } = await import('src/shared/utils/file');
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
      const { FileHelper } = await import('src/shared/utils/file');
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

    it('should respect custom batchSize', async () => {
      await seedTestData();

      const { FileHelper } = await import('src/shared/utils/file');
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockCleanCoursesWithCLO);

      // Small batch size to test batching logic
      await pipeline.execute({
        deleteExisting: false,
        seeds: true,
        batchSize: 1,
      });

      // Should still create all data correctly
      const courses = await prisma.course.findMany();
      expect(courses).toHaveLength(2);
    });
  });

  describe('buildKey', () => {
    it('should build correct key from campus and faculty codes', () => {
      const key = pipeline.buildKey('CAMPUS1', 'FACULTY1');
      expect(key).toBe('CAMPUS1-FACULTY1');
    });
  });
});
