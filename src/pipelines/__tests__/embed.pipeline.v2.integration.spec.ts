import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  EmbeddingModels,
  EmbeddingProviders,
} from 'src/core/embedding/constants/model.constant';
import { v4 as uuidv4 } from 'uuid';

import { AppConfigService } from 'src/config/app-config.service';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { parseVector } from 'src/modules/course/repositories/helpers/vector.helper';

import { EmbedPipelineV2 } from '../embed.pipeline.v2';

// Import the CombinedVectorMetadata type from the pipeline file
type CombinedVectorMetadata = {
  vector_768?: {
    model: string;
    provider: string;
    dimension: number;
    original_text: string;
    embed_text: string;
    generated_at: string;
  };
  vector_1536?: {
    model: string;
    provider: string;
    dimension: number;
    original_text: string;
    embed_text: string;
    generated_at: string;
  };
};

describe('EmbedPipelineV2 (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: EmbedPipelineV2;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        EmbedPipelineV2,
        PrismaService,
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();

    pipeline = moduleRef.get(EmbedPipelineV2);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcomes, course_learning_outcome_vectors, courses, faculties, campuses RESTART IDENTITY CASCADE;`;
    jest.clearAllMocks();
  });

  it('creates a new vector with combined faculty+course+LO text for 768 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP1',
        nameTh: 'วิทยาเขตบางเขน',
        nameEn: 'Bangkhen Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC1',
        nameTh: 'คณะวิศวกรรมศาสตร์',
        nameEn: 'Faculty of Engineering',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST101',
        subjectName: 'วิศวกรรมโยธา',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'สามารถออกแบบโครงสร้างคอนกรีตได้',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // Expected combined text: course name + LO text (faculty is not included)
    const expectedCombinedText =
      `${course.subjectName} ${clo.cleanedCloName}`.trim();

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.1),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: expectedCombinedText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getE5ClientSpy = jest
      .spyOn(pipeline as any, 'getE5EmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(768);
    } finally {
      getE5ClientSpy.mockRestore();
    }

    // Assert
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding768).toBe(true);
    expect(updatedClo?.vectorId).not.toBeNull();

    // Check that embedOne was called with combined text
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: expectedCombinedText,
      role: 'passage',
    });

    // Verify that vector was created with combined text
    const vectorRecord = await prisma.courseLearningOutcomeVector.findUnique({
      where: { id: updatedClo?.vectorId || '' },
    });
    expect(vectorRecord?.embeddedText).toBe(expectedCombinedText);

    // Verify metadata structure
    const vectorMetadata =
      vectorRecord?.metadata as CombinedVectorMetadata | null;
    expect(vectorMetadata).not.toBeNull();
    expect(vectorMetadata?.vector_768).toEqual({
      model: EmbeddingModels.E5_BASE,
      provider: EmbeddingProviders.E5,
      dimension: 768,
      original_text: expectedCombinedText,
      embed_text: expectedCombinedText,
      generated_at: expect.any(String) as string,
    });
  });

  it('creates a new vector with combined faculty+course+LO text for 1536 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP2',
        nameTh: 'วิทยาเขตคลองจัด',
        nameEn: 'Klongjad Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC2',
        nameTh: 'คณะวิทยาศาสตร์',
        nameEn: 'Faculty of Science',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST102',
        subjectName: 'คณิตศาสตร์',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'สามารถแก้สมการพหุนามได้',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // Expected combined text: course name + LO text (faculty is not included)
    const expectedCombinedText =
      `${course.subjectName} ${clo.cleanedCloName}`.trim();

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.2),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: expectedCombinedText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getOpenRouterClientSpy = jest
      .spyOn(pipeline as any, 'getOpenRouterEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(1536);
    } finally {
      getOpenRouterClientSpy.mockRestore();
    }

    // Assert
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding1536).toBe(true);
    expect(updatedClo?.vectorId).not.toBeNull();

    // Check that embedOne was called with combined text
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: expectedCombinedText,
      role: 'passage',
    });

    // Verify that vector was created with combined text
    const vectorRecord = await prisma.courseLearningOutcomeVector.findUnique({
      where: { id: updatedClo?.vectorId || '' },
    });
    expect(vectorRecord?.embeddedText).toBe(expectedCombinedText);

    // Verify metadata structure
    const vectorMetadata =
      vectorRecord?.metadata as CombinedVectorMetadata | null;
    expect(vectorMetadata).not.toBeNull();
    expect(vectorMetadata?.vector_1536).toEqual({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      provider: EmbeddingProviders.OPENROUTER,
      dimension: 1536,
      original_text: expectedCombinedText,
      embed_text: expectedCombinedText,
      generated_at: expect.any(String) as string,
    });
  });

  it('reuses an existing vector row by matching combined embedded_text when embedding 768 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP3',
        nameTh: 'วิทยาเขตบางเขน',
        nameEn: 'Bangkhen Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC3',
        nameTh: 'คณะสถาปัตยกรรมศาสตร์',
        nameEn: 'Faculty of Architecture',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST103',
        subjectName: 'สถาปัตยกรรมภายใน',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'สามารถออกแบบภายในได้',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // Expected combined text: course name + LO text (faculty is not included)
    const expectedCombinedText =
      `${course.subjectName} ${clo.cleanedCloName}`.trim();

    // First create the vector record with the combined text and embedding
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        id: uuidv4(),
        embeddedText: expectedCombinedText,
        metadata: {},
      },
    });

    // Then add the embedding using raw SQL with correct dimensions
    const embedding768 = Array(768).fill(0.3);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_768 = ${embedding768}::vector(768)
      WHERE id = ${vector.id}::uuid
    `;

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.3),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: expectedCombinedText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getE5ClientSpy = jest
      .spyOn(pipeline as any, 'getE5EmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(768);
    } finally {
      getE5ClientSpy.mockRestore();
    }

    // Assert
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding768).toBe(true);
    // The pipeline should find and reuse the existing vector since it has the same combined text
    expect(updatedClo?.vectorId).toBe(vector.id);

    // Query the vector using raw SQL to get the embedding
    const updatedVector = await prisma.$queryRaw<
      { embedding_768: string | null }[]
    >`
      SELECT embedding_768::text
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(updatedVector[0].embedding_768).not.toBeNull();

    // Verify the vector can be parsed and has the correct dimension
    const parsedVector = parseVector(updatedVector[0].embedding_768);
    expect(parsedVector).toHaveLength(768);

    // Check that embedOne was not called since we're reusing existing vector
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });

  it('handles empty faculty name gracefully in combined text', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP4',
        nameTh: 'วิทยาเขตบางเขน',
        nameEn: 'Bangkhen Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC4',
        nameTh: '', // Empty Thai name
        nameEn: 'Faculty of Test',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST104',
        subjectName: 'ทดสอบ',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'ทดสอบได้',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // Expected combined text: course name + LO text (faculty is not included)
    const expectedCombinedText =
      `${course.subjectName} ${clo.cleanedCloName}`.trim();

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.4),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: expectedCombinedText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getE5ClientSpy = jest
      .spyOn(pipeline as any, 'getE5EmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(768);
    } finally {
      getE5ClientSpy.mockRestore();
    }

    // Assert
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding768).toBe(true);

    // Check that embedOne was called with combined text (without faculty name)
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: expectedCombinedText,
      role: 'passage',
    });

    // Verify that vector was created with combined text
    const vectorRecord = await prisma.courseLearningOutcomeVector.findUnique({
      where: { id: updatedClo?.vectorId || '' },
    });
    expect(vectorRecord?.embeddedText).toBe(expectedCombinedText);
  });

  it('processes multiple CLOs with different faculty/course combinations in batches correctly', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP5',
        nameTh: 'วิทยาเขตบางเขน',
        nameEn: 'Bangkhen Campus',
      },
    });

    const faculty1 = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC5',
        nameTh: 'คณะวิศวกรรมศาสตร์',
        nameEn: 'Faculty of Engineering',
        campusId: campus.id,
      },
    });

    const faculty2 = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC6',
        nameTh: 'คณะแพทยศาสตร์',
        nameEn: 'Faculty of Medicine',
        campusId: campus.id,
      },
    });

    const course1 = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty1.id,
        subjectCode: 'TEST105',
        subjectName: 'วิศวกรรมคอมพิวเตอร์',
        isGenEd: false,
      },
    });

    const course2 = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty2.id,
        subjectCode: 'TEST106',
        subjectName: 'แพทยศาสตร์',
        isGenEd: false,
      },
    });

    // Create 25 CLOs across different faculties and courses to test batch processing
    const clos: Array<{
      id: string;
      expectedCombinedText: string;
    }> = [];

    for (let i = 1; i <= 25; i++) {
      const course = i <= 15 ? course1 : course2;
      const clo = await prisma.courseLearningOutcome.create({
        data: {
          id: uuidv4(),
          courseId: course.id,
          cloNo: i,
          originalCloName: `Original outcome ${i}`,
          cleanedCloName: `ทักษะทดสอบ ${i}`,
          skipEmbedding: false,
          hasEmbedding768: false,
          hasEmbedding1536: false,
        },
      });

      const expectedCombinedText =
        `${course.subjectName} ${clo.cleanedCloName}`.trim();
      clos.push({ id: clo.id, expectedCombinedText });
    }

    const mockEmbedding = {
      embedOne: jest.fn().mockImplementation(({ text }) => ({
        vector: Array(768).fill(0.5),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: text as string,
          generatedAt: new Date().toISOString(),
        },
      })),
      embedMany: jest.fn(),
    };

    const getE5ClientSpy = jest
      .spyOn(pipeline as any, 'getE5EmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(768);
    } finally {
      getE5ClientSpy.mockRestore();
    }

    // Assert
    // Check that all CLOs were processed
    for (const clo of clos) {
      const updatedClo = await prisma.courseLearningOutcome.findUnique({
        where: { id: clo.id },
      });
      expect(updatedClo?.hasEmbedding768).toBe(true);
      expect(updatedClo?.vectorId).not.toBeNull();
    }

    // Check that embedOne was called for all CLOs with combined text
    expect(mockEmbedding.embedOne).toHaveBeenCalledTimes(25);

    // Verify batch processing - calls should be made with correct combined text parameters
    for (const clo of clos) {
      expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
        text: clo.expectedCombinedText,
        role: 'passage',
      });
    }

    // Verify vector records were created with correct combined text
    const vectorRecords = await prisma.courseLearningOutcomeVector.findMany({
      where: {
        embeddedText: {
          in: clos.map((clo) => clo.expectedCombinedText),
        },
      },
    });
    expect(vectorRecords).toHaveLength(25);
  });

  it('skips CLOs marked with skipEmbedding=true', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP6',
        nameTh: 'วิทยาเขตบางเขน',
        nameEn: 'Bangkhen Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC7',
        nameTh: 'คณะศิลปกรรมศาสตร์',
        nameEn: 'Faculty of Arts',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST107',
        subjectName: 'ศิลปะ',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'วาดภาพได้',
        skipEmbedding: true, // This CLO should be skipped
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.6),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: 'test',
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getE5ClientSpy = jest
      .spyOn(pipeline as any, 'getE5EmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes(768);
    } finally {
      getE5ClientSpy.mockRestore();
    }

    // Assert
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding768).toBe(false); // Should still be false
    expect(updatedClo?.vectorId).toBeNull();

    // Check that embedOne was not called since CLO was skipped
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });
});
