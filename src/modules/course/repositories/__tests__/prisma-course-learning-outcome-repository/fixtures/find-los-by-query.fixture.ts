import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  I_EMBEDDING_ROUTER_SERVICE_TOKEN,
  IEmbeddingRouterService,
} from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { PrismaCourseLearningOutcomeRepository } from '../../../prisma-course-learning-outcome.repository';
// Import constants directly from find-los-by-skills.fixture
import {
  buildVectorFromSequence,
  insertCourseLearningOutcomeRecord,
  MOCK_CAMPUS1_ID,
  MOCK_CAMPUS2_ID,
  MOCK_CLO1_ID,
  MOCK_CLO2_ID,
  MOCK_CLO3_ID,
  MOCK_CLO4_ID,
  MOCK_CLO5_ID,
  MOCK_CLO6_ID,
  MOCK_CLO7_ID,
  MOCK_CLO8_ID,
  MOCK_COURSE1_ID,
  MOCK_COURSE2_ID,
  MOCK_COURSE3_ID,
  MOCK_COURSE4_ID,
  MOCK_COURSE5_ID,
  MOCK_COURSE6_ID,
  MOCK_FACULTY1_ID,
  MOCK_FACULTY2_ID,
  MOCK_VECTOR1_ID,
  MOCK_VECTOR2_ID,
  MOCK_VECTOR3_ID,
  MOCK_VECTOR4_ID,
  MOCK_VECTOR5_ID,
  MOCK_VECTOR6_ID,
  MOCK_VECTOR7_ID,
  MOCK_VECTOR8_ID,
  VECTOR_DIMENSION_768,
  VECTOR_DIMENSION_1536,
} from './find-los-by-skills.fixture';

// =============================================================================
// TEST FIXTURE CLASS FOR findLosByQuery
// =============================================================================

export class FindLosByQueryTestFixture {
  module: TestingModule;
  repository: PrismaCourseLearningOutcomeRepository;
  prisma: PrismaService;
  mockEmbeddingRouterService: jest.Mocked<IEmbeddingRouterService>;

  // Test data IDs
  campus1Id: Identifier;
  campus2Id: Identifier;
  faculty1Id: Identifier;
  faculty2Id: Identifier;
  courseId1: string;
  courseId2: string;
  courseId3: string;
  courseId4: string;
  courseId5: string;
  courseId6: string;
  offering5Id: Identifier;
  offering6Id: Identifier;

  async setup() {
    // Create a mock embedding router service
    this.mockEmbeddingRouterService = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as unknown as jest.Mocked<IEmbeddingRouterService>;

    this.module = await Test.createTestingModule({
      providers: [
        PrismaCourseLearningOutcomeRepository,
        PrismaService,
        AppConfigService,
        ConfigService,
        {
          provide: I_EMBEDDING_ROUTER_SERVICE_TOKEN,
          useValue: this.mockEmbeddingRouterService,
        },
      ],
    }).compile();

    this.repository = this.module.get<PrismaCourseLearningOutcomeRepository>(
      PrismaCourseLearningOutcomeRepository,
    );
    this.prisma = this.module.get<PrismaService>(PrismaService);
  }

