import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from 'src/modules/embedding/contracts/i-embedding-client.contract';

import { CourseLearningOutcomeRepository } from '../course-learning-outcome.repository';

// Mock UUID constants for testing
// First campus and faculty
const MOCK_CAMPUS1_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_FACULTY1_ID = '550e8400-e29b-41d4-a716-446655440002';
const MOCK_CAMPUS1_FACULTY1_ID = '550e8400-e29b-41d4-a716-446655440003';
const MOCK_COURSE1_ID = '550e8400-e29b-41d4-a716-446655440004';
const MOCK_COURSE2_ID = '550e8400-e29b-41d4-a716-446655440005';
const MOCK_CLO1_ID = '550e8400-e29b-41d4-a716-446655440006';
const MOCK_CLO2_ID = '550e8400-e29b-41d4-a716-446655440007';
const MOCK_CLO3_ID = '550e8400-e29b-41d4-a716-446655440008';
const MOCK_VECTOR1_ID = '550e8400-e29b-41d4-a716-446655440009';
const MOCK_VECTOR2_ID = '550e8400-e29b-41d4-a716-446655440010';
const MOCK_VECTOR3_ID = '550e8400-e29b-41d4-a716-446655440011';
const MOCK_COURSE1_CLO1_ID = '550e8400-e29b-41d4-a716-446655440012';
const MOCK_COURSE1_CLO2_ID = '550e8400-e29b-41d4-a716-446655440013';
const MOCK_COURSE2_CLO3_ID = '550e8400-e29b-41d4-a716-446655440014';

// Second campus and faculty
const MOCK_CAMPUS2_ID = '550e8400-e29b-41d4-a716-446655440015';
const MOCK_FACULTY2_ID = '550e8400-e29b-41d4-a716-446655440016';
const MOCK_CAMPUS2_FACULTY2_ID = '550e8400-e29b-41d4-a716-446655440017';
const MOCK_COURSE3_ID = '550e8400-e29b-41d4-a716-446655440018';
const MOCK_COURSE4_ID = '550e8400-e29b-41d4-a716-446655440019';
const MOCK_CLO4_ID = '550e8400-e29b-41d4-a716-446655440020';
const MOCK_CLO5_ID = '550e8400-e29b-41d4-a716-446655440021';
const MOCK_CLO6_ID = '550e8400-e29b-41d4-a716-446655440022';
const MOCK_VECTOR4_ID = '550e8400-e29b-41d4-a716-446655440023';
const MOCK_VECTOR5_ID = '550e8400-e29b-41d4-a716-446655440024';
const MOCK_VECTOR6_ID = '550e8400-e29b-41d4-a716-446655440025';
const MOCK_COURSE3_CLO4_ID = '550e8400-e29b-41d4-a716-446655440026';
const MOCK_COURSE3_CLO5_ID = '550e8400-e29b-41d4-a716-446655440027';
const MOCK_COURSE4_CLO6_ID = '550e8400-e29b-41d4-a716-446655440028';

// Additional IDs for testing similarity ranking and deduplication
const MOCK_COURSE5_ID = '550e8400-e29b-41d4-a716-446655440029';
const MOCK_COURSE6_ID = '550e8400-e29b-41d4-a716-446655440030';
const MOCK_CLO7_ID = '550e8400-e29b-41d4-a716-446655440031';
const MOCK_CLO8_ID = '550e8400-e29b-41d4-a716-446655440032';
const MOCK_VECTOR7_ID = '550e8400-e29b-41d4-a716-446655440033';
const MOCK_VECTOR8_ID = '550e8400-e29b-41d4-a716-446655440034';
const MOCK_COURSE5_CLO7_ID = '550e8400-e29b-41d4-a716-446655440035';
const MOCK_COURSE6_CLO7_ID = '550e8400-e29b-41d4-a716-446655440036';
const MOCK_COURSE5_CLO8_ID = '550e8400-e29b-41d4-a716-446655440037';

const VECTOR_DIMENSION = 768;

const buildVectorFromSequence = (sequence: number[]) =>
  Array.from({ length: VECTOR_DIMENSION }, (_, index) => {
    if (!sequence.length) {
      throw new Error('Vector sequence must not be empty');
    }

    return sequence[index % sequence.length];
  });

