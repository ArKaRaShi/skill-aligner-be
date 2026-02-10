import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  EmbeddingModels,
  EmbeddingProviders,
} from 'src/shared/adapters/embedding/constants/embedding-models.constant';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { EmbedPipelineV3 } from '../embed.pipeline.v3';

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

describe('EmbedPipelineV3 (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: EmbedPipelineV3;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        EmbedPipelineV3,
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

    pipeline = moduleRef.get(EmbedPipelineV3);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcomes, course_learning_outcome_vectors, courses, faculties, campuses RESTART IDENTITY CASCADE;`;
    jest.clearAllMocks();
  });

  // ==========================================================================
  // V3 Key Feature: Deduplication - Multiple CLOs with same text use one vector
  // ==========================================================================

  it('deduplicates CLOs with the same cleanedCloName and links them to a single vector', async () => {
    // Arrange - Create 3 CLOs with the same cleaned text but from different courses
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP1',
        nameTh: 'Campus',
        nameEn: 'Campus',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC1',
        nameTh: 'Faculty',
        nameEn: 'Faculty',
        campusId: campus.id,
      },
    });

    // Create 3 different courses
    const course1 = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST101',
        subjectName: 'Test Course 1',
        isGenEd: false,
      },
    });

    const course2 = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST102',
        subjectName: 'Test Course 2',
        isGenEd: false,
      },
    });

    const course3 = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST103',
        subjectName: 'Test Course 3',
        isGenEd: false,
      },
    });

    // Create 3 CLOs with the SAME cleaned text
    const duplicateText = 'Analyze and design algorithms';
    const clo1 = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course1.id,
        cloNo: 1,
        originalCloName: 'Analyze and design algorithms',
        cleanedCloName: duplicateText,
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    const clo2 = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course2.id,
        cloNo: 1,
        originalCloName: 'Analyze and design algorithms',
        cleanedCloName: duplicateText,
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    const clo3 = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course3.id,
        cloNo: 1,
        originalCloName: 'Analyze and design algorithms',
        cleanedCloName: duplicateText,
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    // Mock embedding client
    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.1),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: duplicateText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - All 3 CLOs should be embedded and linked to the SAME vector
    const updatedClo1 = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo1.id },
    });
    const updatedClo2 = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo2.id },
    });
    const updatedClo3 = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo3.id },
    });

    expect(updatedClo1?.hasEmbedding1536).toBe(true);
    expect(updatedClo2?.hasEmbedding1536).toBe(true);
    expect(updatedClo3?.hasEmbedding1536).toBe(true);

    // All should point to the SAME vector
    const vectorId = updatedClo1?.vectorId;
    expect(updatedClo2?.vectorId).toBe(vectorId);
    expect(updatedClo3?.vectorId).toBe(vectorId);

    // embedOne should only be called ONCE (deduplication!)
    expect(mockEmbedding.embedOne).toHaveBeenCalledTimes(1);
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: duplicateText,
      role: 'passage',
    });

    // Verify only one vector record was created
    const vectors = await prisma.courseLearningOutcomeVector.findMany({
      where: { embeddedText: duplicateText },
    });
    expect(vectors).toHaveLength(1);

    // Verify the vector has correct metadata
    const vectorMetadata = vectors[0].metadata as CombinedVectorMetadata | null;
    expect(vectorMetadata?.vector_1536).toEqual({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      provider: EmbeddingProviders.OPENROUTER,
      dimension: 1536,
      original_text: duplicateText,
      embed_text: duplicateText,
      generated_at: expect.any(String) as string,
    });
  });

  // ==========================================================================
  // V3 Feature: Bulk query for existing vectors
  // ==========================================================================

  it('uses bulk query to check existing vectors and skips already-embedded texts', async () => {
    // Arrange - Create CLOs with some already having embeddings
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP2',
        nameTh: 'Campus 2',
        nameEn: 'Campus 2',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC2',
        nameTh: 'Faculty 2',
        nameEn: 'Faculty 2',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST201',
        subjectName: 'Test Course 201',
        isGenEd: false,
      },
    });

    // Create one CLO with existing embedding
    const existingText = 'Already embedded text';
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        embeddedText: existingText,
        metadata: {},
      },
    });

    // Add 1536 embedding to the vector
    const embedding1536 = Array(1536).fill(0.5);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_1536 = ${embedding1536}::vector(1536)
      WHERE id = ${vector.id}::uuid
    `;

    const clo1 = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 1,
        originalCloName: existingText,
        cleanedCloName: existingText,
        skipEmbedding: false,
        hasEmbedding1536: false, // Still false, but vector exists
      },
    });

    // Create another CLO without embedding
    const newText = 'New text to embed';
    const clo2 = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 2,
        originalCloName: newText,
        cleanedCloName: newText,
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.2),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: newText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert
    const updatedClo1 = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo1.id },
    });
    const updatedClo2 = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo2.id },
    });

    expect(updatedClo1?.hasEmbedding1536).toBe(true);
    expect(updatedClo1?.vectorId).toBe(vector.id);

    expect(updatedClo2?.hasEmbedding1536).toBe(true);
    expect(updatedClo2?.vectorId).not.toBeNull();

    // embedOne should only be called for the new text (once)
    expect(mockEmbedding.embedOne).toHaveBeenCalledTimes(1);
    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: newText,
      role: 'passage',
    });
  });

  // ==========================================================================
  // V3 = V1 Equivalence Tests
  // ==========================================================================

  it('achieves same result as v1: creates new vector when none exists', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP3',
        nameTh: 'Campus 3',
        nameEn: 'Campus 3',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC3',
        nameTh: 'Faculty 3',
        nameEn: 'Faculty 3',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST301',
        subjectName: 'Test Course 301',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Understand machine learning',
        cleanedCloName: 'Understand machine learning',
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.3),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: 'Understand machine learning',
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - Same result as v1
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding1536).toBe(true);
    expect(updatedClo?.vectorId).not.toBeNull();

    expect(mockEmbedding.embedOne).toHaveBeenCalledWith({
      text: 'Understand machine learning',
      role: 'passage',
    });

    const vectorRecord = await prisma.courseLearningOutcomeVector.findUnique({
      where: { id: updatedClo?.vectorId! },
    });
    const vectorMetadata =
      vectorRecord?.metadata as CombinedVectorMetadata | null;
    expect(vectorMetadata?.vector_1536).toEqual({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      provider: EmbeddingProviders.OPENROUTER,
      dimension: 1536,
      original_text: 'Understand machine learning',
      embed_text: 'Understand machine learning',
      generated_at: expect.any(String) as string,
    });
  });

  it('achieves same result as v1: updates existing vector with 1536 when only 768 exists', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP4',
        nameTh: 'Campus 4',
        nameEn: 'Campus 4',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC4',
        nameTh: 'Faculty 4',
        nameEn: 'Faculty 4',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST401',
        subjectName: 'Test Course 401',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Design database systems',
        cleanedCloName: 'Design database systems',
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    // Create vector with only 768 embedding
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        embeddedText: 'Design database systems',
        metadata: {
          vector_768: {
            model: EmbeddingModels.E5_BASE,
            provider: EmbeddingProviders.LOCAL,
            dimension: 768,
            original_text: 'Design database systems',
            embed_text: 'Design database systems',
            generated_at: new Date().toISOString(),
          },
        },
      },
    });

    const embedding768 = Array(768).fill(0.1);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_768 = ${embedding768}::vector(768)
      WHERE id = ${vector.id}::uuid
    `;

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.4),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: 'Design database systems',
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - Same result as v1
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding1536).toBe(true);
    expect(updatedClo?.vectorId).toBe(vector.id);

    // Verify both embeddings exist
    const vectorData = await prisma.$queryRaw<
      { embedding_768: string | null; embedding_1536: string | null }[]
    >`
      SELECT
        embedding_768::text,
        embedding_1536::text
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    expect(vectorData[0].embedding_768).not.toBeNull();
    expect(vectorData[0].embedding_1536).not.toBeNull();

    // Verify metadata is merged
    const vectorMetadata = await prisma.$queryRaw<
      { metadata: CombinedVectorMetadata | null }[]
    >`
      SELECT metadata
      FROM course_learning_outcome_vectors
      WHERE id = ${vector.id}::uuid
    `;
    const metadata = vectorMetadata[0].metadata;
    expect(metadata?.vector_768).toBeDefined();
    expect(metadata?.vector_1536).toBeDefined();
  });

  it('achieves same result as v1: skips CLOs marked with skipEmbedding=true', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP5',
        nameTh: 'Campus 5',
        nameEn: 'Campus 5',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC5',
        nameTh: 'Faculty 5',
        nameEn: 'Faculty 5',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST501',
        subjectName: 'Test Course 501',
        isGenEd: false,
      },
    });

    const clo = await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 1,
        originalCloName: 'Skipped outcome',
        cleanedCloName: 'Skipped outcome',
        skipEmbedding: true, // Should be skipped
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.5),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: 'Skipped outcome',
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - Same result as v1
    const updatedClo = await prisma.courseLearningOutcome.findUnique({
      where: { id: clo.id },
    });
    expect(updatedClo?.hasEmbedding1536).toBe(false);
    expect(updatedClo?.vectorId).toBeNull();
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // V3 Specific: Batch processing with deduplication
  // ==========================================================================

  it('processes multiple unique texts in batches and deduplicates within each batch', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP6',
        nameTh: 'Campus 6',
        nameEn: 'Campus 6',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC6',
        nameTh: 'Faculty 6',
        nameEn: 'Faculty 6',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST601',
        subjectName: 'Test Course 601',
        isGenEd: false,
      },
    });

    // Create CLOs with duplicates to test deduplication
    const texts = [
      'Text A',
      'Text B',
      'Text A', // Duplicate
      'Text C',
      'Text B', // Duplicate
      'Text D',
      'Text A', // Duplicate
      'Text E',
    ];

    const clos: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      const clo = await prisma.courseLearningOutcome.create({
        data: {
          courseId: course.id,
          cloNo: i + 1,
          originalCloName: texts[i],
          cleanedCloName: texts[i],
          skipEmbedding: false,
          hasEmbedding1536: false,
        },
      });
      clos.push(clo.id);
    }

    const mockEmbedding = {
      embedOne: jest.fn().mockImplementation(({ text }) => ({
        vector: Array(1536).fill(0.6),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: text as string,
          generatedAt: new Date().toISOString(),
        },
      })),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert
    // All CLOs should be embedded
    for (const cloId of clos) {
      const updatedClo = await prisma.courseLearningOutcome.findUnique({
        where: { id: cloId },
      });
      expect(updatedClo?.hasEmbedding1536).toBe(true);
    }

    // embedOne should only be called for UNIQUE texts (5 unique: A, B, C, D, E)
    expect(mockEmbedding.embedOne).toHaveBeenCalledTimes(5);

    // Verify we only have 5 vector records (one per unique text)
    const vectors = await prisma.courseLearningOutcomeVector.findMany();
    expect(vectors).toHaveLength(5);

    // Verify deduplication: CLOs with same text share the same vector
    const cloA = await prisma.courseLearningOutcome.findMany({
      where: { cleanedCloName: 'Text A' },
    });
    const vectorIdsA = cloA.map((clo) => clo.vectorId);
    expect(new Set(vectorIdsA).size).toBe(1); // All point to same vector
  });

  it('handles empty dataset gracefully', async () => {
    // Arrange - No CLOs in database
    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.7),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: 'test',
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - Should complete without error
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();
  });

  it('handles dataset where all texts already have embeddings', async () => {
    // Arrange
    const campus = await prisma.campus.create({
      data: {
        code: 'CMP7',
        nameTh: 'Campus 7',
        nameEn: 'Campus 7',
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        code: 'FAC7',
        nameTh: 'Faculty 7',
        nameEn: 'Faculty 7',
        campusId: campus.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        campusId: campus.id,
        facultyId: faculty.id,
        subjectCode: 'TEST701',
        subjectName: 'Test Course 701',
        isGenEd: false,
      },
    });

    // Create CLOs with existing embeddings
    const existingText = 'Already embedded';
    const vector = await prisma.courseLearningOutcomeVector.create({
      data: {
        embeddedText: existingText,
        metadata: {},
      },
    });

    const embedding1536 = Array(1536).fill(0.8);
    await prisma.$executeRaw`
      UPDATE course_learning_outcome_vectors
      SET embedding_1536 = ${embedding1536}::vector(1536)
      WHERE id = ${vector.id}::uuid
    `;

    await prisma.courseLearningOutcome.create({
      data: {
        courseId: course.id,
        cloNo: 1,
        originalCloName: existingText,
        cleanedCloName: existingText,
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });

    const mockEmbedding = {
      embedOne: jest.fn().mockResolvedValue({
        vector: Array(1536).fill(0.9),
        metadata: {
          model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
          provider: EmbeddingProviders.OPENROUTER,
          dimension: 1536,
          embeddedText: existingText,
          generatedAt: new Date().toISOString(),
        },
      }),
      embedMany: jest.fn(),
    };

    const getEmbeddingClientSpy = jest
      .spyOn(pipeline as any, 'getEmbeddingClient')
      .mockReturnValue(mockEmbedding);

    try {
      // Act
      await pipeline.embedCourseLearningOutcomes();
    } finally {
      getEmbeddingClientSpy.mockRestore();
    }

    // Assert - No new embeddings should be created
    expect(mockEmbedding.embedOne).not.toHaveBeenCalled();

    const clos = await prisma.courseLearningOutcome.findMany();
    expect(clos).toHaveLength(1);
    expect(clos[0].hasEmbedding1536).toBe(true);
  });
});
