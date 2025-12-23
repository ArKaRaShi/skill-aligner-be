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

const realCampusFacultySeeds: CleanCourseWithCLO[] = [
  buildCourse({
    campus_code: 'B',
    faculty_code: 'A',
    subject_code: 'BANGKEN-AGRI-1',
  }),
  buildCourse({
    campus_code: 'B',
    faculty_code: 'A',
    subject_code: 'BANGKEN-AGRI-2',
  }),
  buildCourse({
    campus_code: 'B',
    faculty_code: 'B',
    subject_code: 'BANGKEN-FISH-1',
  }),
  buildCourse({
    campus_code: 'K',
    faculty_code: 'E',
    subject_code: 'KAMPANG-ENG-1',
  }),
  buildCourse({
    campus_code: 'S',
    faculty_code: 'D',
    subject_code: 'SRIRAJA-SCI-1',
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
    it('creates campus and faculty with correct Thai names when they do not exist', async () => {
      await pipeline.seedCampusAndFaculty({
        campusCode: 'B',
        facultyCode: 'A',
      });

      const campus = await prisma.campus.findUnique({
        where: { code: 'B' },
      });
      const faculty = await prisma.faculty.findFirst({
        where: { code: 'A' },
      });

      expect(campus).toBeDefined();
      expect(campus?.nameTh).toBe('บางเขน');
      expect(faculty).toBeDefined();
      expect(faculty?.nameTh).toBe('คณะเกษตร');
      expect(faculty?.campusId).toBe(campus?.id);
    });

    it('creates campus and faculty for different campus codes', async () => {
      await pipeline.seedCampusAndFaculty({
        campusCode: 'K',
        facultyCode: 'E',
      });

      const campus = await prisma.campus.findUnique({
        where: { code: 'K' },
      });
      const faculty = await prisma.faculty.findFirst({
        where: { code: 'E' },
      });

      expect(campus).toBeDefined();
      expect(campus?.nameTh).toBe('กำแพงแสน');
      expect(faculty).toBeDefined();
      expect(faculty?.nameTh).toBe('คณะวิศวกรรมศาสตร์');
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

    it('seeds unique campus-faculty combinations with correct Thai names when seeds is true', async () => {
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(realCampusFacultySeeds);

      await pipeline.execute({ deleteExisting: false, seeds: true });

      const campuses = await prisma.campus.findMany({
        include: { faculties: true },
      });

      expect(campuses).toHaveLength(3);

      const bangkenCampus = campuses.find((campus) => campus.code === 'B');
      const kampangCampus = campuses.find((campus) => campus.code === 'K');
      const srirajaCampus = campuses.find((campus) => campus.code === 'S');

      expect(bangkenCampus?.nameTh).toBe('บางเขน');
      expect(bangkenCampus?.faculties).toHaveLength(2);
      expect(bangkenCampus?.faculties.map((f) => f.code)).toEqual(
        expect.arrayContaining(['A', 'B']),
      );
      expect(bangkenCampus?.faculties.find((f) => f.code === 'A')?.nameTh).toBe(
        'คณะเกษตร',
      );
      expect(bangkenCampus?.faculties.find((f) => f.code === 'B')?.nameTh).toBe(
        'คณะประมง',
      );

      expect(kampangCampus?.nameTh).toBe('กำแพงแสน');
      expect(kampangCampus?.faculties).toHaveLength(1);
      expect(kampangCampus?.faculties[0]?.code).toBe('E');
      expect(kampangCampus?.faculties[0]?.nameTh).toBe('คณะวิศวกรรมศาสตร์');

      expect(srirajaCampus?.nameTh).toBe('ศรีราชา');
      expect(srirajaCampus?.faculties).toHaveLength(1);
      expect(srirajaCampus?.faculties[0]?.code).toBe('D');
      expect(srirajaCampus?.faculties[0]?.nameTh).toBe('คณะวิทยาศาสตร์');

      expect(await prisma.faculty.count()).toBe(4);
    });

    it('deletes existing data and seeds new data when both deleteExisting and seeds are true', async () => {
      // Create some existing data first
      const existingCampus = await prisma.campus.create({
        data: {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          code: 'OLD_CAMPUS',
          nameTh: 'Old Campus',
        },
      });

      await prisma.faculty.create({
        data: {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          code: 'OLD_FACULTY',
          nameTh: 'Old Faculty',
          campusId: existingCampus.id,
        },
      });

      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(realCampusFacultySeeds);

      await pipeline.execute({ deleteExisting: true, seeds: true });

      // Verify old data is deleted
      expect(await prisma.campus.count()).toBe(3);
      expect(await prisma.faculty.count()).toBe(4);

      // Verify new data is created with correct names
      const bangkenCampus = await prisma.campus.findUnique({
        where: { code: 'B' },
      });
      expect(bangkenCampus?.nameTh).toBe('บางเขน');
    });

    it('does not seed anything when seeds is false', async () => {
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(realCampusFacultySeeds);

      await pipeline.execute({ deleteExisting: false, seeds: false });

      expect(await prisma.campus.count()).toBe(0);
      expect(await prisma.faculty.count()).toBe(0);
    });
  });
});