describe('CourseLearningOutcomeRepository (Integration)', () => {
  let module: TestingModule;
  let repository: CourseLearningOutcomeRepository;
  let prisma: PrismaService;
  let mockEmbeddingClient: jest.Mocked<IEmbeddingClient>;

  // Test data IDs
  let campus1Id: Identifier;
  let campus2Id: Identifier;
  let faculty1Id: Identifier;
  let faculty2Id: Identifier;
  let courseId1: string;
  let courseId2: string;
  let courseId3: string;
  let courseId4: string;
  let cloId1: string;
  let cloId2: string;
  let cloId3: string;
  let cloId4: string;
  let cloId5: string;
  let cloId6: string;
  let cloId7: string;
  let cloId8: string;
  let courseId5: string;
  let courseId6: string;

  beforeAll(async () => {
    // Create a mock embedding client
    mockEmbeddingClient = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as jest.Mocked<IEmbeddingClient>;

    module = await Test.createTestingModule({
      providers: [
        CourseLearningOutcomeRepository,
        PrismaService,
        {
          provide: I_EMBEDDING_CLIENT_TOKEN,
          useValue: mockEmbeddingClient,
        },
      ],
    }).compile();

    repository = module.get<CourseLearningOutcomeRepository>(
      CourseLearningOutcomeRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.$executeRaw`TRUNCATE TABLE course_clos, course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties, campus_faculties RESTART IDENTITY CASCADE;`;

    // Create first campus and faculty
    const campus1 = await prisma.campus.create({
      data: {
        id: MOCK_CAMPUS1_ID,
        code: 'TEST_CAMPUS1',
        nameTh: 'ทดสอบวิทยาเขต 1',
        nameEn: 'Test Campus 1',
      },
    });
    campus1Id = campus1.id as Identifier;

    const faculty1 = await prisma.faculty.create({
      data: {
        id: MOCK_FACULTY1_ID,
        code: 'TEST_FACULTY1',
        nameTh: 'ทดสอบคณะ 1',
        nameEn: 'Test Faculty 1',
      },
    });
    faculty1Id = faculty1.id as Identifier;

    // Link first campus and faculty
    await prisma.campusFaculty.create({
      data: {
        id: MOCK_CAMPUS1_FACULTY1_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
      },
    });

    // Create second campus and faculty
    const campus2 = await prisma.campus.create({
      data: {
        id: MOCK_CAMPUS2_ID,
        code: 'TEST_CAMPUS2',
        nameTh: 'ทดสอบวิทยาเขต 2',
        nameEn: 'Test Campus 2',
      },
    });
    campus2Id = campus2.id as Identifier;

    const faculty2 = await prisma.faculty.create({
      data: {
        id: MOCK_FACULTY2_ID,
        code: 'TEST_FACULTY2',
        nameTh: 'ทดสอบคณะ 2',
        nameEn: 'Test Faculty 2',
      },
    });
    faculty2Id = faculty2.id as Identifier;

    // Link second campus and faculty
    await prisma.campusFaculty.create({
      data: {
        id: MOCK_CAMPUS2_FACULTY2_ID,
        campusId: campus2Id,
        facultyId: faculty2Id,
      },
    });

    // Create courses with different properties
    // Courses for first campus and faculty
    const course1 = await prisma.course.create({
      data: {
        id: MOCK_COURSE1_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST101',
        subjectNameTh: 'วิชาทดสอบ 1',
        subjectNameEn: 'Test Subject 1',
        isGenEd: true,
      },
    });
    courseId1 = course1.id;

    const course2 = await prisma.course.create({
      data: {
        id: MOCK_COURSE2_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST102',
        subjectNameTh: 'วิชาทดสอบ 2',
        subjectNameEn: 'Test Subject 2',
        isGenEd: false,
      },
    });
    courseId2 = course2.id;

    // Courses for second campus and faculty
    const course3 = await prisma.course.create({
      data: {
        id: MOCK_COURSE3_ID,
        campusId: campus2Id,
        facultyId: faculty2Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST201',
        subjectNameTh: 'วิชาทดสอบ 3',
        subjectNameEn: 'Test Subject 3',
        isGenEd: true,
      },
    });
    courseId3 = course3.id;

    const course4 = await prisma.course.create({
      data: {
        id: MOCK_COURSE4_ID,
        campusId: campus2Id,
        facultyId: faculty2Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST202',
        subjectNameTh: 'วิชาทดสอบ 4',
        subjectNameEn: 'Test Subject 4',
        isGenEd: false,
      },
    });
    courseId4 = course4.id;

    // Create additional courses for testing similarity ranking and deduplication
    const course5 = await prisma.course.create({
      data: {
        id: MOCK_COURSE5_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST103',
        subjectNameTh: 'วิชาทดสอบ 5',
        subjectNameEn: 'Test Subject 5',
        isGenEd: true,
      },
    });
    courseId5 = course5.id;

    const course6 = await prisma.course.create({
      data: {
        id: MOCK_COURSE6_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        academicYear: 2023,
        semester: 1,
        subjectCode: 'TEST104',
        subjectNameTh: 'วิชาทดสอบ 6',
        subjectNameEn: 'Test Subject 6',
        isGenEd: false,
      },
    });
    courseId6 = course6.id;

    // Create learning outcomes for first campus courses
    const clo1 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO1_ID,
        originalCLONameTh: 'สามารถวิเคราะห์ข้อมูลได้',
        cleanedCLONameTh: 'วิเคราะห์ข้อมูล',
        hasEmbedding768: true,
      },
    });
    cloId1 = clo1.id;

    const clo2 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO2_ID,
        originalCLONameTh: 'สามารถเขียนโปรแกรมได้',
        cleanedCLONameTh: 'เขียนโปรแกรม',
        hasEmbedding768: true,
      },
    });
    cloId2 = clo2.id;

    const clo3 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO3_ID,
        originalCLONameTh: 'สามารถสื่อสารได้',
        cleanedCLONameTh: 'สื่อสาร',
        hasEmbedding768: true,
      },
    });
    cloId3 = clo3.id;

    // Create learning outcomes for second campus courses
    const clo4 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO4_ID,
        originalCLONameTh: 'สามารถวางแผนโครงการได้',
        cleanedCLONameTh: 'วางแผนโครงการ',
        hasEmbedding768: true,
      },
    });
    cloId4 = clo4.id;

    const clo5 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO5_ID,
        originalCLONameTh: 'สามารถจัดการทีมได้',
        cleanedCLONameTh: 'จัดการทีม',
        hasEmbedding768: true,
      },
    });
    cloId5 = clo5.id;

    const clo6 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO6_ID,
        originalCLONameTh: 'สามารถแก้ปัญหาได้',
        cleanedCLONameTh: 'แก้ปัญหา',
        hasEmbedding768: true,
      },
    });
    cloId6 = clo6.id;

    // Create additional learning outcomes for testing
    const clo7 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO7_ID,
        originalCLONameTh: 'สามารถวิเคราะห์ข้อมูลขั้นสูงได้',
        cleanedCLONameTh: 'วิเคราะห์ข้อมูลขั้นสูง',
        hasEmbedding768: true,
      },
    });
    cloId7 = clo7.id;

    const clo8 = await prisma.courseLearningOutcome.create({
      data: {
        id: MOCK_CLO8_ID,
        originalCLONameTh: 'สามารถออกแบบระบบได้',
        cleanedCLONameTh: 'ออกแบบระบบ',
        hasEmbedding768: true,
      },
    });
    cloId8 = clo8.id;

    // Create vectors for all learning outcomes
    const mockVector = buildVectorFromSequence([
      0.2, 0.1, 0.05, 0.02, 0.01, 0.03, 0.04, 0.15,
    ]);
    // Create a different vector for CLO7 to test similarity ranking
    const highSimilarityVector = buildVectorFromSequence([
      0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55,
    ]);
    // Create a medium similarity vector for CLO8 (different from both mockVector and highSimilarityVector)
    const mediumSimilarityVector = buildVectorFromSequence([
      0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.01, 0.02,
    ]);

    // Create vectors for learning outcomes using raw SQL to bypass type issues
    await prisma.$executeRaw`
      INSERT INTO course_learning_outcome_vectors (id, clo_id, embedding_768)
      VALUES
        (${MOCK_VECTOR1_ID}::uuid, ${cloId1}::uuid, ${mockVector}),
        (${MOCK_VECTOR2_ID}::uuid, ${cloId2}::uuid, ${mockVector}),
        (${MOCK_VECTOR3_ID}::uuid, ${cloId3}::uuid, ${mockVector}),
        (${MOCK_VECTOR4_ID}::uuid, ${cloId4}::uuid, ${mockVector}),
        (${MOCK_VECTOR5_ID}::uuid, ${cloId5}::uuid, ${mockVector}),
        (${MOCK_VECTOR6_ID}::uuid, ${cloId6}::uuid, ${mockVector}),
        (${MOCK_VECTOR7_ID}::uuid, ${cloId7}::uuid, ${highSimilarityVector}),
        (${MOCK_VECTOR8_ID}::uuid, ${cloId8}::uuid, ${mediumSimilarityVector})
    `;

    // Link CLOs to courses
    await prisma.courseCLO.createMany({
      data: [
        // CLOs for first campus courses
        {
          id: MOCK_COURSE1_CLO1_ID,
          courseId: courseId1,
          cloId: cloId1,
          cloNo: 1,
        },
        {
          id: MOCK_COURSE1_CLO2_ID,
          courseId: courseId1,
          cloId: cloId2,
          cloNo: 2,
        },
        {
          id: MOCK_COURSE2_CLO3_ID,
          courseId: courseId2,
          cloId: cloId3,
          cloNo: 1,
        },
        // CLOs for second campus courses
        {
          id: MOCK_COURSE3_CLO4_ID,
          courseId: courseId3,
          cloId: cloId4,
          cloNo: 1,
        },
        {
          id: MOCK_COURSE3_CLO5_ID,
          courseId: courseId3,
          cloId: cloId5,
          cloNo: 2,
        },
        {
          id: MOCK_COURSE4_CLO6_ID,
          courseId: courseId4,
          cloId: cloId6,
          cloNo: 1,
        },
      ],
    });

    // Create additional course-CLO relations for testing deduplication
    // CLO7 is linked to both course5 and course6 (same CLO, multiple courses)
    await prisma.courseCLO.createMany({
      data: [
        {
          id: MOCK_COURSE5_CLO7_ID,
          courseId: courseId5,
          cloId: cloId7,
          cloNo: 1,
        },
        {
          id: MOCK_COURSE6_CLO7_ID,
          courseId: courseId6,
          cloId: cloId7,
          cloNo: 1,
        },
        {
          id: MOCK_COURSE5_CLO8_ID,
          courseId: courseId5,
          cloId: cloId8,
          cloNo: 2,
        },
      ],
    });

    // Mock embedding client response
    mockEmbeddingClient.embedOne.mockResolvedValue({
      vector: buildVectorFromSequence([0.5]), // Use a neutral vector
      metadata: {
        modelId: 'e5-small',
        provider: 'e5',
        dimension: 768,
        embeddedText: 'test',
        generatedAt: new Date().toISOString(),
      },
    });
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.$executeRaw`TRUNCATE TABLE course_clos, course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties, campus_faculties RESTART IDENTITY CASCADE;`;
    await module.close();
  });

  describe('findLosBySkills with filters', () => {
    it('should find learning outcomes without filters', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs have same embedding, so all match

      // Verify all CLOs are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
    });

    it('should filter by campusId (first campus)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        campusId: campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(5); // All 5 CLOs from first campus have same embedding, so all match

      // Verify all CLOs are from first campus
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by campusId (second campus)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        campusId: campus2Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วางแผน')).toBe(true);
      expect(result.get('วางแผน')).toHaveLength(3); // All 3 CLOs from second campus have same embedding, so all match

      // Verify all CLOs are from second campus
      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).not.toContain(MOCK_CLO1_ID);
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
    });

    it('should filter by facultyId (first faculty)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        facultyId: faculty1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(5); // All 5 CLOs from first faculty have same embedding, so all match

      // Verify all CLOs are from first faculty
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by facultyId (second faculty)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['จัดการทีม'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        facultyId: faculty2Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('จัดการทีม')).toBe(true);
      expect(result.get('จัดการทีม')).toHaveLength(3); // All 3 CLOs from second faculty have same embedding, so all match

      // Verify all CLOs are from second faculty
      const cloIds = result.get('จัดการทีม')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).not.toContain(MOCK_CLO1_ID);
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
    });

    it('should filter by isGenEd = true', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(6); // CLOs from course1, course3, and course5 (all isGenEd=true) match

      // Verify only CLOs from courses with isGenEd=true are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID); // From course1 (isGenEd=true)
      expect(cloIds).toContain(MOCK_CLO2_ID); // From course1 (isGenEd=true)
      expect(cloIds).toContain(MOCK_CLO4_ID); // From course3 (isGenEd=true)
      expect(cloIds).toContain(MOCK_CLO5_ID); // From course3 (isGenEd=true)
      expect(cloIds).toContain(MOCK_CLO7_ID); // From course5 (isGenEd=true)
      expect(cloIds).toContain(MOCK_CLO8_ID); // From course5 (isGenEd=true)
      expect(cloIds).not.toContain(MOCK_CLO3_ID); // From course2 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO6_ID); // From course4 (isGenEd=false)
    });

    it('should filter by isGenEd = false', async () => {
      const result = await repository.findLosBySkills({
        skills: ['สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        isGenEd: false,
      });

      expect(result.size).toBe(1);
      expect(result.has('สื่อสาร')).toBe(true);
      expect(result.get('สื่อสาร')).toHaveLength(3); // CLOs from course2, course4, and course6 (all isGenEd=false) match

      // Verify only CLOs from courses with isGenEd=false are returned
      const cloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID); // From course2 (isGenEd=false)
      expect(cloIds).toContain(MOCK_CLO6_ID); // From course4 (isGenEd=false)
      expect(cloIds).toContain(MOCK_CLO7_ID); // From course6 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from courses with isGenEd=true
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should filter by multiple criteria (first campus)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        campusId: campus1Id,
        facultyId: faculty1Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(4); // CLOs from course1 and course5 (both isGenEd=true) match

      // Verify only CLOs from course1 and course5 (both isGenEd=true) with specified campus and faculty are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID); // This CLO is from course2 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO4_ID); // These CLOs are from second campus
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by multiple criteria (second campus)', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        campusId: campus2Id,
        facultyId: faculty2Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วางแผน')).toBe(true);
      expect(result.get('วางแผน')).toHaveLength(2); // Only CLOs from course3 (isGenEd=true) match

      // Verify only CLOs from course3 (isGenEd=true) with specified campus and faculty are returned
      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID); // This CLO is from course4 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from first campus
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
    });

    it('should return filtered results when isGenEd filter excludes some results', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        isGenEd: false, // This should exclude CLOs from courses with isGenEd=true
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(3); // CLOs from course2, course4, and course6 (all isGenEd=false) match

      // Verify only CLOs from courses with isGenEd=false are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID); // From course2 (isGenEd=false)
      expect(cloIds).toContain(MOCK_CLO6_ID); // From course4 (isGenEd=false)
      expect(cloIds).toContain(MOCK_CLO7_ID); // From course6 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from courses with isGenEd=true
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should handle multiple skills with filters', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        isGenEd: true,
      });

      expect(result.size).toBe(2);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.has('สื่อสาร')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(6); // CLOs from course1, course3, and course5 (all isGenEd=true) match
      expect(result.get('สื่อสาร')).toHaveLength(6); // All CLOs have same embedding, so all 6 from courses with isGenEd=true match for 'สื่อสาร' too

      // Verify both skills return only CLOs from courses with isGenEd=true
      const analysisCloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      const communicationCloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);

      expect(analysisCloIds).toContain(MOCK_CLO1_ID); // From course1 (isGenEd=true)
      expect(analysisCloIds).toContain(MOCK_CLO2_ID); // From course1 (isGenEd=true)
      expect(analysisCloIds).toContain(MOCK_CLO4_ID); // From course3 (isGenEd=true)
      expect(analysisCloIds).toContain(MOCK_CLO5_ID); // From course3 (isGenEd=true)
      expect(analysisCloIds).toContain(MOCK_CLO7_ID); // From course5 (isGenEd=true)
      expect(analysisCloIds).toContain(MOCK_CLO8_ID); // From course5 (isGenEd=true)
      expect(analysisCloIds).not.toContain(MOCK_CLO3_ID); // From course2 (isGenEd=false)
      expect(analysisCloIds).not.toContain(MOCK_CLO6_ID); // From course4 (isGenEd=false)

      expect(communicationCloIds).toContain(MOCK_CLO1_ID); // From course1 (isGenEd=true)
      expect(communicationCloIds).toContain(MOCK_CLO2_ID); // From course1 (isGenEd=true)
      expect(communicationCloIds).toContain(MOCK_CLO4_ID); // From course3 (isGenEd=true)
      expect(communicationCloIds).toContain(MOCK_CLO5_ID); // From course3 (isGenEd=true)
      expect(communicationCloIds).toContain(MOCK_CLO7_ID); // From course5 (isGenEd=true)
      expect(communicationCloIds).toContain(MOCK_CLO8_ID); // From course5 (isGenEd=true)
      expect(communicationCloIds).not.toContain(MOCK_CLO3_ID); // From course2 (isGenEd=false)
      expect(communicationCloIds).not.toContain(MOCK_CLO6_ID); // From course4 (isGenEd=false)
    });

    it('should filter by academicYears', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        academicYears: [2023],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs from 2023 should match

      // Verify all CLOs are from 2023
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
    });

    it('should filter by semesters', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        semesters: [1],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs from semester 1 should match

      // Verify all CLOs are from semester 1
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
    });

    it('should filter by multiple academicYears', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        academicYears: [2023, 2024],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs from 2023 should match (2024 has no data)
    });

    it('should filter by multiple semesters', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        semesters: [1, 2],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs from semester 1 should match (semester 2 has no data)
    });

    it('should filter by academicYears and semesters together', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        academicYears: [2023],
        semesters: [1],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs from 2023 semester 1 should match
    });

    it('should return no results for non-matching academicYears', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        academicYears: [2024],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(0); // No CLOs from 2024
    });

    it('should return no results for non-matching semesters', async () => {
      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        semesters: [2],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(0); // No CLOs from semester 2
    });
  });

  describe('findLosBySkills with similarity ranking and deduplication', () => {
    it('should rank similarity scores correctly in descending order', async () => {
      // Mock embedding client to return a vector that's closest to CLO7's high-similarity pattern
      // but not identical to avoid near-perfect similarity
      const queryVector = buildVectorFromSequence([
        0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5,
      ]);
      mockEmbeddingClient.embedOne.mockResolvedValue({
        vector: queryVector,
        metadata: {
          modelId: 'e5-small',
          provider: 'e5',
          dimension: 768,
          embeddedText: 'test',
          generatedAt: new Date().toISOString(),
        },
      });

      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(8); // All 8 CLOs should match

      const matches = result.get('วิเคราะห์')!;

      // Find matches for each CLO
      const clo7Match = matches.find((match) => match.loId === MOCK_CLO7_ID);
      const clo8Match = matches.find((match) => match.loId === MOCK_CLO8_ID);
      const otherMatches = matches.filter(
        (match) => match.loId !== MOCK_CLO7_ID && match.loId !== MOCK_CLO8_ID,
      );

      // Verify all matches exist
      expect(clo7Match).toBeDefined();
      expect(clo8Match).toBeDefined();
      expect(otherMatches).toHaveLength(6);

      // Verify similarity scores are in descending order
      // CLO7 should have highest similarity, then CLO8, then the rest
      expect(clo7Match!.similarityScore).toBeGreaterThan(
        clo8Match!.similarityScore,
      );
      expect(clo8Match!.similarityScore).toBeGreaterThan(
        otherMatches[0].similarityScore,
      );

      // All other CLOs should have the same similarity since they use the same vector
      const otherSimilarities = otherMatches.map((m) => m.similarityScore);
      expect(new Set(otherSimilarities).size).toBe(1); // All should be the same
    });

    it('should deduplicate CLOs when they have multiple course-CLO relations', async () => {
      // Using real embedding client

      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        vectorDimension: 768,
        campusId: campus1Id, // Filter to first campus where courses 5 and 6 are located
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const matches = result.get('วิเคราะห์')!;
      const clo7Matches = matches.filter(
        (match) => match.loId === MOCK_CLO7_ID,
      );

      // CLO7 should appear only once even though it's linked to both course5 and course6
      expect(clo7Matches).toHaveLength(1);

      // Verify CLO7 is included in the results
      expect(clo7Matches[0].loId).toBe(MOCK_CLO7_ID);

      // Verify other CLOs from first campus are also included
      const cloIds = matches.map((match) => match.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
    });

    it('should keep highest similarity when CLO appears multiple times with different courses', async () => {
      // Using real embedding client

      const result = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.3,
        topN: 10,
        vectorDimension: 768,
        campusId: campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const matches = result.get('วิเคราะห์')!;
      const clo7Match = matches.find((match) => match.loId === MOCK_CLO7_ID);

      // CLO7 should appear exactly once
      expect(
        matches.filter((match) => match.loId === MOCK_CLO7_ID),
      ).toHaveLength(1);

      // Verify CLO7 is included and has a valid similarity score
      expect(clo7Match).toBeDefined();
      expect(clo7Match!.similarityScore).toBeGreaterThanOrEqual(0.3);
    });
  });
});
