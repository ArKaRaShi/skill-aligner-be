import {
  buildVectorFromSequence,
  FindLosBySkillsTestFixture,
  MOCK_CLO7_ID,
  MOCK_CLO8_ID,
  MOCK_VECTOR7_ID,
  MOCK_VECTOR8_ID,
  VECTOR_DIMENSION_768,
} from '../fixtures/find-los-by-skills.fixture';

describe('PrismaCourseLearningOutcomeRepository - Similarity Ranking (Integration)', () => {
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

  describe('findLosBySkills with similarity ranking and deduplication', () => {
    it('should rank similarity scores correctly in descending order', async () => {
      const queryVector = buildVectorFromSequence(
        [0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedMany.mockResolvedValueOnce([
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

      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].loId).toBe(MOCK_CLO7_ID);

      const similarities = matches.map((match) => match.similarityScore);
      const sortedSimilarities = [...similarities].sort((a, b) => b - a);
      expect(similarities).toEqual(sortedSimilarities);
    });

    it('should deduplicate CLOs when they have multiple course-CLO relations', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0);
      expect(
        matches.filter((match) => match.loId === MOCK_CLO7_ID).length,
      ).toBe(1);
      expect(matches.some((match) => match.loId === MOCK_CLO7_ID)).toBeTruthy();
    });

    it('should keep highest similarity when CLO appears multiple times with different courses', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.3,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const matches = result.get('วิเคราะห์')!;
      const clo7Match = matches.find((match) => match.loId === MOCK_CLO7_ID);

      expect(
        matches.filter((match) => match.loId === MOCK_CLO7_ID),
      ).toHaveLength(1);

      expect(clo7Match).toBeDefined();
      expect(clo7Match!.similarityScore).toBeGreaterThanOrEqual(0.3);
    });

    it('should return every CLO tied to the top-ranked vectors even when topN is small', async () => {
      const queryVector = buildVectorFromSequence(
        [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55],
        VECTOR_DIMENSION_768,
      );
      fixture.mockEmbeddingRouterService.embedMany.mockResolvedValueOnce([
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

      await fixture.prisma.courseLearningOutcome.update({
        where: { id: MOCK_CLO8_ID },
        data: { vectorId: MOCK_VECTOR7_ID },
      });

      try {
        const { losBySkill: result } = await fixture.repository.findLosBySkills(
          {
            skills: ['วิเคราะห์'],
            threshold: 0.5,
            topN: 1,
            embeddingConfiguration: {
              model: 'e5-base',
              provider: 'e5',
            },
            campusId: fixture.campus1Id,
          },
        );

        expect(result.size).toBe(1);
        const matches = result.get('วิเคราะห์')!;
        expect(matches).toHaveLength(2);
        const cloIds = matches.map((match) => match.loId);
        expect(cloIds).toContain(MOCK_CLO7_ID);
        expect(cloIds).toContain(MOCK_CLO8_ID);
      } finally {
        await fixture.prisma.courseLearningOutcome.update({
          where: { id: MOCK_CLO8_ID },
          data: { vectorId: MOCK_VECTOR8_ID },
        });
      }
    });
  });
});
