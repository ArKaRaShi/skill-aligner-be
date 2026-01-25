import { FindLosByQueryTestFixture } from '../fixtures/find-los-by-query.fixture';
import {
  buildVectorFromSequence,
  MOCK_CLO1_ID,
  MOCK_CLO2_ID,
  MOCK_CLO3_ID,
  MOCK_CLO4_ID,
  MOCK_CLO5_ID,
  MOCK_CLO6_ID,
  MOCK_CLO7_ID,
  MOCK_CLO8_ID,
  VECTOR_DIMENSION_768,
} from '../fixtures/find-los-by-skills.fixture';

describe('PrismaCourseLearningOutcomeRepository - findLosByQuery Basic (Integration)', () => {
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

  describe('findLosByQuery with filters', () => {
    it('should return empty array when no LOs match threshold', async () => {
      // Mock query vector that won't match any stored vectors
      // Use negative values to ensure low similarity
      const queryVector = buildVectorFromSequence(
        [-0.5, -0.3, -0.2],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
        metadata: {
          model: 'e5-base',
          provider: 'e5',
          dimension: VECTOR_DIMENSION_768,
          embeddedText: 'unrelated query',
          generatedAt: new Date().toISOString(),
          promptTokens: 5,
          totalTokens: 5,
        },
      });

      const result = await fixture.repository.findLosByQuery({
        query: 'unrelated query',
        threshold: 0.9, // High threshold
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.learningOutcomes).toEqual([]);
      expect(result.embeddingUsage.query).toBe('unrelated query');
      expect(result.embeddingUsage.totalTokens).toBe(5);
    });

    it('should return LOs sorted by similarity (descending)', async () => {
      // Mock query vector closest to highSimilarityVector (CLO7)
      const queryVector = buildVectorFromSequence(
        [0.85, 0.8, 0.75, 0.7],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'วิเคราะห์',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.learningOutcomes.length).toBeGreaterThan(0);

      // Verify sorting by descending similarity
      const similarities = result.learningOutcomes.map(
        (lo) => lo.similarityScore,
      );
      const sortedSimilarities = [...similarities].sort((a, b) => b - a);
      expect(similarities).toEqual(sortedSimilarities);

      // CLO7 has the highest similarity vector
      expect(result.learningOutcomes[0].loId).toBe(MOCK_CLO7_ID);
    });

    it('should deduplicate CLOs when sharing same vector', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
      });

      // Each CLO should appear only once even if sharing same vector
      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      const uniqueLoIds = new Set(loIds);
      expect(loIds.length).toBe(uniqueLoIds.size);
    });

    it('should respect topN parameter', async () => {
      const queryVector = buildVectorFromSequence(
        [0.8, 0.75, 0.7],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 2, // Limit to 2 results
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      // Should return at most 2 results (topN = 2)
      expect(result.learningOutcomes.length).toBeLessThanOrEqual(2);
    });

    it('should respect threshold parameter', async () => {
      // Use negative values to ensure low similarity with stored vectors
      const queryVector = buildVectorFromSequence(
        [-0.5, -0.3, -0.2],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.9, // High threshold - no results should match
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.learningOutcomes).toHaveLength(0);
    });

    it('should filter by campusId', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);

      // All returned CLOs should belong to campus1
      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by campusId (second campus)', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus2Id,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);

      // All returned CLOs should belong to campus2
      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by facultyId', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: fixture.faculty1Id,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);

      // All returned CLOs should belong to faculty1
      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by facultyId (second faculty)', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: fixture.faculty2Id,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);

      // All returned CLOs should belong to faculty2
      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by isGenEd = true', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: true,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      expect(loIds).toContain(MOCK_CLO1_ID);
      expect(loIds).toContain(MOCK_CLO2_ID);
      expect(loIds).toContain(MOCK_CLO4_ID);
      expect(loIds).toContain(MOCK_CLO5_ID);
      expect(loIds).toContain(MOCK_CLO7_ID);
      expect(loIds).toContain(MOCK_CLO8_ID);
      expect(loIds).not.toContain(MOCK_CLO3_ID);
      expect(loIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by isGenEd = false', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: false,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      expect(loIds).toContain(MOCK_CLO3_ID);
      expect(loIds).toContain(MOCK_CLO6_ID);
      expect(loIds).not.toContain(MOCK_CLO1_ID);
      expect(loIds).not.toContain(MOCK_CLO2_ID);
      expect(loIds).not.toContain(MOCK_CLO4_ID);
      expect(loIds).not.toContain(MOCK_CLO5_ID);
      expect(loIds).not.toContain(MOCK_CLO7_ID);
      expect(loIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should filter by multiple criteria', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
        facultyId: fixture.faculty1Id,
        isGenEd: true,
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
      expect(loIds).toContain(MOCK_CLO1_ID);
      expect(loIds).toContain(MOCK_CLO2_ID);
      expect(loIds).toContain(MOCK_CLO7_ID);
      expect(loIds).toContain(MOCK_CLO8_ID);
      expect(loIds).not.toContain(MOCK_CLO3_ID);
      expect(loIds).not.toContain(MOCK_CLO4_ID);
      expect(loIds).not.toContain(MOCK_CLO5_ID);
      expect(loIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should handle academicYear filter', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023 }],
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
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

      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should handle academic year with semesters', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
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

      const result = await fixture.repository.findLosByQuery({
        query: 'test',
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023, semesters: [1] }],
      });

      const loIds = result.learningOutcomes.map((lo) => lo.loId);
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

      loIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should pass through embedding usage metadata', async () => {
      const queryVector = buildVectorFromSequence([0.5], VECTOR_DIMENSION_768);
      fixture.mockEmbeddingRouterService.embedOne.mockResolvedValue({
        vector: queryVector,
        metadata: {
          model: 'e5-base',
          provider: 'e5',
          dimension: VECTOR_DIMENSION_768,
          embeddedText: 'test query text',
          generatedAt: '2024-01-01T00:00:00.000Z',
          promptTokens: 15,
          totalTokens: 15,
        },
      });

      const result = await fixture.repository.findLosByQuery({
        query: 'test query text',
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      // Verify embedding metadata is passed through correctly
      expect(result.embeddingUsage).toEqual({
        query: 'test query text',
        model: 'e5-base',
        provider: 'e5',
        dimension: VECTOR_DIMENSION_768,
        embeddedText: 'test query text',
        generatedAt: '2024-01-01T00:00:00.000Z',
        promptTokens: 15,
        totalTokens: 15,
      });
    });
  });
});
