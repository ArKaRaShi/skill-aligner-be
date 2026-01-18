import type { Identifier } from 'src/shared/contracts/types/identifier';

import { QueryPipelineReaderService } from 'src/modules/query-logging/services/query-pipeline-reader.service';
import type { QueryProcessLogWithSteps } from 'src/modules/query-logging/types/query-log-step.type';
import { STEP_NAME } from 'src/modules/query-logging/types/query-status.type';

import { TestSetTransformer } from '../test-set.transformer';

describe('TestSetTransformer', () => {
  let transformer: TestSetTransformer;
  let mockReader: jest.Mocked<QueryPipelineReaderService>;

  // Helper to create Identifier
  const createId = (str: string): Identifier => str as Identifier;

  // Mock query log data
  const mockQueryLog: QueryProcessLogWithSteps = {
    id: createId('log-123'),
    question: 'What skills do I need for data analysis?',
    status: 'COMPLETED',
    input: { question: 'What skills do I need for data analysis?' },
    output: null,
    metrics: null,
    metadata: null,
    error: null,
    totalDuration: null,
    totalTokens: null,
    totalCost: null,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:01:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
    processSteps: [
      {
        id: createId('step-1'),
        queryLogId: createId('log-123'),
        stepName: STEP_NAME.SKILL_EXPANSION,
        stepOrder: 3,
        input: { question: 'What skills do I need for data analysis?' },
        output: {
          raw: {
            skillItems: [
              { skill: 'data analysis', reason: 'Direct match' },
              { skill: 'statistics', reason: 'Related skill' },
            ],
          },
        },
        llm: {
          model: 'gpt-4',
          provider: 'openai',
          promptVersion: 'V10',
          tokenUsage: { input: 100, output: 50, total: 150 },
        },
        embedding: null,
        metrics: null,
        error: null,
        duration: 1500,
        startedAt: new Date('2024-01-01T10:00:10Z'),
        completedAt: new Date('2024-01-01T10:00:11.5Z'),
        createdAt: new Date('2024-01-01T10:00:10Z'),
        updatedAt: new Date('2024-01-01T10:00:11.5Z'),
      },
      {
        id: createId('step-2'),
        queryLogId: createId('log-123'),
        stepName: STEP_NAME.QUESTION_CLASSIFICATION,
        stepOrder: 1,
        input: { question: 'What skills do I need for data analysis?' },
        output: {
          raw: {
            category: 'relevant',
            reason: 'User is asking about learning skills',
          },
        },
        llm: {
          model: 'gpt-4',
          provider: 'openai',
          promptVersion: 'V11',
          tokenUsage: { input: 50, output: 20, total: 70 },
        },
        embedding: null,
        metrics: null,
        error: null,
        duration: 800,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:00.8Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00.8Z'),
      },
    ],
  };

  beforeEach(() => {
    mockReader = {
      getQueryLogsByIds: jest.fn(),
      getQueryLogById: jest.fn(),
      parseStepOutput: jest.fn(),
      getStepByName: jest.fn(),
      getStepRawOutput: jest.fn(),
    } as unknown as jest.Mocked<QueryPipelineReaderService>;

    transformer = new TestSetTransformer(mockReader);
  });

  describe('Constructor', () => {
    it('should initialize with QueryPipelineReaderService', () => {
      expect(transformer).toBeInstanceOf(TestSetTransformer);
    });
  });

  describe('toSkillExpansionEnrichedLogs', () => {
    it('should enrich logs with SKILL_EXPANSION step', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      const result = await transformer.toSkillExpansionEnrichedLogs([
        'log-123',
      ]);

      expect(mockReader.getQueryLogsByIds).toHaveBeenCalledWith(['log-123']);
      expect(result).toHaveLength(1);
      expect(result[0].skillExpansionStep).toBeDefined();
      expect(result[0].skillExpansionStep.stepName).toBe(
        STEP_NAME.SKILL_EXPANSION,
      );
      expect(result[0].skillExpansionStep.output?.raw).toEqual({
        skillItems: [
          { skill: 'data analysis', reason: 'Direct match' },
          { skill: 'statistics', reason: 'Related skill' },
        ],
      });
    });

    it('should handle multiple query log IDs', async () => {
      const mockLog2: QueryProcessLogWithSteps = {
        ...mockQueryLog,
        id: createId('log-456'),
        processSteps: [
          {
            ...mockQueryLog.processSteps[0],
            id: createId('step-3'),
            queryLogId: createId('log-456'),
          },
        ],
      };

      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog, mockLog2]);

      const result = await transformer.toSkillExpansionEnrichedLogs([
        'log-123',
        'log-456',
      ]);

      expect(mockReader.getQueryLogsByIds).toHaveBeenCalledWith([
        'log-123',
        'log-456',
      ]);
      expect(result).toHaveLength(2);
    });

    it('should throw error if SKILL_EXPANSION step is missing', async () => {
      const logWithoutStep: QueryProcessLogWithSteps = {
        ...mockQueryLog,
        processSteps: [
          {
            ...mockQueryLog.processSteps[1], // Only classification step
          },
        ],
      };

      mockReader.getQueryLogsByIds.mockResolvedValue([logWithoutStep]);

      await expect(
        transformer.toSkillExpansionEnrichedLogs(['log-123']),
      ).rejects.toThrow('Query log log-123 missing SKILL_EXPANSION step');
    });

    it('should preserve all original log properties', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      const result = await transformer.toSkillExpansionEnrichedLogs([
        'log-123',
      ]);

      expect(result[0].id).toBe(createId('log-123'));
      expect(result[0].question).toBe(
        'What skills do I need for data analysis?',
      );
      expect(result[0].status).toBe('COMPLETED');
    });
  });

  describe('toClassificationEnrichedLogs', () => {
    it('should enrich logs with QUESTION_CLASSIFICATION step', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      const result = await transformer.toClassificationEnrichedLogs([
        'log-123',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].classificationStep).toBeDefined();
      expect(result[0].classificationStep.stepName).toBe(
        STEP_NAME.QUESTION_CLASSIFICATION,
      );
      expect(result[0].classificationStep.output?.raw).toEqual({
        category: 'relevant',
        reason: 'User is asking about learning skills',
      });
    });

    it('should throw error if QUESTION_CLASSIFICATION step is missing', async () => {
      const logWithoutStep: QueryProcessLogWithSteps = {
        ...mockQueryLog,
        processSteps: [
          {
            ...mockQueryLog.processSteps[0], // Only skill expansion step
          },
        ],
      };

      mockReader.getQueryLogsByIds.mockResolvedValue([logWithoutStep]);

      await expect(
        transformer.toClassificationEnrichedLogs(['log-123']),
      ).rejects.toThrow(
        'Query log log-123 missing QUESTION_CLASSIFICATION step',
      );
    });
  });

  describe('toCourseRetrievalEnrichedLogs', () => {
    it('should throw error if COURSE_RETRIEVAL step is missing', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      await expect(
        transformer.toCourseRetrievalEnrichedLogs(['log-123']),
      ).rejects.toThrow('Query log log-123 missing COURSE_RETRIEVAL step');
    });
  });

  describe('toCourseFilterEnrichedLogs', () => {
    it('should throw error if COURSE_RELEVANCE_FILTER step is missing', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      await expect(
        transformer.toCourseFilterEnrichedLogs(['log-123']),
      ).rejects.toThrow(
        'Query log log-123 missing COURSE_RELEVANCE_FILTER step',
      );
    });
  });

  describe('toCourseAggregationEnrichedLogs', () => {
    it('should throw error if COURSE_AGGREGATION step is missing', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      await expect(
        transformer.toCourseAggregationEnrichedLogs(['log-123']),
      ).rejects.toThrow('Query log log-123 missing COURSE_AGGREGATION step');
    });
  });

  describe('toAnswerSynthesisEnrichedLogs', () => {
    it('should throw error if ANSWER_SYNTHESIS step is missing', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      await expect(
        transformer.toAnswerSynthesisEnrichedLogs(['log-123']),
      ).rejects.toThrow('Query log log-123 missing ANSWER_SYNTHESIS step');
    });
  });

  describe('Enriched Log Types', () => {
    it('should return properly typed QueryLogWithSkillExpansion', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      const result = await transformer.toSkillExpansionEnrichedLogs([
        'log-123',
      ]);

      // Type assertion: skillExpansionStep should be present (not undefined)
      const enrichedLog = result[0];
      expect(enrichedLog.skillExpansionStep).toBeDefined();

      // All step metadata should be accessible
      const step = enrichedLog.skillExpansionStep;
      expect(step.id).toBe(createId('step-1'));
      expect(step.duration).toBe(1500);
      expect(step.llm?.model).toBe('gpt-4');
      expect(step.llm?.tokenUsage?.total).toBe(150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query log IDs array', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([]);

      const result = await transformer.toSkillExpansionEnrichedLogs([]);

      expect(mockReader.getQueryLogsByIds).toHaveBeenCalledWith([]);
      expect(result).toHaveLength(0);
    });

    it('should handle logs with multiple steps correctly', async () => {
      mockReader.getQueryLogsByIds.mockResolvedValue([mockQueryLog]);

      const skillResult = await transformer.toSkillExpansionEnrichedLogs([
        'log-123',
      ]);
      const classResult = await transformer.toClassificationEnrichedLogs([
        'log-123',
      ]);

      expect(skillResult[0].skillExpansionStep.stepName).toBe(
        STEP_NAME.SKILL_EXPANSION,
      );
      expect(classResult[0].classificationStep.stepName).toBe(
        STEP_NAME.QUESTION_CLASSIFICATION,
      );
    });
  });
});
