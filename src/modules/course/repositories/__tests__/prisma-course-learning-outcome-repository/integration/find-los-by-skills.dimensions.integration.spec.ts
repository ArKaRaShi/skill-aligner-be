import {
  buildVectorFromSequence,
  FindLosBySkillsTestFixture,
  MOCK_CLO1_ID,
  MOCK_CLO2_ID,
  MOCK_CLO7_ID,
  VECTOR_DIMENSION_1536,
} from '../fixtures/find-los-by-skills.fixture';

describe('PrismaCourseLearningOutcomeRepository - Multi-Dimension (Integration)', () => {
  let fixture: FindLosBySkillsTestFixture;

  beforeAll(async () => {
    fixture = new FindLosBySkillsTestFixture();
    await fixture.setup();
  });

  beforeEach(async () => {
    await fixture.beforeEach();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  describe('findLosBySkills with 1536-dimension embeddings', () => {
    beforeEach(async () => {
      await fixture.prisma.courseLearningOutcome.updateMany({
        where: { id: { in: [MOCK_CLO1_ID, MOCK_CLO2_ID, MOCK_CLO7_ID] } },
        data: { hasEmbedding1536: true },
      });

      fixture.mockEmbeddingRouterService.embedMany.mockImplementation(
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
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
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

      const cloIds = matches.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should filter by campusId with 1536-dimension embeddings', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'openai/text-embedding-3-small',
          provider: 'openrouter',
        },
        campusId: fixture.campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0);

      const cloIds = matches.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
    });

    it('should return no results when no CLOs have 1536-dimension embeddings', async () => {
      await fixture.prisma.courseLearningOutcome.updateMany({
        where: { hasEmbedding1536: true },
        data: { hasEmbedding1536: false },
      });

      const { losBySkill: result } = await fixture.repository.findLosBySkills({
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
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
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

      const analysisMatches = result.get('วิเคราะห์')!;
      const communicationMatches = result.get('สื่อสาร')!;

      expect(analysisMatches.length).toBeGreaterThan(0);
      expect(communicationMatches.length).toBeGreaterThan(0);

      const analysisCloIds = analysisMatches.map((clo) => clo.loId);
      const communicationCloIds = communicationMatches.map((clo) => clo.loId);

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
      const { embeddingUsage } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(embeddingUsage.bySkill).toHaveLength(2);
      expect(embeddingUsage.totalTokens).toBeGreaterThan(0);

      const analysisMetadata = embeddingUsage.bySkill[0];
      expect(analysisMetadata.skill).toBe('วิเคราะห์');
      expect(analysisMetadata.model).toBe('e5-base');
      expect(analysisMetadata.provider).toBe('e5');
      expect(analysisMetadata.dimension).toBe(768);
      expect(analysisMetadata.embeddedText).toBe('test');
      expect(analysisMetadata.generatedAt).toBeDefined();
      expect(typeof analysisMetadata.generatedAt).toBe('string');
      expect(analysisMetadata.promptTokens).toBeGreaterThan(0);
      expect(analysisMetadata.totalTokens).toBeGreaterThan(0);

      const communicationMetadata = embeddingUsage.bySkill[1];
      expect(communicationMetadata.skill).toBe('สื่อสาร');
      expect(communicationMetadata.model).toBe('e5-base');
      expect(communicationMetadata.provider).toBe('e5');
      expect(communicationMetadata.dimension).toBe(768);
      expect(communicationMetadata.embeddedText).toBe('test');
      expect(communicationMetadata.generatedAt).toBeDefined();
    });

    it('should include token counts in embedding metadata when available', async () => {
      const { embeddingUsage } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      const metadata = embeddingUsage.bySkill[0];
      expect(typeof metadata.promptTokens).toBe('number');
      expect(metadata.promptTokens).toBeGreaterThan(0);
      expect(typeof metadata.totalTokens).toBe('number');
      expect(metadata.totalTokens).toBeGreaterThan(0);
    });
  });
});
