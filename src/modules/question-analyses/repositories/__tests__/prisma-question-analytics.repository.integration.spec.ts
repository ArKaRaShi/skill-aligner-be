import { QuestionAnalysesTestFixture } from './question-analyses.fixture';

describe('PrismaQuestionAnalyticsRepository (Integration)', () => {
  let fixture: QuestionAnalysesTestFixture;

  beforeAll(async () => {
    fixture = new QuestionAnalysesTestFixture();
    await fixture.setup();
  });

  beforeEach(async () => {
    await fixture.beforeEach();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  describe('getTrending', () => {
    it('should return trending entities grouped by normalized label', async () => {
      await fixture.seedSampleAnalyses();

      const startDate = new Date(Date.now() - 86400000); // 1 day ago
      const endDate = new Date(Date.now() + 86400000); // 1 day from now

      const result = await fixture.analyticsRepository.getTrending(
        'skill',
        startDate,
        endDate,
        10,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        entityType: 'skill',
        normalizedLabel: 'python',
        count: 2, // Appears in 2 analyses
        period: { start: startDate, end: endDate },
      });
      expect(result[1]).toEqual({
        entityType: 'skill',
        normalizedLabel: 'web-development',
        count: 1,
        period: { start: startDate, end: endDate },
      });
    });

    it('should filter by entity type', async () => {
      await fixture.seedSampleAnalyses();

      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date(Date.now() + 86400000);

      const topics = await fixture.analyticsRepository.getTrending(
        'topic',
        startDate,
        endDate,
        10,
      );

      expect(topics).toHaveLength(2);
      expect(topics[0].normalizedLabel).toBe('machine-learning');
      expect(topics[0].count).toBe(2);
      expect(topics[1].normalizedLabel).toBe('data-science');
      expect(topics[1].count).toBe(1);
    });

    it('should respect limit parameter', async () => {
      await fixture.seedSampleAnalyses();

      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date(Date.now() + 86400000);

      const result = await fixture.analyticsRepository.getTrending(
        'skill',
        startDate,
        endDate,
        1,
      );

      expect(result).toHaveLength(1);
      expect(result[0].normalizedLabel).toBe('python');
    });

    it('should return empty array when no entities match', async () => {
      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date(Date.now() + 86400000);

      const result = await fixture.analyticsRepository.getTrending(
        'skill',
        startDate,
        endDate,
        10,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getEntityQuestionExamples', () => {
    it('should return example questions containing the entity', async () => {
      await fixture.seedSampleAnalyses();

      const result =
        await fixture.analyticsRepository.getEntityQuestionExamples(
          'skill',
          'python',
          5,
        );

      expect(result.entity.type).toBe('skill');
      expect(result.entity.normalizedLabel).toBe('python');
      expect(result.entity.name).toBe('Python');
      expect(result.examples).toHaveLength(1);
      expect(result.examples[0].questionLogId).toBe(fixture.questionLog1Id);
      expect(result.examples[0].questionText).toBe(
        'I want to learn Python for machine learning',
      );
      expect(result.examples[0].entities).toHaveLength(2); // python + machine-learning
    });

    it('should return fallback when entity not found', async () => {
      const result =
        await fixture.analyticsRepository.getEntityQuestionExamples(
          'skill',
          'non-existent-skill',
          5,
        );

      expect(result.entity.type).toBe('skill');
      expect(result.entity.normalizedLabel).toBe('non-existent-skill');
      expect(result.entity.name).toBe('non-existent-skill'); // Fallback to label
      expect(result.examples).toEqual([]);
      expect(result.totalQuestions).toBe(0);
    });

    it('should respect limit parameter', async () => {
      await fixture.seedSampleAnalyses();

      const result =
        await fixture.analyticsRepository.getEntityQuestionExamples(
          'skill',
          'python',
          0, // Limit 0
        );

      expect(result.examples).toEqual([]);
    });

    it('should include multiple entities in question examples', async () => {
      await fixture.seedSampleAnalyses();

      const result =
        await fixture.analyticsRepository.getEntityQuestionExamples(
          'topic',
          'machine-learning',
          5,
        );

      expect(result.examples).toHaveLength(1);
      const question = result.examples[0];
      expect(question.entities).toHaveLength(2);
      expect(question.entities.map((e) => e.normalizedLabel)).toEqual(
        expect.arrayContaining(['machine-learning', 'python']),
      );
    });
  });

  describe('getLifetimeStats', () => {
    it('should return aggregated lifetime statistics', async () => {
      await fixture.seedSampleAnalyses();

      const stats = await fixture.analyticsRepository.getLifetimeStats();

      expect(stats.totalExtractions).toBe(4);
      expect(stats.totalQuestionsProcessed).toBe(3); // 3 unique questions
      expect(stats.averageTokensPerExtraction).toBe(130); // (150+120+100+150)/4
      expect(stats.qualityDistribution).toEqual({
        high: 3,
        medium: 1,
        low: 0,
        none: 0,
      });
    });

    it('should return zero stats when no analyses exist', async () => {
      const stats = await fixture.analyticsRepository.getLifetimeStats();

      expect(stats.totalExtractions).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.averageTokensPerExtraction).toBe(0);
      expect(stats.totalQuestionsProcessed).toBe(0);
      expect(stats.qualityDistribution).toEqual({
        high: 0,
        medium: 0,
        low: 0,
        none: 0,
      });
    });
  });

  describe('getQualityDistribution', () => {
    it('should return distribution of quality levels', async () => {
      await fixture.seedSampleAnalyses();

      const distribution =
        await fixture.analyticsRepository.getQualityDistribution();

      expect(distribution).toEqual({
        high: 3,
        medium: 1,
        low: 0,
        none: 0,
      });
    });

    it('should return all zeros when no analyses exist', async () => {
      const distribution =
        await fixture.analyticsRepository.getQualityDistribution();

      expect(distribution).toEqual({
        high: 0,
        medium: 0,
        low: 0,
        none: 0,
      });
    });
  });

  describe('getTopQuestions', () => {
    it('should return most extracted questions ordered by extraction count', async () => {
      await fixture.seedSampleAnalyses();

      const topQuestions =
        await fixture.analyticsRepository.getTopQuestions(10);

      expect(topQuestions).toHaveLength(3);
      expect(topQuestions[0]).toEqual({
        questionLogId: fixture.questionLog1Id,
        questionText: 'I want to learn Python for machine learning',
        extractionCount: 2, // Has 2 extractions
        lastExtractedAt: expect.any(Date),
      });
      expect(topQuestions[1].extractionCount).toBe(1);
      expect(topQuestions[2].extractionCount).toBe(1);
    });

    it('should order by extraction count then by last extracted date', async () => {
      await fixture.seedSampleAnalyses();

      const topQuestions =
        await fixture.analyticsRepository.getTopQuestions(10);

      // First question should be the one with 2 extractions
      expect(topQuestions[0].extractionCount).toBe(2);

      // Other 2 questions have 1 extraction each, ordered by lastExtractedAt
      expect(topQuestions[1].extractionCount).toBe(1);
      expect(topQuestions[2].extractionCount).toBe(1);
      expect(topQuestions[1].lastExtractedAt.getTime()).toBeGreaterThanOrEqual(
        topQuestions[2].lastExtractedAt.getTime(),
      );
    });

    it('should respect limit parameter', async () => {
      await fixture.seedSampleAnalyses();

      const topQuestions = await fixture.analyticsRepository.getTopQuestions(2);

      expect(topQuestions).toHaveLength(2);
    });

    it('should return empty array when no analyses exist', async () => {
      const topQuestions = await fixture.analyticsRepository.getTopQuestions();

      expect(topQuestions).toEqual([]);
    });
  });
});
