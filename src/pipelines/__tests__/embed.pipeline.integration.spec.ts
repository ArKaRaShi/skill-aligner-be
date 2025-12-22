import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { v4 as uuidv4 } from 'uuid';

import { AppConfigService } from 'src/config/app-config.service';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { parseVector } from 'src/modules/course/repositories/helpers/vector.helper';
import {
  EmbeddingModels,
  EmbeddingProviders,
} from 'src/modules/embedding/constants/model.constant';

import { EmbedPipeline } from '../embed.pipeline';

describe('EmbedPipeline (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: EmbedPipeline;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        EmbedPipeline,
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

    pipeline = moduleRef.get(EmbedPipeline);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcomes, course_learning_outcome_vectors, courses, faculties, campuses RESTART IDENTITY CASCADE;`;
    jest.clearAllMocks();
  });

  it('reuses an existing vector row by matching embedded_text when embedding 768 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP1',
        nameTh: 'Campus',
        nameEn: 'Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC1',
        nameTh: 'Faculty',
        nameEn: 'Faculty',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST101',
        subjectName: 'Test Course',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome',
        cleanedCloName: 'Cleaned outcome',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // First create the vector record without the embedding
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        id: uuidv4(),
        embeddedText: clo.cleanedCloName,
        metadata: {},
      },
    });

    // Then add the embedding using raw SQL with correct dimensions
    const embedding768 = Array(768).fill(0.1);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_768 = ${embedding768}::vector(768)
      WHERE id = ${vector.id}::uuid
    `;

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.1),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: clo.cleanedCloName,
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
    expect(updatedClo?.vectorId).toBe(vector.id);

    // Query the vector using raw SQL to get the embedding (cast to text to avoid deserialization issues)
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

  it('creates a new vector when no existing vector is found for 768 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP2',
        nameTh: 'Campus 2',
        nameEn: 'Campus 2',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC2',
        nameTh: 'Faculty 2',
        nameEn: 'Faculty 2',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST102',
        subjectName: 'Test Course 2',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome 2',
        cleanedCloName: 'Cleaned outcome 2',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.4),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: clo.cleanedCloName,
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

    // Check that embedOne was called with the correct parameters
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: clo.cleanedCloName,
      role: 'passage',
    });
  });

  it('updates existing vector with 768 embedding when vector only has 1536 embedding', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP5',
        nameTh: 'Campus 5',
        nameEn: 'Campus 5',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC5',
        nameTh: 'Faculty 5',
        nameEn: 'Faculty 5',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST105',
        subjectName: 'Test Course 5',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome 5',
        cleanedCloName: 'Cleaned outcome 5',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // First create the vector record with only 1536 embedding and its metadata
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        id: uuidv4(),
        embeddedText: clo.cleanedCloName,
        metadata: {
          vector_1536: {
            model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
            provider: EmbeddingProviders.OPENROUTER,
            dimension: 1536,
            original_text: clo.cleanedCloName,
            embed_text: clo.cleanedCloName,
            generated_at: new Date().toISOString(),
          },
        },
      },
    });

    // Add only 1536 embedding
    const embedding1536 = Array(1536).fill(0.8);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_1536 = ${embedding1536}::vector(1536)
      WHERE id = ${vector.id}::uuid
    `;

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.5),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: clo.cleanedCloName,
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
    expect(updatedClo?.vectorId).toBe(vector.id); // Should reuse the same vector

    // Verify that embedOne was called since we need to generate the 768 embedding
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: clo.cleanedCloName,
      role: 'passage',
    });

    // Query the vector to verify both embeddings exist
    const updatedVector768 = await prisma.$queryRaw<
      { embedding_768: string | null }[]
    >`
      SELECT embedding_768::text
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(updatedVector768[0].embedding_768).not.toBeNull();

    const updatedVector1536 = await prisma.$queryRaw<
      { embedding_1536: string | null }[]
    >`
      SELECT embedding_1536::text
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(updatedVector1536[0].embedding_1536).not.toBeNull();

    // Verify metadata is properly merged (should contain both vector_768 and vector_1536)
    const vectorMetadata = await prisma.$queryRaw<
      { metadata: Record<string, unknown> }[]
    >`
      SELECT metadata
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(vectorMetadata[0].metadata).toHaveProperty('vector_768');
    expect(vectorMetadata[0].metadata).toHaveProperty('vector_1536');
  });

  it('reuses an existing vector row by matching embedded_text when embedding 1536 dimension CLOs', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP3',
        nameTh: 'Campus 3',
        nameEn: 'Campus 3',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC3',
        nameTh: 'Faculty 3',
        nameEn: 'Faculty 3',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST103',
        subjectName: 'Test Course 3',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome 3',
        cleanedCloName: 'Cleaned outcome 3',
        skipEmbedding: false,
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    // First create the vector record without the embedding
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        id: uuidv4(),
        embeddedText: clo.cleanedCloName,
        metadata: {},
      },
    });

    // Then add the embedding using raw SQL with correct dimensions
    const embedding1536 = Array(1536).fill(0.7);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_1536 = ${embedding1536}::vector(1536)
      WHERE id = ${vector.id}::uuid
    `;

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.7),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: clo.cleanedCloName,
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
    expect(updatedClo?.vectorId).toBe(vector.id);

    // Query the vector using raw SQL to get the embedding (cast to text to avoid deserialization issues)
    const updatedVector = await prisma.$queryRaw<
      { embedding_1536: string | null }[]
    >`
      SELECT embedding_1536::text
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(updatedVector[0].embedding_1536).not.toBeNull();

    // Verify the vector can be parsed and has the correct dimension
    const parsedVector = parseVector(updatedVector[0].embedding_1536);
    expect(parsedVector).toHaveLength(1536);

    // Check that embedOne was not called since we're reusing existing vector
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });

  it('skips CLOs marked with skipEmbedding=true', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        id: uuidv4(),
        code: 'CMP4',
        nameTh: 'Campus 4',
        nameEn: 'Campus 4',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        id: uuidv4(),
        code: 'FAC4',
        nameTh: 'Faculty 4',
        nameEn: 'Faculty 4',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST104',
        subjectName: 'Test Course 4',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        id: uuidv4(),
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Original outcome 4',
        cleanedCloName: 'Cleaned outcome 4',
        skipEmbedding: true, // This CLO should be skipped
        hasEmbedding768: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(768).fill(0.1),
        metadata: {
          model: EmbeddingModels.E5_BASE,
          provider: EmbeddingProviders.E5,
          dimension: 768,
          embeddedText: clo.cleanedCloName,
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

    // Check that embedOne was not called since the CLO was skipped
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });
});
