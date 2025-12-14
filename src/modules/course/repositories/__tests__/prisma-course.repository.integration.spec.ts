import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from 'src/modules/embedding/contracts/i-embedding-client.contract';

import { PrismaCourseRepository } from '../prisma-course.repository';

const CAMPUS1_ID = '11111111-1111-1111-1111-111111111111';
const CAMPUS2_ID = '22222222-2222-2222-2222-222222222222';
const FACULTY1_ID = '33333333-3333-3333-3333-333333333333';
const FACULTY2_ID = '44444444-4444-4444-4444-444444444444';
const CAMPUS_FACULTY_LINK1_ID = '55555555-5555-5555-5555-555555555551';
const CAMPUS_FACULTY_LINK2_ID = '55555555-5555-5555-5555-555555555552';
const COURSE_ALPHA_ID = '66666666-6666-6666-6666-666666666661';
const COURSE_BETA_ID = '66666666-6666-6666-6666-666666666662';
const COURSE_GAMMA_ID = '66666666-6666-6666-6666-666666666663';
const CLO_ALPHA_ID = '77777777-7777-7777-7777-777777777771';
const CLO_BETA_ID = '77777777-7777-7777-7777-777777777772';
const CLO_EXTRA_ID = '77777777-7777-7777-7777-777777777773';
const COURSE_ALPHA_CLO_ALPHA_ID = '88888888-8888-8888-8888-888888888881';
const COURSE_ALPHA_CLO_BETA_ID = '88888888-8888-8888-8888-888888888882';
const COURSE_ALPHA_CLO_EXTRA_ID = '88888888-8888-8888-8888-888888888883';
const COURSE_BETA_CLO_BETA_ID = '88888888-8888-8888-8888-888888888884';
const COURSE_GAMMA_CLO_BETA_ID = '88888888-8888-8888-8888-888888888885';

