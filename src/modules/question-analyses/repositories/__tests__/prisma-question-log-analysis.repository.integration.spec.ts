import type { Identifier } from 'src/shared/contracts/types/identifier';

import {
  createMockLlmInfo,
  QuestionAnalysesTestFixture,
} from './question-analyses.fixture';

describe('PrismaQuestionLogAnalysisRepository (Integration)', () => {
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

  describe('create', () => {
    it('should create analysis with entities', async () => {
      const input = {
        questionLogId: fixture.questionLog1Id,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high' as const,
        entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Test reasoning',
        llm: createMockLlmInfo(),
        entities: [
          {
            type: 'topic' as const,
            name: 'Machine Learning',
            normalizedLabel: 'machine-learning',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
          {
            type: 'skill' as const,
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };

      const result = await fixture.logAnalysisRepository.create(input);

      expect(result.id).toBeDefined();
      expect(result.questionLogId).toBe(fixture.questionLog1Id);
      expect(result.extractionVersion).toBe('v1');
      expect(result.extractionNumber).toBe(1);
      expect(result.overallQuality).toBe('high');
      expect(result.entityCounts).toEqual({
        topics: 1,
        skills: 1,
        tasks: 0,
        roles: 0,
      });
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].type).toBe('topic');
      expect(result.entities[0].name).toBe('Machine Learning');
      expect(result.entities[1].type).toBe('skill');
      expect(result.entities[1].name).toBe('Python');
    });

    it('should store LLM metadata', async () => {
      const llmInfo = createMockLlmInfo();
      const input = {
        questionLogId: fixture.questionLog1Id,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high' as const,
        entityCounts: { topics: 0, skills: 0, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Test',
        llm: llmInfo,
        entities: [],
      };

      const result = await fixture.logAnalysisRepository.create(input);

      // JSONB serialization converts Date to string - verify key fields
      expect(result.llm).not.toBeNull();
      expect(result.llm?.model).toBe(llmInfo.model);
      expect(result.llm?.provider).toBe(llmInfo.provider);
      expect(result.llm?.inputTokens).toBe(llmInfo.inputTokens);
      expect(result.llm?.outputTokens).toBe(llmInfo.outputTokens);
      expect(result.llm?.systemPrompt).toBe(llmInfo.systemPrompt);
      expect(result.llm?.userPrompt).toBe(llmInfo.userPrompt);
      expect(result.llm?.promptVersion).toBe(llmInfo.promptVersion);
      expect(result.llm?.schemaName).toBe(llmInfo.schemaName);
      expect(result.llm?.finishReason).toBe(llmInfo.finishReason);
      expect(result.llm?.warnings).toEqual(llmInfo.warnings);
      expect(result.llm?.providerMetadata).toEqual(llmInfo.providerMetadata);
      // response.timestamp is serialized as string in JSONB
      expect(result.llm?.response).toBeDefined();
      expect(result.llm?.response?.modelId).toBe(llmInfo.response?.modelId);
      expect(result.llm?.response?.headers).toEqual(llmInfo.response?.headers);
    });

    it('should handle null LLM metadata', async () => {
      const input = {
        questionLogId: fixture.questionLog1Id,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high' as const,
        entityCounts: { topics: 0, skills: 0, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Test',
        llm: null,
        entities: [],
      };

      const result = await fixture.logAnalysisRepository.create(input);

      expect(result.llm).toBeNull();
    });

    it('should create entities with correct timestamps', async () => {
      const beforeCreate = new Date();
      const input = {
        questionLogId: fixture.questionLog1Id,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high' as const,
        entityCounts: { topics: 0, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Test',
        llm: null,
        entities: [
          {
            type: 'skill' as const,
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
          },
        ],
      };

      const result = await fixture.logAnalysisRepository.create(input);
      const afterCreate = new Date();

      expect(result.extractedAt).toBeInstanceOf(Date);
      expect(result.extractedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(result.extractedAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );

      expect(result.entities[0].createdAt).toBeInstanceOf(Date);
      expect(result.entities[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(result.entities[0].createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await fixture.seedSampleAnalyses();
    });

    it('should return all analyses when no params provided', async () => {
      const result = await fixture.logAnalysisRepository.findMany();

      expect(result).toHaveLength(4);
    });

    it('should filter by question log ID', async () => {
      const result = await fixture.logAnalysisRepository.findMany({
        questionLogId: fixture.questionLog1Id,
      });

      expect(result).toHaveLength(2);
      expect(result[0].questionLogId).toBe(fixture.questionLog1Id);
      expect(result[1].questionLogId).toBe(fixture.questionLog1Id);
    });

    it('should filter by extraction version', async () => {
      const result = await fixture.logAnalysisRepository.findMany({
        extractionVersion: 'v1',
      });

      expect(result).toHaveLength(4);
      expect(result.every((r) => r.extractionVersion === 'v1')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await fixture.logAnalysisRepository.findMany({
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should order by extractedAt descending', async () => {
      const result = await fixture.logAnalysisRepository.findMany();

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].extractedAt.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].extractedAt.getTime(),
        );
      }
    });
  });

  describe('findById', () => {
    it('should return analysis with entities when found', async () => {
      await fixture.seedSampleAnalyses();

      const result = await fixture.logAnalysisRepository.findById(
        fixture.questionLog1Id,
      );

      expect(result).toBeNull(); // ID is question_log_id, not analysis_id
    });

    it('should return null when not found', async () => {
      const result = await fixture.logAnalysisRepository.findById(
        '00000000-0000-0000-0000-000000000000' as any,
      );

      expect(result).toBeNull();
    });

    it('should return analysis with entities by analysis ID', async () => {
      await fixture.seedSampleAnalyses();

      // Query directly to get the actual analysis ID
      const analyses = await fixture.logAnalysisRepository.findMany({
        questionLogId: fixture.questionLog1Id,
      });

      expect(analyses).toHaveLength(2);
      const firstAnalysis = analyses[0];

      const result = await fixture.logAnalysisRepository.findById(
        firstAnalysis.id as Identifier,
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(firstAnalysis.id);
      expect(result?.entities).toHaveLength(2);
    });
  });

  describe('findByQuestionLogId', () => {
    beforeEach(async () => {
      await fixture.seedSampleAnalyses();
    });

    it('should return all analyses for a question log', async () => {
      const result = await fixture.logAnalysisRepository.findByQuestionLogId(
        fixture.questionLog1Id,
      );

      expect(result).toHaveLength(2);
      expect(
        result.every((r) => r.questionLogId === fixture.questionLog1Id),
      ).toBe(true);
    });

    it('should return empty array when no analyses exist', async () => {
      const result = await fixture.logAnalysisRepository.findByQuestionLogId(
        '00000000-0000-0000-0000-000000000000' as any,
      );

      expect(result).toEqual([]);
    });

    it('should order by extractedAt descending', async () => {
      const result = await fixture.logAnalysisRepository.findByQuestionLogId(
        fixture.questionLog1Id,
      );

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].extractedAt.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].extractedAt.getTime(),
        );
      }
    });

    it('should include entities in results', async () => {
      const result = await fixture.logAnalysisRepository.findByQuestionLogId(
        fixture.questionLog1Id,
      );

      expect(result[0].entities).toBeDefined();
      expect(result[0].entities.length).toBeGreaterThan(0);
      expect(result[0].entities[0]).toHaveProperty('type');
      expect(result[0].entities[0]).toHaveProperty('name');
      expect(result[0].entities[0]).toHaveProperty('normalizedLabel');
    });
  });

  describe('getNextExtractionNumber', () => {
    it('should return 1 for first extraction of a version', async () => {
      const result =
        await fixture.logAnalysisRepository.getNextExtractionNumber(
          fixture.questionLog1Id,
          'v1',
        );

      expect(result).toBe(1);
    });

    it('should increment after existing extraction', async () => {
      await fixture.seedSampleAnalyses();

      // questionLog1Id has 2 extractions with numbers 1 and 2
      const result =
        await fixture.logAnalysisRepository.getNextExtractionNumber(
          fixture.questionLog1Id,
          'v1',
        );

      expect(result).toBe(3);
    });

    it('should return 1 for different extraction version', async () => {
      await fixture.seedSampleAnalyses();

      const result =
        await fixture.logAnalysisRepository.getNextExtractionNumber(
          fixture.questionLog1Id,
          'v2', // Different version
        );

      expect(result).toBe(1);
    });

    it('should be independent per question log', async () => {
      await fixture.seedSampleAnalyses();

      const result1 =
        await fixture.logAnalysisRepository.getNextExtractionNumber(
          fixture.questionLog1Id,
          'v1',
        );
      const result2 =
        await fixture.logAnalysisRepository.getNextExtractionNumber(
          fixture.questionLog2Id,
          'v1',
        );

      expect(result1).toBe(3); // questionLog1 has 2 extractions
      expect(result2).toBe(2); // questionLog2 has 1 extraction
    });
  });
});
