import { FindLosByQueryTestFixture } from '../fixtures/find-los-by-query.fixture';
import {
  buildVectorFromSequence,
  MOCK_CLO1_ID,
  MOCK_CLO2_ID,
  MOCK_CLO7_ID,
  VECTOR_DIMENSION_768,
  VECTOR_DIMENSION_1536,
} from '../fixtures/find-los-by-skills.fixture';

describe('PrismaCourseLearningOutcomeRepository - findLosByQuery Multi-Dimension (Integration)', () => {
  let fixture: FindLosByQueryTestFixture;

  beforeAll(async () => {
    fixture = new FindLosByQueryTestFixture();
    await fixture.setup();
  });

  beforeEach(async () => {
    await fixture.beforeEach();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  describe('findLosByQuery with 1536-dimension embeddings', () => {
    beforeEach(async () => {
      // Update some CLOs to have 1536-dimension embeddings
      await fixture.prisma.courseLearningOutcome.updateMany({
        where: { id: { in: [MOCK_CLO1_ID, MOCK_CLO2_ID, MOCK_CLO7_ID] } },
        data: { hasEmbedding1536: true },
      });

      // Mock embedding client response for 1536-dimension
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: buildVectorFromSequence([0.5], VECTOR_DIMENSION_1536),
        metadata: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
          dimension: VECTOR_DIMENSION_1536,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 10,
          totalTokens: 10,
        },
      });
    });

    it('should find LOs with 1536-dimension embeddings', async () => {
      const result = await fixture.repository.findLosByQuery({
        query: 'วิเคราะห์',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
      });

      expect(result.learningOutcomes.length).toBeGreaterThan(0);

      // Should only return CLOs with 1536-dimension embeddings
      const cloIds = result.learningOutcomes.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should filter by campusId with 1536-dimension embeddings', async () => {
      const result = await fixture.repository.findLosByQuery({
        query: 'วิเคราะห์',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
        campusId: fixture.campus1Id,
      });

      expect(result.learningOutcomes.length).toBeGreaterThan(0);

      // Should only return CLOs from campus1 with 1536-dimension embeddings
      const cloIds = result.learningOutcomes.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should return empty when no 1536-dimension embeddings exist', async () => {
      // Remove all 1536-dimension embeddings
      await fixture.prisma.courseLearningOutcome.updateMany({
        where: { hasEmbedding1536: true },
        data: { hasEmbedding1536: false },
      });

      const result = await fixture.repository.findLosByQuery({
        query: 'วิเคราะห์',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
      });

      expect(result.learningOutcomes).toHaveLength(0);
    });
  });

  describe('findLosByQuery embedding metadata', () => {
    it('should include token counts in embedding metadata', async () => {
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: buildVectorFromSequence([0.5], VECTOR_DIMENSION_768),
        metadata: {
          model: 'e5-base',
          provider: 'e5',
          dimension: VECTOR_DIMENSION_768,
          embeddedText: 'test query',
          generatedAt: new Date().toISOString(),
          promptTokens: 20,
          totalTokens: 20,
        },
      });

      const result = await fixture.repository.findLosByQuery({
        query: 'test query',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      // Token counts should be present
      expect(typeof result.embeddingUsage.promptTokens).toBe('number');
      expect(result.embeddingUsage.promptTokens).toBe(20);
      expect(typeof result.embeddingUsage.totalTokens).toBe('number');
      expect(result.embeddingUsage.totalTokens).toBe(20);
    });
  });
});
