import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  I_EMBEDDING_ROUTER_SERVICE_TOKEN,
  IEmbeddingRouterService,
} from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { PrismaCourseLearningOutcomeRepository } from '../prisma-course-learning-outcome.repository';

// Mock UUID constants for testing
// First campus and faculty
const MOCK_CAMPUS1_ID = '550e8400-e29b-41d4-a716-446655440001';
const MOCK_FACULTY1_ID = '550e8400-e29b-41d4-a716-446655440002';
const MOCK_COURSE1_ID = '550e8400-e29b-41d4-a716-446655440004';
const MOCK_COURSE2_ID = '550e8400-e29b-41d4-a716-446655440005';
const MOCK_CLO1_ID = '550e8400-e29b-41d4-a716-446655440006';
const MOCK_CLO2_ID = '550e8400-e29b-41d4-a716-446655440007';
const MOCK_CLO3_ID = '550e8400-e29b-41d4-a716-446655440008';
const MOCK_VECTOR1_ID = '550e8400-e29b-41d4-a716-446655440009';
const MOCK_VECTOR2_ID = '550e8400-e29b-41d4-a716-446655440010';
const MOCK_VECTOR3_ID = '550e8400-e29b-41d4-a716-446655440011';

// Second campus and faculty
const MOCK_CAMPUS2_ID = '550e8400-e29b-41d4-a716-446655440015';
const MOCK_FACULTY2_ID = '550e8400-e29b-41d4-a716-446655440016';
const MOCK_COURSE3_ID = '550e8400-e29b-41d4-a716-446655440018';
const MOCK_COURSE4_ID = '550e8400-e29b-41d4-a716-446655440019';
const MOCK_CLO4_ID = '550e8400-e29b-41d4-a716-446655440020';
const MOCK_CLO5_ID = '550e8400-e29b-41d4-a716-446655440021';
const MOCK_CLO6_ID = '550e8400-e29b-41d4-a716-446655440022';
const MOCK_VECTOR4_ID = '550e8400-e29b-41d4-a716-446655440023';
const MOCK_VECTOR5_ID = '550e8400-e29b-41d4-a716-446655440024';
const MOCK_VECTOR6_ID = '550e8400-e29b-41d4-a716-446655440025';

// Additional IDs for testing similarity ranking and deduplication
const MOCK_COURSE5_ID = '550e8400-e29b-41d4-a716-446655440029';
const MOCK_COURSE6_ID = '550e8400-e29b-41d4-a716-446655440030';
const MOCK_CLO7_ID = '550e8400-e29b-41d4-a716-446655440031';
const MOCK_CLO8_ID = '550e8400-e29b-41d4-a716-446655440032';
const MOCK_VECTOR7_ID = '550e8400-e29b-41d4-a716-446655440033';
const MOCK_VECTOR8_ID = '550e8400-e29b-41d4-a716-446655440034';

const VECTOR_DIMENSION_768 = 768;
const VECTOR_DIMENSION_1536 = 1536;

const buildVectorFromSequence = (
  sequence: number[],
  dimension: number = VECTOR_DIMENSION_768,
) =>
  Array.from({ length: dimension }, (_, index) => {
    if (!sequence.length) {
      throw new Error('Vector sequence must not be empty');
    }

    return sequence[index % sequence.length];
  });

async function insertCourseLearningOutcomeRecord({
  prisma,
  id,
  courseId,
  cloNo,
  originalCloName,
  cleanedCloName,
  skipEmbedding = false,
  hasEmbedding768 = true,
  hasEmbedding1536 = false,
}: {
  prisma: PrismaService;
  id: string;
  courseId: Identifier | string;
  cloNo: number;
  originalCloName: string;
  cleanedCloName: string;
  skipEmbedding?: boolean;
  hasEmbedding768?: boolean;
  hasEmbedding1536?: boolean;
}) {
  await prisma.courseLearningOutcome.create({
    data: {
      id,
      cloNo,
      originalCloName,
      cleanedCloName,
      courseId,
      skipEmbedding,
      hasEmbedding768,
      hasEmbedding1536,
    },
  });
}

