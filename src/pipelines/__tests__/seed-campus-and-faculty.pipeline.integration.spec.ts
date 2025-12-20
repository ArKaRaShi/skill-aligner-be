import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

import { SeedCampusAndFacultyPipeline } from '../seed-campus-and-faculty.pipeline';

const buildCourse = (
  override: Partial<CleanCourseWithCLO>,
): CleanCourseWithCLO => ({
  academic_year: 2024,
  semester: 1,
  campus_code: 'DEFAULT_CAMPUS',
  faculty_code: 'DEFAULT_FACULTY',
  subject_code: 'SUBJECT',
  subject_name_th: 'Course Name',
  clo_no: 1,
  original_clo_name_th: 'Original CLO',
  clean_clo_name_th: 'Clean CLO',
  skipEmbedding: false,
  keywords: [],
  ...override,
});

const duplicateCampusFacultySeeds: CleanCourseWithCLO[] = [
  buildCourse({
    campus_code: 'CAMP_ALPHA',
    faculty_code: 'FAC_A',
    subject_code: 'ALPHA-1',
  }),
  buildCourse({
    campus_code: 'CAMP_ALPHA',
    faculty_code: 'FAC_A',
    subject_code: 'ALPHA-2',
  }),
  buildCourse({
    campus_code: 'CAMP_ALPHA',
    faculty_code: 'FAC_B',
    subject_code: 'ALPHA-3',
  }),
  buildCourse({
    campus_code: 'CAMP_BETA',
    faculty_code: 'FAC_C',
    subject_code: 'BETA-1',
  }),
];

describe('SeedCampusAndFacultyPipeline (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: SeedCampusAndFacultyPipeline;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [SeedCampusAndFacultyPipeline, PrismaService],
    }).compile();

    pipeline = moduleRef.get(SeedCampusAndFacultyPipeline);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcome_vectors, course_learning_outcomes, courses, faculties, campuses RESTART IDENTITY CASCADE;`;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('seedCampusAndFaculty', () => {
    it('creates campus and faculty when they do not exist', async () => {
      await pipeline.seedCampusAndFaculty({
        campusCode: 'CAMP_NEW',
        facultyCode: 'FAC_NEW',
      });

      const campus = await prisma.campus.findUnique({
        where: { code: 'CAMP_NEW' },
      });
      const faculty = await prisma.faculty.findFirst({
        where: { code: 'FAC_NEW' },
      });

      expect(campus).toBeDefined();
      expect(faculty).toBeDefined();
      expect(faculty?.campusId).toBe(campus?.id);
    });

    it('reuses an existing campus when creating a new faculty', async () => {
      const existingCampus = await prisma.campus.create({
        data: {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          code: 'CAMP_EXISTING',
          nameEn: 'Existing Campus',
        },
      });

      await pipeline.seedCampusAndFaculty({
        campusCode: 'CAMP_EXISTING',
        facultyCode: 'FAC_SECOND',
      });

      const campuses = await prisma.campus.findMany({
        where: { code: 'CAMP_EXISTING' },
      });
      const faculty = await prisma.faculty.findFirst({
        where: { code: 'FAC_SECOND' },
      });

      expect(campuses).toHaveLength(1);
      expect(faculty).toBeDefined();
      expect(faculty?.campusId).toBe(existingCampus.id);
    });
  });

  describe('execute', () => {
    it('deletes existing campuses and faculties when deleteExisting is true', async () => {
      const campus = await prisma.campus.create({
        data: {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          code: 'CAMP_TO_DELETE',
        },
      });

      await prisma.faculty.create({
        data: {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          code: 'FAC_TO_DELETE',
          campusId: campus.id,
        },
      });

      jest.spyOn(FileHelper, 'loadLatestJson').mockResolvedValue([]);

      await pipeline.execute({ deleteExisting: true, seeds: false });

      expect(await prisma.campus.count()).toBe(0);
      expect(await prisma.faculty.count()).toBe(0);
    });

    it('seeds unique campus-faculty combinations when seeds is true', async () => {
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(duplicateCampusFacultySeeds);

      await pipeline.execute({ deleteExisting: false, seeds: true });

      const campuses = await prisma.campus.findMany({
        include: { faculties: true },
      });

      expect(campuses).toHaveLength(2);

      const alphaCampus = campuses.find(
        (campus) => campus.code === 'CAMP_ALPHA',
      );
      const betaCampus = campuses.find((campus) => campus.code === 'CAMP_BETA');

      expect(alphaCampus?.faculties).toHaveLength(2);
      expect(alphaCampus?.faculties.map((f) => f.code)).toEqual(
        expect.arrayContaining(['FAC_A', 'FAC_B']),
      );
      expect(betaCampus?.faculties).toHaveLength(1);
      expect(betaCampus?.faculties[0]?.code).toBe('FAC_C');
      expect(await prisma.faculty.count()).toBe(3);
    });

    it('does not seed anything when seeds is false', async () => {
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(duplicateCampusFacultySeeds);

      await pipeline.execute({ deleteExisting: false, seeds: false });

      expect(await prisma.campus.count()).toBe(0);
      expect(await prisma.faculty.count()).toBe(0);
    });
  });
});
