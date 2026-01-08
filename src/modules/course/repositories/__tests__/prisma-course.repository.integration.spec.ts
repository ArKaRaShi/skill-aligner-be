import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  I_EMBEDDING_ROUTER_SERVICE_TOKEN,
  IEmbeddingRouterService,
} from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { PrismaCourseRepository } from '../prisma-course.repository';

const CAMPUS1_ID = '11111111-1111-1111-1111-111111111111';
const CAMPUS2_ID = '22222222-2222-2222-2222-222222222222';
const FACULTY1_ID = '33333333-3333-3333-3333-333333333333';
const FACULTY2_ID = '44444444-4444-4444-4444-444444444444';
const COURSE_ALPHA_ID = '66666666-6666-6666-6666-666666666661';
const COURSE_BETA_ID = '66666666-6666-6666-6666-666666666662';
const COURSE_GAMMA_ID = '66666666-6666-6666-6666-666666666663';
const CLO_ALPHA_ID = '77777777-7777-7777-7777-777777777771';
const CLO_BETA_ID = '77777777-7777-7777-7777-777777777772';
const CLO_EXTRA_ID = '77777777-7777-7777-7777-777777777773';
const CLO_BETA_FOR_COURSE_BETA_ID = '77777777-7777-7777-7777-777777777774';
const CLO_BETA_FOR_COURSE_GAMMA_ID = '77777777-7777-7777-7777-777777777775';

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
  let cloBetaCourseBetaId: Identifier;
  let cloBetaCourseGammaId: Identifier;

  beforeAll(async () => {
    const mockEmbeddingRouterService: jest.Mocked<IEmbeddingRouterService> = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as unknown as jest.Mocked<IEmbeddingRouterService>;

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaCourseRepository,
        PrismaService,
        AppConfigService,
        ConfigService,
        {
          provide: I_EMBEDDING_ROUTER_SERVICE_TOKEN,
          useValue: mockEmbeddingRouterService,
        },
      ],
    }).compile();

    repository = moduleRef.get(PrismaCourseRepository);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcome_vectors, course_learning_outcomes, courses, faculties, campuses RESTART IDENTITY CASCADE;`;
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
        campus: {
          connect: { id: campus1Id },
        },
      },
    });
    faculty1Id = faculty1.id as Identifier;

    const faculty2 = await prisma.faculty.create({
      data: {
        id: FACULTY2_ID,
        code: 'FAC2',
        nameTh: 'คณะ 2',
        nameEn: 'Faculty 2',
        campus: {
          connect: { id: campus2Id },
        },
      },
    });
    faculty2Id = faculty2.id as Identifier;

    const courseAlpha = await prisma.course.create({
      data: {
        id: COURSE_ALPHA_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        subjectCode: 'ALPHA101',
        subjectName: 'อัลฟ่า 101',
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
        subjectCode: 'BETA201',
        subjectName: 'เบต้า 201',
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
        subjectCode: 'GAMMA301',
        subjectName: 'แกมมา 301',
        isGenEd: true,
        metadata: { level: 'intermediate' },
      },
    });
    courseGammaId = courseGamma.id as Identifier;

    await prisma.courseOffering.create({
      data: {
        id: '99999999-9999-9999-9999-999999999991',
        courseId: courseAlphaId,
        academicYear: 2024,
        semester: 1,
      },
    });

    await prisma.courseOffering.create({
      data: {
        id: '99999999-9999-9999-9999-999999999992',
        courseId: courseBetaId,
        academicYear: 2024,
        semester: 2,
      },
    });

    await prisma.courseOffering.create({
      data: {
        id: '99999999-9999-9999-9999-999999999993',
        courseId: courseGammaId,
        academicYear: 2023,
        semester: 2,
      },
    });

    const cloAlpha = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_ALPHA_ID,
        originalCloName: 'ผลลัพธ์ อัลฟ่า',
        cleanedCloName: 'ผลลัพธ์อัลฟ่า',
        courseId: courseAlphaId,
        cloNo: 1,
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: false,
      },
    });
    cloAlphaId = cloAlpha.id as Identifier;

    const cloBeta = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_BETA_ID,
        originalCloName: 'ผลลัพธ์ เบต้า',
        cleanedCloName: 'ผลลัพธ์เบต้า',
        courseId: courseAlphaId,
        cloNo: 2,
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: true,
      },
    });
    cloBetaId = cloBeta.id as Identifier;

    await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_EXTRA_ID,
        originalCloName: 'ผลลัพธ์ พิเศษ',
        cleanedCloName: 'ผลลัพธ์พิเศษ',
        courseId: courseAlphaId,
        cloNo: 3,
        skipEmbedding: true,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    const cloBetaCourseBeta = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_BETA_FOR_COURSE_BETA_ID,
        originalCloName: 'ผลลัพธ์ เบต้า',
        cleanedCloName: 'ผลลัพธ์เบต้า',
        courseId: courseBetaId,
        cloNo: 1,
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: true,
      },
    });
    cloBetaCourseBetaId = cloBetaCourseBeta.id as Identifier;

    const cloBetaCourseGamma = await prisma.courseLearningOutcome.create({
      data: {
        id: CLO_BETA_FOR_COURSE_GAMMA_ID,
        originalCloName: 'ผลลัพธ์ เบต้า',
        cleanedCloName: 'ผลลัพธ์เบต้า',
        courseId: courseGammaId,
        cloNo: 1,
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: true,
      },
    });
    cloBetaCourseGammaId = cloBetaCourseGamma.id as Identifier;

    // CLOs now explicitly linked to courses via helper
  }

  it('maps every learning outcome id back to the courses containing it', async () => {
    const learningOutcomeIds = [
      cloAlphaId,
      cloBetaId,
      cloBetaCourseBetaId,
      cloBetaCourseGammaId,
    ];

    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds,
    });

    expect(result.size).toBe(learningOutcomeIds.length);
    expect(Array.from(result.keys())).toEqual(
      expect.arrayContaining(learningOutcomeIds),
    );

    const assertCourseLinkedToLo = (
      loId: Identifier,
      expectedCourseId: Identifier,
    ) => {
      const courses = result.get(loId);
      expect(courses).toBeDefined();
      expect(courses).toHaveLength(1);
      const [course] = courses!;
      expect(course.id).toBe(expectedCourseId);
      expect(course.courseLearningOutcomes.some((lo) => lo.loId === loId)).toBe(
        true,
      );
    };

    assertCourseLinkedToLo(cloAlphaId, courseAlphaId);
    assertCourseLinkedToLo(cloBetaId, courseAlphaId);
    assertCourseLinkedToLo(cloBetaCourseBetaId, courseBetaId);
    assertCourseLinkedToLo(cloBetaCourseGammaId, courseGammaId);
  });

  it('places the same course under every matching learning outcome id', async () => {
    const queriedLoIds = [cloAlphaId, cloBetaId];

    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: queriedLoIds,
    });

    const alphaCourses = result.get(cloAlphaId);
    const betaCourses = result.get(cloBetaId);

    expect(alphaCourses).toBeDefined();
    expect(betaCourses).toBeDefined();

    const alphaCourse = alphaCourses!.find(
      (course) => course.id === courseAlphaId,
    );
    const betaCourse = betaCourses!.find(
      (course) => course.id === courseAlphaId,
    );

    expect(alphaCourse).toBeDefined();
    expect(betaCourse).toBeDefined();
    expect(
      alphaCourse!.courseLearningOutcomes.some((lo) => lo.loId === cloAlphaId),
    ).toBe(true);
    expect(
      betaCourse!.courseLearningOutcomes.some((lo) => lo.loId === cloBetaId),
    ).toBe(true);
  });

  it('applies campus, faculty, gen-ed, and academic year filters', async () => {
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
    expect(filteredCourses![0].id).toBe(courseAlphaId);
    expect(
      filteredCourses![0].courseLearningOutcomes.some(
        (lo) => lo.loId === cloBetaId,
      ),
    ).toBe(true);
  });

  it('filters by academic year when semesters are not specified', async () => {
    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: [cloBetaCourseGammaId],
      academicYearSemesters: [{ academicYear: 2023 }],
    });

    const courses = result.get(cloBetaCourseGammaId);
    expect(courses).toBeDefined();
    expect(courses).toHaveLength(1);
    expect(courses![0].id).toBe(courseGammaId);
  });

  it('excludes courses whose offerings do not match the requested academic years or semesters', async () => {
    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: [cloAlphaId],
      academicYearSemesters: [{ academicYear: 2023, semesters: [1] }],
    });

    expect(result.has(cloAlphaId)).toBe(false);
  });

  it('supports multiple academic year entries within the same query', async () => {
    const result = await repository.findCourseByLearningOutcomeIds({
      learningOutcomeIds: [cloAlphaId, cloBetaCourseGammaId],
      academicYearSemesters: [
        { academicYear: 2024, semesters: [1] },
        { academicYear: 2023 },
      ],
    });

    const alphaCourses = result.get(cloAlphaId);
    const gammaCourses = result.get(cloBetaCourseGammaId);

    expect(alphaCourses).toBeDefined();
    expect(alphaCourses).toHaveLength(1);
    expect(alphaCourses![0].id).toBe(courseAlphaId);

    expect(gammaCourses).toBeDefined();
    expect(gammaCourses).toHaveLength(1);
    expect(gammaCourses![0].id).toBe(courseGammaId);
  });
});
