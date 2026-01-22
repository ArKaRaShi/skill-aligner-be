import { Test, TestingModule } from '@nestjs/testing';

import { describe, expect, it } from '@jest/globals';

import { EvaluateRetrieverOutput } from '../../types/course-retrieval.types';
import { EvaluationResultManagerService } from '../evaluation-result-manager.service';

describe('EvaluationResultManagerService', () => {
  let service: EvaluationResultManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationResultManagerService],
    }).compile();

    service = module.get<EvaluationResultManagerService>(
      EvaluationResultManagerService,
    );
  });

  describe('calculateIterationMetrics', () => {
    const createMockRecord = (
      skillRelevance: number,
      contextAlignment: number,
      contextMismatchCount: number,
      inputTokens: number,
      outputTokens: number,
    ): EvaluateRetrieverOutput => {
      return {
        question: 'Test question',
        skill: 'Test skill',
        retrievedCount: 5,
        evaluations: [],
        metrics: {
          averageSkillRelevance: skillRelevance,
          averageContextAlignment: contextAlignment,
          alignmentGap: skillRelevance - contextAlignment,
          contextMismatchRate: (contextMismatchCount / 5) * 100,
          contextMismatchCourses: Array(contextMismatchCount).fill({
            subjectCode: 'CS101',
            subjectName: 'Test Course',
            skillRelevance: 3,
            contextAlignment: 0,
          }),
        },
        llmModel: 'gpt-4',
        llmProvider: 'openai',
        inputTokens,
        outputTokens,
      };
    };

    it('should calculate metrics for single record', () => {
      const records = [createMockRecord(2.5, 2.0, 1, 100, 50)];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.iterationNumber).toBe(1);
      expect(result.totalCases).toBe(1);
      expect(result.macroAvg.averageSkillRelevance).toBe(2.5);
      expect(result.macroAvg.averageContextAlignment).toBe(2.0);
      expect(result.macroAvg.alignmentGap).toBe(0.5);
      expect(result.totalContextMismatches).toBe(1);
      expect(result.totalInputTokens).toBe(100);
      expect(result.totalOutputTokens).toBe(50);
    });

    it('should calculate average metrics across multiple records', () => {
      const records = [
        createMockRecord(2.0, 1.5, 1, 100, 50),
        createMockRecord(3.0, 2.5, 0, 150, 75),
        createMockRecord(2.5, 2.0, 2, 120, 60),
      ];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.totalCases).toBe(3);
      expect(result.macroAvg.averageSkillRelevance).toBeCloseTo(2.5, 1);
      expect(result.macroAvg.averageContextAlignment).toBe(2.0);
      expect(result.macroAvg.alignmentGap).toBe(0.5);
      expect(result.totalContextMismatches).toBe(3);
      expect(result.totalInputTokens).toBe(370);
      expect(result.totalOutputTokens).toBe(185);
    });

    it('should calculate context mismatch rate correctly', () => {
      const records = [
        createMockRecord(2.0, 2.0, 2, 100, 50), // 2 mismatches
        createMockRecord(2.5, 2.5, 1, 100, 50), // 1 mismatch
      ];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Macro avg mismatch rate (averaged across test cases)
      expect(result.macroAvg.contextMismatchRate).toBeCloseTo(30, 0);
    });

    it('should have zero mismatches when no mismatches exist', () => {
      const records = [
        createMockRecord(2.5, 2.5, 0, 100, 50),
        createMockRecord(3.0, 3.0, 0, 150, 75),
      ];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.totalContextMismatches).toBe(0);
      expect(result.macroAvg.contextMismatchRate).toBe(0);
    });

    it('should include timestamp in metrics', () => {
      const records = [createMockRecord(2.5, 2.0, 1, 100, 50)];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should throw error for empty records array', () => {
      expect(() =>
        service.calculateIterationMetrics({
          iterationNumber: 1,
          records: [],
        }),
      ).toThrow('Cannot calculate metrics for empty records array');
    });

    it('should correctly calculate alignment gap', () => {
      const records = [
        createMockRecord(3.0, 2.0, 0, 100, 50), // gap = 1.0
        createMockRecord(2.5, 1.5, 0, 100, 50), // gap = 1.0
      ];

      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.alignmentGap).toBe(1.0);
    });
  });

  describe('buildFinalMetrics', () => {
    const createMockAggregateMetrics = () => ({
      testSetName: 'test-set-v1',
      totalIterations: 3,
      testSetSize: 7,
      macro: {
        meanSkillRelevance: 2.5,
        minSkillRelevance: 2.0,
        maxSkillRelevance: 3.0,
        meanContextAlignment: 2.0,
        minContextAlignment: 1.5,
        maxContextAlignment: 2.5,
        meanAlignmentGap: 0.5,
        meanMismatchRate: 15.5,
      },
      micro: {
        meanSkillRelevance: 2.6,
        minSkillRelevance: 2.1,
        maxSkillRelevance: 3.0,
        meanContextAlignment: 2.1,
        minContextAlignment: 1.6,
        maxContextAlignment: 2.6,
        meanAlignmentGap: 0.5,
        meanMismatchRate: 15.0,
      },
      iterationMetrics: [
        {
          iterationNumber: 1,
          totalCases: 7,
          totalInputTokens: 1000,
          totalOutputTokens: 500,
          timestamp: '2024-01-01T00:00:00.000Z',
          macroAvg: {
            averageSkillRelevance: 2.5,
            averageContextAlignment: 2.0,
            alignmentGap: 0.5,
            contextMismatchRate: 15.0,
          },
          microAvg: {
            averageSkillRelevance: 2.6,
            averageContextAlignment: 2.1,
            alignmentGap: 0.5,
            contextMismatchRate: 15.0,
          },
          pooled: {
            skillRelevanceDistribution: [],
            contextAlignmentDistribution: [],
          },
          totalContextMismatches: 2,
          testCaseMetrics: [],
        },
      ],
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    it('should build final metrics from aggregate metrics', () => {
      const aggregate = createMockAggregateMetrics();
      const result = service.buildFinalMetrics(aggregate);

      expect(result.testSetName).toBe(aggregate.testSetName);
      expect(result.totalIterations).toBe(aggregate.totalIterations);
      expect(result.testSetSize).toBe(aggregate.testSetSize);
    });

    it('should map macro overall metrics correctly', () => {
      const aggregate = createMockAggregateMetrics();
      const result = service.buildFinalMetrics(aggregate);

      expect(result.macroOverall.meanSkillRelevance).toBe(
        aggregate.macro.meanSkillRelevance,
      );
      expect(result.macroOverall.meanContextAlignment).toBe(
        aggregate.macro.meanContextAlignment,
      );
      expect(result.macroOverall.meanMismatchRate).toBe(
        aggregate.macro.meanMismatchRate,
      );
    });

    it('should map micro overall metrics correctly', () => {
      const aggregate = createMockAggregateMetrics();
      const result = service.buildFinalMetrics(aggregate);

      expect(result.microOverall.meanSkillRelevance).toBe(
        aggregate.micro.meanSkillRelevance,
      );
      expect(result.microOverall.meanContextAlignment).toBe(
        aggregate.micro.meanContextAlignment,
      );
      expect(result.microOverall.meanMismatchRate).toBe(
        aggregate.micro.meanMismatchRate,
      );
    });

    it('should include iteration metrics', () => {
      const aggregate = createMockAggregateMetrics();
      const result = service.buildFinalMetrics(aggregate);

      expect(result.iterationMetrics).toEqual(aggregate.iterationMetrics);
      expect(result.iterationMetrics).toHaveLength(1);
    });

    it('should preserve timestamp', () => {
      const aggregate = createMockAggregateMetrics();
      const result = service.buildFinalMetrics(aggregate);

      expect(result.timestamp).toBe(aggregate.timestamp);
    });
  });

  describe('extractContextMismatches', () => {
    const createRecordWithMismatches = (
      mismatchCount: number,
    ): EvaluateRetrieverOutput => ({
      question: 'Test question',
      skill: 'Test skill',
      retrievedCount: 5,
      evaluations: [],
      metrics: {
        averageSkillRelevance: 2.5,
        averageContextAlignment: 1.5,
        alignmentGap: 1.0,
        contextMismatchRate: 40,
        contextMismatchCourses: Array(mismatchCount).fill({
          subjectCode: 'CS101',
          subjectName: 'Test Course',
          skillRelevance: 3,
          contextAlignment: 0,
        }),
      },
      llmModel: 'gpt-4',
      llmProvider: 'openai',
      inputTokens: 100,
      outputTokens: 50,
    });

    it('should extract mismatches from records with mismatches', () => {
      const records = [createRecordWithMismatches(2)];

      const result = service.extractContextMismatches({
        records,
        iterationNumber: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Test question');
      expect(result[0].skill).toBe('Test skill');
      expect(result[0].retrievedCount).toBe(5);
      expect(result[0].iterationNumber).toBe(1);
      expect(result[0].mismatches).toHaveLength(2);
    });

    it('should return empty array when no mismatches exist', () => {
      const records = [
        {
          question: 'Test question',
          skill: 'Test skill',
          retrievedCount: 5,
          evaluations: [],
          metrics: {
            averageSkillRelevance: 2.5,
            averageContextAlignment: 2.5,
            alignmentGap: 0,
            contextMismatchRate: 0,
            contextMismatchCourses: [],
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
      ];

      const result = service.extractContextMismatches({
        records,
        iterationNumber: 1,
      });

      expect(result).toHaveLength(0);
    });

    it('should extract only records with mismatches', () => {
      const records = [
        createRecordWithMismatches(2),
        {
          question: 'No mismatch question',
          skill: 'No mismatch skill',
          retrievedCount: 5,
          evaluations: [],
          metrics: {
            averageSkillRelevance: 2.5,
            averageContextAlignment: 2.5,
            alignmentGap: 0,
            contextMismatchRate: 0,
            contextMismatchCourses: [],
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
        createRecordWithMismatches(1),
      ];

      const result = service.extractContextMismatches({
        records,
        iterationNumber: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0].iterationNumber).toBe(2);
      expect(result[1].iterationNumber).toBe(2);
    });

    it('should include timestamp for each mismatch entry', () => {
      const records = [createRecordWithMismatches(1)];

      const result = service.extractContextMismatches({
        records,
        iterationNumber: 1,
      });

      expect(result[0].timestamp).toBeDefined();
      expect(new Date(result[0].timestamp).toISOString()).toBe(
        result[0].timestamp,
      );
    });

    it('should map mismatch course details correctly', () => {
      const records = [createRecordWithMismatches(1)];

      const result = service.extractContextMismatches({
        records,
        iterationNumber: 1,
      });

      expect(result[0].mismatches[0]).toMatchObject({
        subjectCode: 'CS101',
        subjectName: 'Test Course',
        skillRelevance: 3,
        contextAlignment: 0,
      });
    });
  });

  describe('Metrics calculation edge cases', () => {
    const createMockRecord = (
      skillRelevance: number,
      contextAlignment: number,
    ): EvaluateRetrieverOutput => ({
      question: 'Test',
      skill: 'Test',
      retrievedCount: 1,
      evaluations: [],
      metrics: {
        averageSkillRelevance: skillRelevance,
        averageContextAlignment: contextAlignment,
        alignmentGap: skillRelevance - contextAlignment,
        contextMismatchRate: 0,
        contextMismatchCourses: [],
      },
      llmModel: 'gpt-4',
      llmProvider: 'openai',
      inputTokens: 0,
      outputTokens: 0,
    });

    it('should handle maximum skill relevance (3.0)', () => {
      const records = [createMockRecord(3.0, 3.0)];
      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.averageSkillRelevance).toBe(3.0);
    });

    it('should handle minimum context alignment (0.0)', () => {
      const records = [createMockRecord(3.0, 0.0)];
      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.averageContextAlignment).toBe(0.0);
    });

    it('should handle equal skill and context scores', () => {
      const records = [createMockRecord(2.0, 2.0)];
      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.averageSkillRelevance).toBe(2.0);
      expect(result.macroAvg.averageContextAlignment).toBe(2.0);
      expect(result.macroAvg.alignmentGap).toBe(0.0);
    });

    it('should handle minimum skill relevance (0.0)', () => {
      const records = [createMockRecord(0.0, 0.0)];
      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.averageSkillRelevance).toBe(0.0);
    });

    it('should handle decimal precision correctly', () => {
      const records = [
        createMockRecord(2.3333333, 1.6666666),
        createMockRecord(2.6666666, 2.3333333),
      ];
      const result = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      expect(result.macroAvg.averageSkillRelevance).toBeDefined();
      expect(result.macroAvg.averageContextAlignment).toBeDefined();
      expect(typeof result.macroAvg.averageSkillRelevance).toBe('number');
      expect(typeof result.macroAvg.averageContextAlignment).toBe('number');
    });
  });
});