  async beforeEach() {
    // Clean up database before each test
    await this.prisma
      .$executeRaw`TRUNCATE TABLE course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties RESTART IDENTITY CASCADE;`;

    // Create first campus and faculty
    const campus1 = await this.prisma.campus.create({
      data: {
        id: MOCK_CAMPUS1_ID,
        code: 'TEST_CAMPUS1',
        nameTh: 'ทดสอบวิทยาเขต 1',
        nameEn: 'Test Campus 1',
      },
    });
    this.campus1Id = campus1.id as Identifier;

    const faculty1 = await this.prisma.faculty.create({
      data: {
        id: MOCK_FACULTY1_ID,
        code: 'TEST_FACULTY1',
        nameTh: 'ทดสอบคณะ 1',
        nameEn: 'Test Faculty 1',
        campus: {
          connect: {
            id: this.campus1Id,
          },
        },
      },
    });
    this.faculty1Id = faculty1.id as Identifier;

    // Create second campus and faculty
    const campus2 = await this.prisma.campus.create({
      data: {
        id: MOCK_CAMPUS2_ID,
        code: 'TEST_CAMPUS2',
        nameTh: 'ทดสอบวิทยาเขต 2',
        nameEn: 'Test Campus 2',
      },
    });
    this.campus2Id = campus2.id as Identifier;

    const faculty2 = await this.prisma.faculty.create({
      data: {
        id: MOCK_FACULTY2_ID,
        code: 'TEST_FACULTY2',
        nameTh: 'ทดสอบคณะ 2',
        nameEn: 'Test Faculty 2',
        campus: {
          connect: {
            id: this.campus2Id,
          },
        },
      },
    });
    this.faculty2Id = faculty2.id as Identifier;

    // Create courses
    const course1 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE1_ID,
        campusId: this.campus1Id,
        facultyId: this.faculty1Id,
        subjectCode: 'TEST101',
        subjectName: 'วิชาทดสอบ 1',
        isGenEd: true,
      },
    });
    this.courseId1 = course1.id;

    const course2 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE2_ID,
        campusId: this.campus1Id,
        facultyId: this.faculty1Id,
        subjectCode: 'TEST102',
        subjectName: 'วิชาทดสอบ 2',
        isGenEd: false,
      },
    });
    this.courseId2 = course2.id;

    const course3 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE3_ID,
        campusId: this.campus2Id,
        facultyId: this.faculty2Id,
        subjectCode: 'TEST201',
        subjectName: 'วิชาทดสอบ 3',
        isGenEd: true,
      },
    });
    this.courseId3 = course3.id;

    const course4 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE4_ID,
        campusId: this.campus2Id,
        facultyId: this.faculty2Id,
        subjectCode: 'TEST202',
        subjectName: 'วิชาทดสอบ 4',
        isGenEd: false,
      },
    });
    this.courseId4 = course4.id;

    const course5 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE5_ID,
        campusId: this.campus1Id,
        facultyId: this.faculty1Id,
        subjectCode: 'TEST103',
        subjectName: 'วิชาทดสอบ 5',
        isGenEd: true,
      },
    });
    this.courseId5 = course5.id;

    const course6 = await this.prisma.course.create({
      data: {
        id: MOCK_COURSE6_ID,
        campusId: this.campus1Id,
        facultyId: this.faculty1Id,
        subjectCode: 'TEST104',
        subjectName: 'วิชาทดสอบ 6',
        isGenEd: false,
      },
    });
    this.courseId6 = course6.id;

    // Create course offerings
    const offering5 = await this.prisma.courseOffering.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440038',
        courseId: this.courseId5,
        academicYear: 2023,
        semester: 1,
      },
    });
    this.offering5Id = offering5.id as Identifier;

    const offering6 = await this.prisma.courseOffering.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440039',
        courseId: this.courseId6,
        academicYear: 2023,
        semester: 1,
      },
    });
    this.offering6Id = offering6.id as Identifier;

    // Create learning outcomes
    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO1_ID,
      courseId: this.courseId1,
      cloNo: 1,
      originalCloName: 'สามารถวิเคราะห์ข้อมูลได้',
      cleanedCloName: 'วิเคราะห์ข้อมูล',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO2_ID,
      courseId: this.courseId1,
      cloNo: 2,
      originalCloName: 'สามารถเขียนโปรแกรมได้',
      cleanedCloName: 'เขียนโปรแกรม',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO3_ID,
      courseId: this.courseId2,
      cloNo: 1,
      originalCloName: 'สามารถสื่อสารได้',
      cleanedCloName: 'สื่อสาร',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO4_ID,
      courseId: this.courseId3,
      cloNo: 1,
      originalCloName: 'สามารถวางแผนโครงการได้',
      cleanedCloName: 'วางแผนโครงการ',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO5_ID,
      courseId: this.courseId3,
      cloNo: 2,
      originalCloName: 'สามารถจัดการทีมได้',
      cleanedCloName: 'จัดการทีม',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO6_ID,
      courseId: this.courseId4,
      cloNo: 1,
      originalCloName: 'สามารถแก้ปัญหาได้',
      cleanedCloName: 'แก้ปัญหา',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO7_ID,
      courseId: this.courseId5,
      cloNo: 1,
      originalCloName: 'สามารถวิเคราะห์ข้อมูลขั้นสูงได้',
      cleanedCloName: 'วิเคราะห์ข้อมูลขั้นสูง',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    await insertCourseLearningOutcomeRecord({
      prisma: this.prisma,
      id: MOCK_CLO8_ID,
      courseId: this.courseId5,
      cloNo: 2,
      originalCloName: 'สามารถออกแบบระบบได้',
      cleanedCloName: 'ออกแบบระบบ',
      hasEmbedding768: true,
      hasEmbedding1536: false,
    });

    // Create vectors
    const mockVector768 = buildVectorFromSequence(
      [0.2, 0.1, 0.05, 0.02, 0.01, 0.03, 0.04, 0.15],
      VECTOR_DIMENSION_768,
    );
    const highSimilarityVector768 = buildVectorFromSequence(
      [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55],
      VECTOR_DIMENSION_768,
    );
    const mediumSimilarityVector768 = buildVectorFromSequence(
      [0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.01, 0.02],
      VECTOR_DIMENSION_768,
    );

    const mockVector1536 = buildVectorFromSequence(
      [0.15, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.25],
      VECTOR_DIMENSION_1536,
    );
    const highSimilarityVector1536 = buildVectorFromSequence(
      [0.95, 0.88, 0.82, 0.77, 0.72, 0.67, 0.62, 0.57],
      VECTOR_DIMENSION_1536,
    );

    // Create vectors using raw SQL
    await this.prisma.$executeRaw`
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
    const vectorUpdates = [
      { cloId: MOCK_CLO1_ID, vectorId: MOCK_VECTOR1_ID },
      { cloId: MOCK_CLO2_ID, vectorId: MOCK_VECTOR2_ID },
      { cloId: MOCK_CLO3_ID, vectorId: MOCK_VECTOR3_ID },
      { cloId: MOCK_CLO4_ID, vectorId: MOCK_VECTOR4_ID },
      { cloId: MOCK_CLO5_ID, vectorId: MOCK_VECTOR5_ID },
      { cloId: MOCK_CLO6_ID, vectorId: MOCK_VECTOR6_ID },
      { cloId: MOCK_CLO7_ID, vectorId: MOCK_VECTOR7_ID },
      { cloId: MOCK_CLO8_ID, vectorId: MOCK_VECTOR8_ID },
    ];

    for (const update of vectorUpdates) {
      await this.prisma.courseLearningOutcome.update({
        where: { id: update.cloId },
        data: { vectorId: update.vectorId },
      });
    }

    // Mock embedding client response for 768-dimension (embedOne, not embedMany)
    this.mockEmbeddingRouterService.embedOne.mockResolvedValue({
      vector: buildVectorFromSequence([0.5], VECTOR_DIMENSION_768),
      metadata: {
        model: 'e5-base',
        provider: 'e5',
        dimension: VECTOR_DIMENSION_768,
        embeddedText: 'test query',
        generatedAt: new Date().toISOString(),
        promptTokens: 10,
        totalTokens: 10,
      },
    });
  }

  async cleanup() {
    await this.prisma
      .$executeRaw`TRUNCATE TABLE course_learning_outcome_vectors, course_learning_outcomes, courses, campuses, faculties RESTART IDENTITY CASCADE;`;
    await this.module.close();
  }
}