describe('PrismaCourseRepository (Integration) - findCourseByLearningOutcomeIds', () => {
  let moduleRef: TestingModule;
  let repository: PrismaCourseRepository;
  let prisma: PrismaService;

  let campus1Id: Identifier;
  let campus2Id: Identifier;
  let faculty1Id: Identifier;
  let faculty2Id: Identifier;
  let courseAlphaId: Identifier;
  let courseBetaId: Identifier;
  let courseGammaId: Identifier;
  let cloAlphaId: Identifier;
  let cloBetaId: Identifier;

  beforeAll(async () => {
    const mockEmbeddingClient: jest.Mocked<IEmbeddingClient> = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaCourseRepository,
        PrismaService,
        {
          provide: I_EMBEDDING_CLIENT_TOKEN,
          useValue: mockEmbeddingClient,
        },
      ],
    }).compile();

    repository = moduleRef.get(PrismaCourseRepository);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_clos, course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties, campus_faculties RESTART IDENTITY CASCADE;`;
    await seedTestData();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seedTestData() {
    const campus1 = await prisma.campus.create({
      data: {
        id: CAMPUS1_ID,
        code: 'CMP1',
        nameTh: 'วิทยาเขต 1',
        nameEn: 'Campus 1',
      },
    });
    campus1Id = campus1.id as Identifier;

    const campus2 = await prisma.campus.create({
      data: {
        id: CAMPUS2_ID,
        code: 'CMP2',
        nameTh: 'วิทยาเขต 2',
        nameEn: 'Campus 2',
      },
    });
    campus2Id = campus2.id as Identifier;

    const faculty1 = await prisma.faculty.create({
      data: {
        id: FACULTY1_ID,
        code: 'FAC1',
        nameTh: 'คณะ 1',
        nameEn: 'Faculty 1',
      },
    });
    faculty1Id = faculty1.id as Identifier;

    const faculty2 = await prisma.faculty.create({
      data: {
        id: FACULTY2_ID,
        code: 'FAC2',
        nameTh: 'คณะ 2',
        nameEn: 'Faculty 2',
      },
    });
    faculty2Id = faculty2.id as Identifier;

    await prisma.campusFaculty.createMany({
      data: [
        {
          id: CAMPUS_FACULTY_LINK1_ID,
          campusId: campus1Id,
          facultyId: faculty1Id,
        },
        {
          id: CAMPUS_FACULTY_LINK2_ID,
          campusId: campus2Id,
          facultyId: faculty2Id,
        },
      ],
    });

    const courseAlpha = await prisma.course.create({
      data: {
        id: COURSE_ALPHA_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2024,
        semester: 1,
        subjectCode: 'ALPHA101',
        subjectNameTh: 'อัลฟ่า 101',
        subjectNameEn: 'Alpha 101',
        isGenEd: true,
        metadata: { level: 'intro' },
      },
    });
    courseAlphaId = courseAlpha.id as Identifier;

    const courseBeta = await prisma.course.create({
      data: {
        id: COURSE_BETA_ID,
        campusId: campus2Id,
        facultyId: faculty2Id,
        academicYear: 2024,
        semester: 2,
        subjectCode: 'BETA201',
        subjectNameTh: 'เบต้า 201',
        subjectNameEn: 'Beta 201',
        isGenEd: false,
        metadata: { level: 'advanced' },
      },
    });
    courseBetaId = courseBeta.id as Identifier;

    const courseGamma = await prisma.course.create({
      data: {
        id: COURSE_GAMMA_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2023,
        semester: 2,
        subjectCode: 'GAMMA301',
        subjectNameTh: 'แกมมา 301',
        subjectNameEn: 'Gamma 301',
        isGenEd: true,
        metadata: { level: 'intermediate' },
      },
    });
    courseGammaId = courseGamma.id as Identifier;

    const cloAlpha = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_ALPHA_ID,
        originalCLONameTh: 'ผลลัพธ์ อัลฟ่า',
        originalCLONameEn: 'Alpha outcome',
        cleanedCLONameTh: 'ผลลัพธ์อัลฟ่า',
        cleanedCLONameEn: 'Clean Alpha',
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: false,
      },
    });
    cloAlphaId = cloAlpha.id as Identifier;

    const cloBeta = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_BETA_ID,
        originalCLONameTh: 'ผลลัพธ์ เบต้า',
        originalCLONameEn: 'Beta outcome',
        cleanedCLONameTh: 'ผลลัพธ์เบต้า',
        cleanedCLONameEn: 'Clean Beta',
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: true,
      },
    });
    cloBetaId = cloBeta.id as Identifier;

    const cloExtra = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_EXTRA_ID,
        originalCLONameTh: 'ผลลัพธ์ พิเศษ',
        originalCLONameEn: 'Extra outcome',
        cleanedCLONameTh: 'ผลลัพธ์พิเศษ',
        cleanedCLONameEn: 'Clean Extra',
        skipEmbedding: true,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    await prisma.courseCLO.createMany({
      data: [
        {
          id: COURSE_ALPHA_CLO_ALPHA_ID,
          courseId: courseAlphaId,
          cloId: cloAlphaId,
          cloNo: 1,
        },
        {
          id: COURSE_ALPHA_CLO_BETA_ID,
          courseId: courseAlphaId,
          cloId: cloBetaId,
          cloNo: 2,
        },
        {
          id: COURSE_ALPHA_CLO_EXTRA_ID,
          courseId: courseAlphaId,
          cloId: cloExtra.id,
          cloNo: 3,
        },
        {
          id: COURSE_BETA_CLO_BETA_ID,
          courseId: courseBetaId,
          cloId: cloBetaId,
          cloNo: 1,
        },
        {
          id: COURSE_GAMMA_CLO_BETA_ID,
          courseId: courseGammaId,
          cloId: cloBetaId,
          cloNo: 1,
        },
      ],
    });
  }

  it('returns courses grouped by learning outcome id with ordering preserved', async () => {
    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: [cloAlphaId, cloBetaId],
    });

    expect(result.size).toBe(2);

    const coursesForAlpha = result.get(cloAlphaId);
    expect(coursesForAlpha).toBeDefined();
    expect(coursesForAlpha!).toHaveLength(1);
    expect(coursesForAlpha![0].courseId).toBe(courseAlphaId);
    expect(coursesForAlpha![0].learningOutcomeMatch.loId).toBe(cloAlphaId);
    expect(coursesForAlpha![0].learningOutcomes.map((lo) => lo.loId)).toEqual([
      cloAlphaId,
      cloBetaId,
      CLO_EXTRA_ID,
    ]);

    const coursesForBeta = result.get(cloBetaId);
    expect(coursesForBeta).toBeDefined();
    expect(coursesForBeta!.map((course) => course.courseId)).toEqual([
      courseBetaId,
      courseAlphaId,
      courseGammaId,
    ]);
    coursesForBeta!.forEach((course) => {
      expect(course.learningOutcomeMatch.loId).toBe(cloBetaId);
      if (course.courseId === courseAlphaId) {
        expect(course.learningOutcomes.map((lo) => lo.loId)).toEqual([
          cloAlphaId,
          cloBetaId,
          CLO_EXTRA_ID,
        ]);
      } else {
        expect(course.learningOutcomes.map((lo) => lo.loId)).toEqual([
          cloBetaId,
        ]);
      }
    });
  });

  it('applies campus, faculty, gen-ed and academic year filters', async () => {
    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: [cloBetaId],
      campusId: campus1Id,
      facultyId: faculty1Id,
      isGenEd: true,
      academicYearSemesters: [{ academicYear: 2024, semesters: [1] }],
    });

    const filteredCourses = result.get(cloBetaId);
    expect(filteredCourses).toBeDefined();
    expect(filteredCourses).toHaveLength(1);
    expect(filteredCourses![0].courseId).toBe(courseAlphaId);
    expect(filteredCourses![0].learningOutcomeMatch.loId).toBe(cloBetaId);
  });
});