describe('PrismaCourseLearningOutcomeRepository (Integration)', () => {
  let module: TestingModule;
  let repository: PrismaCourseLearningOutcomeRepository;
  let prisma: PrismaService;
  let mockEmbeddingRouterService: jest.Mocked<IEmbeddingRouterService>;

  // Test data IDs
  let campus1Id: Identifier;
  let campus2Id: Identifier;
  let faculty1Id: Identifier;
  let faculty2Id: Identifier;
  let courseId1: string;
  let courseId2: string;
  let courseId3: string;
  let courseId4: string;
  let courseId5: string;
  let courseId6: string;
  let offering5Id: Identifier;
  let offering6Id: Identifier;

  beforeAll(async () => {
    // Create a mock embedding router service
    mockEmbeddingRouterService = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as unknown as jest.Mocked<IEmbeddingRouterService>;

    module = await Test.createTestingModule({
      providers: [
        PrismaCourseLearningOutcomeRepository,
        PrismaService,
        AppConfigService,
        ConfigService,
        {
          provide: I_EMBEDDING_ROUTER_SERVICE_TOKEN,
          useValue: mockEmbeddingRouterService,
        },
      ],
    }).compile();

    repository = module.get<PrismaCourseLearningOutcomeRepository>(
      PrismaCourseLearningOutcomeRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.$executeRaw`TRUNCATE TABLE course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties RESTART IDENTITY CASCADE;`;

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
        campus: {
          connect: {
            id: campus1Id,
          },
        },
      },
    });
    faculty1Id = faculty1.id as Identifier;

    // Link first campus and faculty is now handled by the campus connect above

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
        campus: {
          connect: {
            id: campus2Id,
          },
        },
      },
    });
    faculty2Id = faculty2.id as Identifier;

    // Link second campus and faculty is now handled by the campus connect above

    // Create courses with different properties
    // Courses for first campus and faculty
    const course1 = await prisma.course.create({
      data: {
        id: MOCK_COURSE1_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        subjectCode: 'TEST101',
        subjectName: 'วิชาทดสอบ 1',
        isGenEd: true,
      },
    });
    courseId1 = course1.id;

    const course2 = await prisma.course.create({
      data: {
        id: MOCK_COURSE2_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        subjectCode: 'TEST102',
        subjectName: 'วิชาทดสอบ 2',
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
        subjectCode: 'TEST201',
        subjectName: 'วิชาทดสอบ 3',
        isGenEd: true,
      },
    });
    courseId3 = course3.id;

    const course4 = await prisma.course.create({
      data: {
        id: MOCK_COURSE4_ID,
        campusId: campus2Id,
        facultyId: faculty2Id,
        subjectCode: 'TEST202',
        subjectName: 'วิชาทดสอบ 4',
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
        subjectCode: 'TEST103',
        subjectName: 'วิชาทดสอบ 5',
        isGenEd: true,
      },
    });
    courseId5 = course5.id;

    const course6 = await prisma.course.create({
      data: {
        id: MOCK_COURSE6_ID,
        campusId: campus1Id,
        facultyId: faculty1Id,
        subjectCode: 'TEST104',
        subjectName: 'วิชาทดสอบ 6',
        isGenEd: false,
      },
    });
    courseId6 = course6.id;

    // Create course offerings for all courses (this is where academicYear, semester belong)
    const offering5 = await prisma.courseOffering.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440038',
        courseId: courseId5,
        academicYear: 2023,
        semester: 1,
      },
    });
    offering5Id = offering5.id as Identifier;

    const offering6 = await prisma.courseOffering.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440039',
        courseId: courseId6,
        academicYear: 2023,
        semester: 1,
      },
    });
    offering6Id = offering6.id as Identifier;

    // Create learning outcomes for first campus courses
    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO1_ID,
      courseId: courseId1,
      cloNo: 1,
      originalCloName: 'สามารถวิเคราะห์ข้อมูลได้',
      cleanedCloName: 'วิเคราะห์ข้อมูล',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO2_ID,
      courseId: courseId1,
      cloNo: 2,
      originalCloName: 'สามารถเขียนโปรแกรมได้',
      cleanedCloName: 'เขียนโปรแกรม',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO3_ID,
      courseId: courseId2,
      cloNo: 1,
      originalCloName: 'สามารถสื่อสารได้',
      cleanedCloName: 'สื่อสาร',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    // Create learning outcomes for second campus courses
    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO4_ID,
      courseId: courseId3,
      cloNo: 1,
      originalCloName: 'สามารถวางแผนโครงการได้',
      cleanedCloName: 'วางแผนโครงการ',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO5_ID,
      courseId: courseId3,
      cloNo: 2,
      originalCloName: 'สามารถจัดการทีมได้',
      cleanedCloName: 'จัดการทีม',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO6_ID,
      courseId: courseId4,
      cloNo: 1,
      originalCloName: 'สามารถแก้ปัญหาได้',
      cleanedCloName: 'แก้ปัญหา',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    // Create additional learning outcomes for testing
    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO7_ID,
      courseId: courseId5,
      cloNo: 1,
      originalCloName: 'สามารถวิเคราะห์ข้อมูลขั้นสูงได้',
      cleanedCloName: 'วิเคราะห์ข้อมูลขั้นสูง',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma,
      id: MOCK_CLO8_ID,
      courseId: courseId5,
      cloNo: 2,
      originalCloName: 'สามารถออกแบบระบบได้',
      cleanedCloName: 'ออกแบบระบบ',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    // Create vectors for all learning outcomes
    const mockVector768 = buildVectorFromSequence(
      [0.2, 0.1, 0.05, 0.02, 0.01, 0.03, 0.04, 0.15],
      VECTOR_DIMENSION_768,
    );
    // Create a different vector for CLO7 to test similarity ranking
    const highSimilarityVector768 = buildVectorFromSequence(
      [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55],
      VECTOR_DIMENSION_768,
    );
    // Create a medium similarity vector for CLO8 (different from both mockVector and highSimilarityVector)
    const mediumSimilarityVector768 = buildVectorFromSequence(
      [0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.01, 0.02],
      VECTOR_DIMENSION_768,
    );

    // Create 1536-dimension vectors for testing
    const mockVector1536 = buildVectorFromSequence(
      [0.15, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.25],
      VECTOR_DIMENSION_1536,
    );
    const highSimilarityVector1536 = buildVectorFromSequence(
      [0.95, 0.88, 0.82, 0.77, 0.72, 0.67, 0.62, 0.57],
      VECTOR_DIMENSION_1536,
    );

    // Create vectors for learning outcomes using raw SQL to bypass type issues
    await prisma.$executeRaw`
      INSERT INTO course_learning_outcome_vectors (id, embedded_text, embedding_768, embedding_1536)
      VALUES
        (${MOCK_VECTOR1_ID}::uuid, 'vector-1', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR2_ID}::uuid, 'vector-2', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR3_ID}::uuid, 'vector-3', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR4_ID}::uuid, 'vector-4', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR5_ID}::uuid, 'vector-5', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR6_ID}::uuid, 'vector-6', ${JSON.stringify(mockVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector),
        (${MOCK_VECTOR7_ID}::uuid, 'vector-7', ${JSON.stringify(highSimilarityVector768)}::vector, ${JSON.stringify(highSimilarityVector1536)}::vector),
        (${MOCK_VECTOR8_ID}::uuid, 'vector-8', ${JSON.stringify(mediumSimilarityVector768)}::vector, ${JSON.stringify(mockVector1536)}::vector)
    `;

    // Update CLOs to reference their vectors
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO1_ID },
      data: { vectorId: MOCK_VECTOR1_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO2_ID },
      data: { vectorId: MOCK_VECTOR2_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO3_ID },
      data: { vectorId: MOCK_VECTOR3_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO4_ID },
      data: { vectorId: MOCK_VECTOR4_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO5_ID },
      data: { vectorId: MOCK_VECTOR5_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO6_ID },
      data: { vectorId: MOCK_VECTOR6_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO7_ID },
      data: { vectorId: MOCK_VECTOR7_ID },
    });
    await prisma.courseLearningOutcome.update({
      where: { id: MOCK_CLO8_ID },
      data: { vectorId: MOCK_VECTOR8_ID },
    });

    // Mock embedding client response for 768-dimension
    // embedMany returns an array of embeddings, one per input text
    mockEmbeddingRouterService.embedMany.mockImplementation(
      ({ texts }: { texts: string[] }) => {
        // Return one embedding per text, all with the same neutral vector
        return Promise.resolve(
          texts.map(() => ({
            vector: buildVectorFromSequence([0.5], VECTOR_DIMENSION_768),
            metadata: {
              model: 'e5-base',
              provider: 'e5',
              dimension: 768,
              embeddedText: 'test',
              generatedAt: new Date().toISOString(),
            },
          })),
        );
      },
    );
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.$executeRaw`TRUNCATE TABLE course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties RESTART IDENTITY CASCADE;`;
    await module.close();
  });

  describe('findLosBySkills with filters', () => {
    it('should find learning outcomes without filters', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.size).toBe(1); // Only one skill was queried so the Map should contain a single entry.
      expect(result.has('วิเคราะห์')).toBe(true); // The key for the requested skill must exist.
      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0); // At least one CLO should pass the default filters.
      // Ensure we always surface the highest similarity CLO
      expect(matches.some((match) => match.loId === MOCK_CLO7_ID)).toBeTruthy(); // CLO7 is crafted as the closest match so it must always be present.
      // No duplicate CLOs should be returned for a single skill
      expect(new Set(matches.map((clo) => clo.loId)).size).toBe(matches.length); // Dedup logic should ensure unique CLO IDs per skill.
    });

    it('should filter by campusId (first campus)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus1Id,
      });

      expect(result.size).toBe(1); // Still querying a single skill.
      expect(result.has('วิเคราะห์')).toBe(true); // The skill key remains in the result map.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Filtering to campus1 should still yield some CLOs.
      // Verify all CLOs are from first campus
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // Every returned CLO should belong to campus1 courses.
      });
    });

    it('should filter by campusId (second campus)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus2Id,
      });

      expect(result.size).toBe(1); // Single skill query.
      expect(result.has('วางแผน')).toBe(true); // The requested skill is represented.
      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // There should be hits for campus2.
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // All returned CLOs must belong to campus2 courses.
      });
    });

    it('should filter by facultyId (first faculty)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: faculty1Id,
      });

      expect(result.size).toBe(1); // Only one skill requested.
      expect(result.has('วิเคราะห์')).toBe(true); // The skill key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Faculty1 filter should keep some CLOs.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // Every CLO should be associated with faculty1 courses.
      });
    });

    it('should filter by facultyId (second faculty)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['จัดการทีม'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: faculty2Id,
      });

      expect(result.size).toBe(1); // Single skill result.
      expect(result.has('จัดการทีม')).toBe(true); // The skill key exists.
      const cloIds = result.get('จัดการทีม')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Faculty2 filter should still yield data.
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // All returned CLOs should map to faculty2 courses.
      });
    });

    it('should filter by isGenEd = true', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: true,
      });

      expect(result.size).toBe(1); // Map should still hold one entry for the queried skill.
      expect(result.has('วิเคราะห์')).toBe(true); // The skill exists in the response.
      expect(result.get('วิเคราะห์')).toHaveLength(6); // Exactly six CLOs come from isGenEd=true courses (course1,3,5).

      // Verify only CLOs from courses with isGenEd=true are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID); // Course1 is isGenEd=true and should pass the filter.
      expect(cloIds).toContain(MOCK_CLO2_ID); // Same course1 dataset.
      expect(cloIds).toContain(MOCK_CLO4_ID); // Course3 is also isGenEd=true.
      expect(cloIds).toContain(MOCK_CLO5_ID); // Comes from course3 as well.
      expect(cloIds).toContain(MOCK_CLO7_ID); // Course5 is marked isGenEd=true.
      expect(cloIds).toContain(MOCK_CLO8_ID); // Course5 again.
      expect(cloIds).not.toContain(MOCK_CLO3_ID); // Course2 is isGenEd=false, so it must be excluded.
      expect(cloIds).not.toContain(MOCK_CLO6_ID); // Course4 (isGenEd=false) should not appear.
    });

    it('should filter by isGenEd = false', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: false,
      });

      expect(result.size).toBe(1); // Map contains one entry for the queried skill.
      expect(result.has('สื่อสาร')).toBe(true); // The skill key exists.
      expect(result.get('สื่อสาร')).toHaveLength(2); // Only two isGenEd=false CLOs survive the similarity ranking.

      // Verify only CLOs from courses with isGenEd=false are returned
      const cloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID); // Course2 has isGenEd=false.
      expect(cloIds).toContain(MOCK_CLO6_ID); // Course4 has isGenEd=false.
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from courses with isGenEd=true
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO7_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should filter by multiple criteria (first campus)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus1Id,
        facultyId: faculty1Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1); // Still querying a single skill.
      expect(result.has('วิเคราะห์')).toBe(true); // Skill key recorded.
      expect(result.get('วิเคราะห์')).toHaveLength(4); // Only course1 & course5 CLOs meet all combined filters.

      // Verify only CLOs from course1 and course5 (both isGenEd=true) with specified campus and faculty are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID); // Matches campus1+faculty1+isGenEd true.
      expect(cloIds).toContain(MOCK_CLO2_ID); // Same as above.
      expect(cloIds).toContain(MOCK_CLO7_ID); // Course5 satisfies all filters.
      expect(cloIds).toContain(MOCK_CLO8_ID); // Course5 as well.
      expect(cloIds).not.toContain(MOCK_CLO3_ID); // This CLO is from course2 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO4_ID); // These CLOs are from second campus
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by multiple criteria (second campus)', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus2Id,
        facultyId: faculty2Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1); // One skill result.
      expect(result.has('วางแผน')).toBe(true); // Skill present.
      expect(result.get('วางแผน')).toHaveLength(2); // Only course3 CLOs satisfy campus2+faculty2+isGenEd true.

      // Verify only CLOs from course3 (isGenEd=true) with specified campus and faculty are returned
      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO4_ID); // Course3, which fits all filters.
      expect(cloIds).toContain(MOCK_CLO5_ID); // Same course3.
      expect(cloIds).not.toContain(MOCK_CLO6_ID); // This CLO is from course4 (isGenEd=false)
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from first campus
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
    });

    it('should return filtered results when isGenEd filter excludes some results', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: false, // This should exclude CLOs from courses with isGenEd=true
      });

      expect(result.size).toBe(1); // Map size remains one.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      expect(result.get('วิเคราะห์')).toHaveLength(2); // Only two isGenEd=false CLOs survive the similarity ranking.

      // Verify only CLOs from courses with isGenEd=false are returned
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID); // Course2 matches the filter.
      expect(cloIds).toContain(MOCK_CLO6_ID); // Course4 matches the filter.
      expect(cloIds).not.toContain(MOCK_CLO1_ID); // These CLOs are from courses with isGenEd=true
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO7_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should handle multiple skills with filters', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: true,
      });

      expect(result.size).toBe(2); // Two skill queries should produce two Map entries.
      expect(result.has('วิเคราะห์')).toBe(true); // First skill present.
      expect(result.has('สื่อสาร')).toBe(true); // Second skill present.
      expect(result.get('วิเคราะห์')).toHaveLength(6); // Six CLOs from isGenEd=true courses match.
      expect(result.get('สื่อสาร')).toHaveLength(6); // Same dataset for the second skill due to identical embeddings.

      // Verify both skills return only CLOs from courses with isGenEd=true
      const analysisCloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      const communicationCloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);

      expect(analysisCloIds).toContain(MOCK_CLO1_ID); // Course1 (isGenEd=true) should appear.
      expect(analysisCloIds).toContain(MOCK_CLO2_ID); // Same course1.
      expect(analysisCloIds).toContain(MOCK_CLO4_ID); // Course3 qualifies.
      expect(analysisCloIds).toContain(MOCK_CLO5_ID); // Course3 as well.
      expect(analysisCloIds).toContain(MOCK_CLO7_ID); // Course5 qualifies.
      expect(analysisCloIds).toContain(MOCK_CLO8_ID); // Course5 as well.
      expect(analysisCloIds).not.toContain(MOCK_CLO3_ID); // Course2 is filtered out.
      expect(analysisCloIds).not.toContain(MOCK_CLO6_ID); // Course4 is filtered out.

      expect(communicationCloIds).toContain(MOCK_CLO1_ID); // Same inclusion logic applies to second skill.
      expect(communicationCloIds).toContain(MOCK_CLO2_ID);
      expect(communicationCloIds).toContain(MOCK_CLO4_ID);
      expect(communicationCloIds).toContain(MOCK_CLO5_ID);
      expect(communicationCloIds).toContain(MOCK_CLO7_ID);
      expect(communicationCloIds).toContain(MOCK_CLO8_ID);
      expect(communicationCloIds).not.toContain(MOCK_CLO3_ID); // isGenEd=false course.
      expect(communicationCloIds).not.toContain(MOCK_CLO6_ID); // isGenEd=false course.
    });

    it('should filter by academicYear filters', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023 }],
      });

      expect(result.size).toBe(1); // Single skill query.
      expect(result.has('วิเคราะห์')).toBe(true); // Skill key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Year filter should still produce CLOs.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // Every CLO must belong to academic year 2023.
      });
    });

    it('should filter by academic year and semesters', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023, semesters: [1] }],
      });

      expect(result.size).toBe(1); // Single skill result.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Year+semester filter should return some CLOs.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // All matches belong to semester 1 of 2023.
      });
    });

    it('should filter by multiple academicYear entries', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023 }, { academicYear: 2024 }],
      });

      expect(result.size).toBe(1); // Single skill map.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Combining multiple academic years still yields data from 2023.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // Only CLOs from the allowed academic year(s) should appear.
      });
    });

    it('should filter by multiple semesters within a year', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          {
            academicYear: 2023,
            semesters: [1, 2],
          },
        ],
      });

      expect(result.size).toBe(1); // Single skill result.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Semesters list still includes semester 1 data.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // Each CLO belongs to semester 1 (semester 2 is empty in setup).
      });
    });

    it('should filter by mixed academic year and semester entries', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          { academicYear: 2023, semesters: [1] },
          { academicYear: 2024 },
        ],
      });

      expect(result.size).toBe(1); // Single skill Map entry.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Combined filters should still produce semester 1 matches.
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy(); // All matches still belong to allowed years/semesters.
      });
    });

    it('should return no results for non-matching academic years', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2024 }],
      });

      expect(result.size).toBe(1); // Map entry exists even if empty array.
      expect(result.has('วิเคราะห์')).toBe(true); // Skill key exists.
      expect(result.get('วิเคราะห์')).toHaveLength(0); // Dataset has no 2024 CLOs so result must be empty.
    });

    it('should return no results for non-matching semesters within a year', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023, semesters: [2] }],
      });

      expect(result.size).toBe(1); // Map entry stays present.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.
      expect(result.get('วิเคราะห์')).toHaveLength(0); // No semester 2 data so array should be empty.
    });

    it('should only include semesters that belong to the specified academic years', async () => {
      // Move course5 and course6 into different semesters and years
      await prisma.courseOffering.update({
        where: { id: offering5Id },
        data: { academicYear: 2024, semester: 0 },
      });
      await prisma.courseOffering.update({
        where: { id: offering6Id },
        data: { academicYear: 2024, semester: 1 },
      });

      // Create a new CLO that only belongs to course6 (2024 semester 1)
      const EXTRA_CLO_ID = '550e8400-e29b-41d4-a716-446655441111';
      const EXTRA_VECTOR_ID = '550e8400-e29b-41d4-a716-446655441112';
      await insertCourseLearningOutcomeRecord({
        prisma,
        id: EXTRA_CLO_ID,
        courseId: courseId6,
        cloNo: 3,
        originalCloName: 'สามารถวิเคราะห์ข้อมูลเฉพาะทางได้',
        cleanedCloName: 'วิเคราะห์เฉพาะทาง',
        hasEmbedding768: true,
        hasEmbedding1536: false,
      });

      const additionalVector768 = buildVectorFromSequence(
        [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82],
        VECTOR_DIMENSION_768,
      );
      const additionalVector1536 = buildVectorFromSequence(
        [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82],
        VECTOR_DIMENSION_1536,
      );
      await prisma.$executeRaw`
        INSERT INTO course_learning_outcome_vectors (id, embedded_text, embedding_768, embedding_1536)
        VALUES (${EXTRA_VECTOR_ID}::uuid, 'vector-extra', ${JSON.stringify(additionalVector768)}::vector, ${JSON.stringify(additionalVector1536)}::vector)
      `;

      // Update the extra CLO to reference its vector
      await prisma.courseLearningOutcome.update({
        where: { id: EXTRA_CLO_ID },
        data: { vectorId: EXTRA_VECTOR_ID },
      });

      // No additional linking table is needed; CLO is already associated with course6

      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          { academicYear: 2023, semesters: [1] },
          { academicYear: 2024, semesters: [0] },
        ],
      });

      expect(result.size).toBe(1); // Even after data mutation, single skill query returns one entry.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.

      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0); // Filter still finds CLOs that match allowed semesters.
      // All returned CLOs must belong to course5 (2024 semester 0) because it is the only offering that matches the provided filters.
      expect(
        cloIds.every((id) => [MOCK_CLO7_ID, MOCK_CLO8_ID].includes(id)),
      ).toBeTruthy();
      // Semesters not listed in the filter (e.g., 2024 semester 1) should be excluded
      expect(cloIds).not.toContain(EXTRA_CLO_ID); // The artificially added 2024 semester 1 CLO must be filtered out.
    });
  });

  describe('findLosBySkills with similarity ranking and deduplication', () => {
    it('should rank similarity scores correctly in descending order', async () => {
      // Mock embedding client to return a vector that's closest to CLO7's high-similarity pattern
      // but not identical to avoid near-perfect similarity
      const queryVector = buildVectorFromSequence(
        [0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5],
        VECTOR_DIMENSION_768,
      );
      mockEmbeddingRouterService.embedMany.mockResolvedValue([
        {
          vector: queryVector,
          metadata: {
            model: 'e5-base',
            provider: 'e5',
            dimension: 768,
            embeddedText: 'test',
            generatedAt: new Date().toISOString(),
          },
        },
      ]);

      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.size).toBe(1); // Only one skill queried.
      expect(result.has('วิเคราะห์')).toBe(true); // Map contains the requested skill.

      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThanOrEqual(1); // There should be at least one match after ranking.

      // The highest-ranked CLO should be CLO7 because its vector most closely matches the query
      expect(matches[0].loId).toBe(MOCK_CLO7_ID); // CLO7 has the closest synthetic embedding and should top the list.

      // Ensure similarity scores are sorted in descending order
      const similarities = matches.map((match) => match.similarityScore);
      const sortedSimilarities = [...similarities].sort((a, b) => b - a);
      expect(similarities).toEqual(sortedSimilarities); // ROW_NUMBER ordering must sort by highest similarity first.
    });

    it('should deduplicate CLOs when they have multiple course-CLO relations', async () => {
      // Using real embedding client

      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus1Id, // Filter to first campus where courses 5 and 6 are located
      });

      expect(result.size).toBe(1); // One skill in the result map.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.

      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0); // Filtering still leaves some CLOs.

      // CLO7 should appear only once even though it's linked to both course5 and course6
      expect(
        matches.filter((match) => match.loId === MOCK_CLO7_ID).length,
      ).toBe(1); // Dedup logic should keep only one instance of CLO7.
      expect(matches.some((match) => match.loId === MOCK_CLO7_ID)).toBeTruthy(); // CLO7 must still be present.
    });

    it('should keep highest similarity when CLO appears multiple times with different courses', async () => {
      // Using real embedding client

      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: campus1Id,
      });

      expect(result.size).toBe(1); // Single skill requested.
      expect(result.has('วิเคราะห์')).toBe(true); // Key exists.

      const matches = result.get('วิเคราะห์')!;
      const clo7Match = matches.find((match) => match.loId === MOCK_CLO7_ID);

      // CLO7 should appear exactly once
      expect(
        matches.filter((match) => match.loId === MOCK_CLO7_ID),
      ).toHaveLength(1); // Even with relaxed threshold, dedup should keep CLO7 singular.

      // Verify CLO7 is included and has a valid similarity score
      expect(clo7Match).toBeDefined(); // CLO7 must still be part of the results.
      expect(clo7Match!.similarityScore).toBeGreaterThanOrEqual(0.3); // Similarity should clear the threshold passed into the query.
    });

    it('should return every CLO tied to the top-ranked vectors even when topN is small', async () => {
      const queryVector = buildVectorFromSequence(
        [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55],
        VECTOR_DIMENSION_768,
      );
      mockEmbeddingRouterService.embedMany.mockResolvedValueOnce([
        {
          vector: queryVector,
          metadata: {
            model: 'e5-base',
            provider: 'e5',
            dimension: 768,
            embeddedText: 'test',
            generatedAt: new Date().toISOString(),
          },
        },
      ]);

      // Force CLO7 and CLO8 to share the same vector so we can verify that all CLOs
      // tied to a selected vector are returned even when topN restricts scoring.
      await prisma.courseLearningOutcome.update({
        where: { id: MOCK_CLO8_ID },
        data: { vectorId: MOCK_VECTOR7_ID },
      });

      try {
        const { losBySkill: result } = await repository.findLosBySkills({
          skills: ['วิเคราะห์'],
          threshold: 0.5,
          topN: 1,
          embeddingConfiguration: {
            model: 'e5-base',
            provider: 'e5',
          },
          campusId: campus1Id,
        });

        expect(result.size).toBe(1);
        const matches = result.get('วิเคราะห์')!;
        expect(matches).toHaveLength(2);
        const cloIds = matches.map((match) => match.loId);
        expect(cloIds).toContain(MOCK_CLO7_ID);
        expect(cloIds).toContain(MOCK_CLO8_ID);
      } finally {
        // Restore CLO8's original vector mapping for subsequent tests.
        await prisma.courseLearningOutcome.update({
          where: { id: MOCK_CLO8_ID },
          data: { vectorId: MOCK_VECTOR8_ID },
        });
      }
    });
  });

  describe('findLosBySkills with 1536-dimension embeddings', () => {
    beforeEach(async () => {
      // Update some CLOs to have 1536-dimension embeddings
      await prisma.courseLearningOutcome.updateMany({
        where: { id: { in: [MOCK_CLO1_ID, MOCK_CLO2_ID, MOCK_CLO7_ID] } },
        data: { hasEmbedding1536: true },
      });

      // Mock embedding client response for 1536-dimension
      mockEmbeddingRouterService.embedMany.mockImplementation(
        ({ texts }: { texts: string[] }) => {
          return Promise.resolve(
            texts.map(() => ({
              vector: buildVectorFromSequence([0.5], VECTOR_DIMENSION_1536),
              metadata: {
                model: 'openai/text-embedding-3-small',
                provider: 'openrouter',
                dimension: 1536,
                embeddedText: 'test',
                generatedAt: new Date().toISOString(),
              },
            })),
          );
        },
      );
    });

    it('should find learning outcomes with 1536-dimension embeddings', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0);

      // Should only return CLOs with 1536-dimension embeddings
      const cloIds = matches.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should filter by campusId with 1536-dimension embeddings', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
        campusId: campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0);

      // Should only return CLOs from campus1 with 1536-dimension embeddings
      const cloIds = matches.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should return no results when no CLOs have 1536-dimension embeddings', async () => {
      // Remove all 1536-dimension embeddings
      await prisma.courseLearningOutcome.updateMany({
        where: { hasEmbedding1536: true },
        data: { hasEmbedding1536: false },
      });

      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(0);
    });

    it('should handle mixed skills with 1536-dimension embeddings', async () => {
      const { losBySkill: result } = await repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
      });

      expect(result.size).toBe(2);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.has('สื่อสาร')).toBe(true);

      // Both skills should return the same CLOs with 1536-dimension embeddings
      const analysisMatches = result.get('วิเคราะห์')!;
      const communicationMatches = result.get('สื่อสาร')!;

      expect(analysisMatches.length).toBeGreaterThan(0);
      expect(communicationMatches.length).toBeGreaterThan(0);

      const analysisCloIds = analysisMatches.map((clo) => clo.loId);
      const communicationCloIds = communicationMatches.map((clo) => clo.loId);

      // Should contain CLOs with 1536-dimension embeddings
      expect(analysisCloIds).toContain(MOCK_CLO1_ID);
      expect(analysisCloIds).toContain(MOCK_CLO2_ID);
      expect(analysisCloIds).toContain(MOCK_CLO7_ID);
      expect(communicationCloIds).toContain(MOCK_CLO1_ID);
      expect(communicationCloIds).toContain(MOCK_CLO2_ID);
      expect(communicationCloIds).toContain(MOCK_CLO7_ID);
    });
  });

  describe('findLosBySkills embedding metadata', () => {
    it('should return embedding usage metadata for each skill', async () => {
      const { embeddingUsage } = await repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      // Verify embeddingUsage has entries for each skill
      expect(embeddingUsage.bySkill).toHaveLength(2);
      expect(embeddingUsage.totalTokens).toBeGreaterThan(0);

      // Verify embedding metadata structure for first skill
      const analysisMetadata = embeddingUsage.bySkill[0];
      expect(analysisMetadata.skill).toBe('วิเคราะห์');
      expect(analysisMetadata.model).toBe('e5-base');
      expect(analysisMetadata.provider).toBe('e5');
      expect(analysisMetadata.dimension).toBe(768);
      expect(analysisMetadata.embeddedText).toBe('test'); // Mock returns hardcoded 'test'
      expect(analysisMetadata.generatedAt).toBeDefined();
      expect(typeof analysisMetadata.generatedAt).toBe('string');
      expect(analysisMetadata.promptTokens).toBeGreaterThan(0);
      expect(analysisMetadata.totalTokens).toBeGreaterThan(0);

      // Verify embedding metadata structure for second skill
      const communicationMetadata = embeddingUsage.bySkill[1];
      expect(communicationMetadata.skill).toBe('สื่อสาร');
      expect(communicationMetadata.model).toBe('e5-base');
      expect(communicationMetadata.provider).toBe('e5');
      expect(communicationMetadata.dimension).toBe(768);
      expect(communicationMetadata.embeddedText).toBe('test'); // Mock returns hardcoded 'test'
      expect(communicationMetadata.generatedAt).toBeDefined();
    });

    it('should include token counts in embedding metadata when available', async () => {
      const { embeddingUsage } = await repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      const metadata = embeddingUsage.bySkill[0];
      // Token counts should always be present (estimated if not from API)
      expect(typeof metadata.promptTokens).toBe('number');
      expect(metadata.promptTokens).toBeGreaterThan(0);
      expect(typeof metadata.totalTokens).toBe('number');
      expect(metadata.totalTokens).toBeGreaterThan(0);
    });
  });
});
