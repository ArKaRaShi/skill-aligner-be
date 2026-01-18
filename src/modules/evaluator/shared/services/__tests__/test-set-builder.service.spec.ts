import type { Identifier } from 'src/shared/contracts/types/identifier';

import { TestSetTransformer } from '../../transformers/test-set.transformer';
import { TestSetBuilderService } from '../test-set-builder.service';
import {
  createMockEnrichedLog,
  createMockEnrichedLogWithAggregation,
  createMockEnrichedLogWithAnswerSynthesis,
  createMockEnrichedLogWithCourseFilterGrouped,
  createMockEnrichedLogWithCourseRetrieval,
  createMockEnrichedLogWithSkillExpansion,
  createMockId,
} from './test-set-builder.fixture';

describe('TestSetBuilderService', () => {
  let service: TestSetBuilderService;
  let mockTransformer: jest.Mocked<TestSetTransformer>;

  const createId = (str: string): Identifier => createMockId(str);

  // Mock enriched log data using fixture
  const mockEnrichedLog = createMockEnrichedLog();

  beforeEach(() => {
    mockTransformer = {
      toSkillExpansionEnrichedLogs: jest.fn(),
      toClassificationEnrichedLogs: jest.fn(),
      toCourseRetrievalEnrichedLogs: jest.fn(),
      toCourseFilterEnrichedLogs: jest.fn(),
      toCourseAggregationEnrichedLogs: jest.fn(),
      toAnswerSynthesisEnrichedLogs: jest.fn(),
    } as unknown as jest.Mocked<TestSetTransformer>;

    service = new TestSetBuilderService(mockTransformer);
  });

  describe('Constructor', () => {
    it('should initialize with TestSetTransformer', () => {
      expect(service).toBeInstanceOf(TestSetBuilderService);
    });
  });

  describe('buildSkillExpansionTestSet', () => {
    it('should build test set from SKILL_EXPANSION enriched logs', async () => {
      mockTransformer.toSkillExpansionEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);

      const result = await service.buildSkillExpansionTestSet(['log-123']);

      expect(mockTransformer.toSkillExpansionEnrichedLogs).toHaveBeenCalledWith(
        ['log-123'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].question).toBe(
        'What skills do I need for data analysis?',
      );
      expect(result[0].skills).toEqual([
        { skill: 'data analysis', reason: 'Direct match' },
        { skill: 'statistics', reason: 'Related skill' },
        { skill: 'python', reason: 'Tool for data analysis' },
      ]);
      expect(result[0].llmModel).toBe('gpt-4');
      expect(result[0].llmProvider).toBe('openai');
      expect(result[0].promptVersion).toBe('V10');
      expect(result[0].duration).toBe(1500);
      expect(result[0].tokenUsage).toEqual({
        input: 100,
        output: 50,
        total: 150,
      });
    });

    it('should handle empty skill items array', async () => {
      const logWithEmptySkills = createMockEnrichedLogWithSkillExpansion({
        output: { raw: { skillItems: [] } },
      });

      mockTransformer.toSkillExpansionEnrichedLogs.mockResolvedValue([
        logWithEmptySkills,
      ]);

      const result = await service.buildSkillExpansionTestSet(['log-123']);

      expect(result[0].skills).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      const logWithoutOptionalFields = createMockEnrichedLogWithSkillExpansion({
        llm: undefined,
        output: {
          raw: { skillItems: [{ skill: 'test', reason: 'test' }] },
        },
      });

      mockTransformer.toSkillExpansionEnrichedLogs.mockResolvedValue([
        logWithoutOptionalFields,
      ]);

      const result = await service.buildSkillExpansionTestSet(['log-123']);

      expect(result[0].llmModel).toBeUndefined();
      expect(result[0].llmProvider).toBeUndefined();
      expect(result[0].promptVersion).toBeUndefined();
      expect(result[0].tokenUsage).toBeUndefined();
    });
  });

  describe('buildClassificationTestSet', () => {
    it('should build test set from QUESTION_CLASSIFICATION enriched logs', async () => {
      mockTransformer.toClassificationEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);

      const result = await service.buildClassificationTestSet(['log-123']);

      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].category).toBe('relevant');
      expect(result[0].reason).toBe('User is asking about learning skills');
      expect(result[0].llmModel).toBe('gpt-4');
      expect(result[0].promptVersion).toBe('V11');
      expect(result[0].duration).toBe(800);
    });
  });

  describe('buildCourseRetrievalTestSet', () => {
    it('should build test set from COURSE_RETRIEVAL enriched logs', async () => {
      const mockRetrievalLog = createMockEnrichedLogWithCourseRetrieval();
      mockTransformer.toCourseRetrievalEnrichedLogs.mockResolvedValue([
        mockRetrievalLog,
      ]);

      const result = await service.buildCourseRetrievalTestSet(['log-123']);

      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].skills).toEqual(['data analysis', 'statistics']);
      expect(result[0].embeddingUsage?.bySkill?.[0]?.provider).toBe('local');
      expect(result[0].duration).toBe(2000);
    });
  });

  describe('buildCourseFilterTestSet', () => {
    it('should build test set from COURSE_RELEVANCE_FILTER enriched logs, with comprehensive structure', async () => {
      const mockGroupedLog = createMockEnrichedLogWithCourseFilterGrouped(
        {},
        3, // 3 skills
      );
      mockTransformer.toCourseFilterEnrichedLogs.mockResolvedValue([
        mockGroupedLog,
      ]);

      const result = await service.buildCourseFilterTestSet(['log-123']);

      // Should create ONE entry per query log (not one per skill)
      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].question).toBe(
        'What skills do I need for data analysis?',
      );

      // Common fields should be extracted from first step
      expect(result[0].llmModel).toBe('gpt-4');
      expect(result[0].llmProvider).toBe('openai');
      expect(result[0].promptVersion).toBe('V5');
      expect(result[0].duration).toBe(3000);

      // Total token usage (sum of all skills)
      expect(result[0].totalTokenUsage).toEqual({
        input: 600,
        output: 300,
        total: 900,
      });

      // Token usage by skill
      expect(result[0].tokenUsageBySkill?.['skill-1']).toEqual({
        input: 200,
        output: 100,
        total: 300,
      });
      expect(result[0].tokenUsageBySkill?.['skill-2']).toEqual({
        input: 200,
        output: 100,
        total: 300,
      });
      expect(result[0].tokenUsageBySkill?.['skill-3']).toEqual({
        input: 200,
        output: 100,
        total: 300,
      });

      // LLM info by skill
      expect(result[0].llmInfoBySkill['skill-1']).toMatchObject({
        model: 'gpt-4',
        provider: 'openai',
        promptVersion: 'V5',
      });

      // Metrics by skill (Records, not array)
      expect(result[0].metricsBySkill['skill-1']).toMatchObject({
        inputCount: 10,
        acceptedCount: 1,
        rejectedCount: 1,
        missingCount: 1,
        llmDecisionRate: 0.6,
        llmRejectionRate: 0.5,
        llmFallbackRate: 0.3,
        stepId: createId('step-course-filter-1'),
      });

      // All skills now share the same stepId (single step with allSkillsMetrics array)
      expect(result[0].metricsBySkill['skill-2']).toMatchObject({
        inputCount: 11,
        stepId: createId('step-course-filter-1'), // Same stepId for all skills
      });

      expect(result[0].metricsBySkill['skill-3']).toMatchObject({
        inputCount: 12,
        stepId: createId('step-course-filter-1'), // Same stepId for all skills
      });

      // Raw output should be serialized
      expect(result[0].rawOutput).toBeDefined();
      expect(result[0].rawOutput?.llmAcceptedCoursesBySkill).toBeDefined();
      expect(result[0].rawOutput?.llmRejectedCoursesBySkill).toBeDefined();
      expect(result[0].rawOutput?.llmMissingCoursesBySkill).toBeDefined();
    });

    it('should handle missing metrics gracefully', async () => {
      const mockLogWithMissingMetrics =
        createMockEnrichedLogWithCourseFilterGrouped({}, 1);
      // Remove metrics from first step (keep raw output)
      const rawOutput =
        mockLogWithMissingMetrics.courseFilterSteps[0].output?.raw;
      if (rawOutput) {
        mockLogWithMissingMetrics.courseFilterSteps[0].output = {
          raw: rawOutput,
          metrics: undefined,
        };
      } else {
        mockLogWithMissingMetrics.courseFilterSteps[0].output = null;
      }

      mockTransformer.toCourseFilterEnrichedLogs.mockResolvedValue([
        mockLogWithMissingMetrics,
      ]);

      const result = await service.buildCourseFilterTestSet(['log-123']);

      // When metrics are missing, allSkillsMetrics is empty, so metricsBySkill is empty
      expect(result[0].metricsBySkill).toEqual({});
      expect(result[0].llmInfoBySkill).toEqual({});
      expect(result[0].tokenUsageBySkill).toEqual({});
      expect(result[0].totalTokenUsage).toEqual({
        input: 0,
        output: 0,
        total: 0,
      });
      // Top-level LLM fields should be undefined when no skills metrics
      expect(result[0].llmModel).toBeUndefined();
      expect(result[0].llmProvider).toBeUndefined();
      expect(result[0].promptVersion).toBeUndefined();
    });
  });

  describe('buildCourseAggregationTestSet', () => {
    it('should build test set from COURSE_AGGREGATION enriched logs, creating one entry per question', async () => {
      mockTransformer.toCourseAggregationEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);

      const result = await service.buildCourseAggregationTestSet(['log-123']);

      // Should create ONE entry per query log (not one per skill)
      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].question).toBe(
        'What skills do I need for data analysis?',
      );
      // Contains both input (filteredSkillCoursesMap) and output (rankedCourses)
      expect(result[0].filteredSkillCoursesMap).toBeDefined();
      expect(result[0].rankedCourses).toBeDefined();
      expect(result[0].rankedCourses).toHaveLength(1);
      expect(result[0].duration).toBe(500);
    });

    it('should handle missing raw output gracefully', async () => {
      const logWithoutRawOutput = createMockEnrichedLogWithAggregation({
        output: undefined,
      });

      mockTransformer.toCourseAggregationEnrichedLogs.mockResolvedValue([
        logWithoutRawOutput,
      ]);

      const result = await service.buildCourseAggregationTestSet(['log-123']);

      expect(result).toHaveLength(1);
      expect(result[0].filteredSkillCoursesMap).toEqual({});
      expect(result[0].rankedCourses).toEqual([]);
    });
  });

  describe('buildAnswerSynthesisTestSet', () => {
    it('should build test set from ANSWER_SYNTHESIS enriched logs', async () => {
      const mockSynthesisLog = createMockEnrichedLogWithAnswerSynthesis();
      mockTransformer.toAnswerSynthesisEnrichedLogs.mockResolvedValue([
        mockSynthesisLog,
      ]);

      const result = await service.buildAnswerSynthesisTestSet(['log-123']);

      expect(result).toHaveLength(1);
      expect(result[0].queryLogId).toBe(createId('log-123'));
      expect(result[0].answer).toBe(
        'For data analysis, you should start with statistics and Python programming...',
      );
      expect(result[0].llmModel).toBe('gpt-4');
      expect(result[0].promptVersion).toBe('V3');
      expect(result[0].duration).toBe(4000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query log IDs array', async () => {
      mockTransformer.toSkillExpansionEnrichedLogs.mockResolvedValue([]);

      const result = await service.buildSkillExpansionTestSet([]);

      expect(mockTransformer.toSkillExpansionEnrichedLogs).toHaveBeenCalledWith(
        [],
      );
      expect(result).toHaveLength(0);
    });

    it('should preserve data integrity across all step types', async () => {
      // Test all methods with mock logs
      mockTransformer.toSkillExpansionEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);
      mockTransformer.toClassificationEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);
      const mockRetrievalLog = createMockEnrichedLogWithCourseRetrieval();
      mockTransformer.toCourseRetrievalEnrichedLogs.mockResolvedValue([
        mockRetrievalLog,
      ]);
      const mockGroupedFilterLog = createMockEnrichedLogWithCourseFilterGrouped(
        {},
        2,
      );
      mockTransformer.toCourseFilterEnrichedLogs.mockResolvedValue([
        mockGroupedFilterLog,
      ]);
      mockTransformer.toCourseAggregationEnrichedLogs.mockResolvedValue([
        mockEnrichedLog,
      ]);
      const mockSynthesisLog = createMockEnrichedLogWithAnswerSynthesis();
      mockTransformer.toAnswerSynthesisEnrichedLogs.mockResolvedValue([
        mockSynthesisLog,
      ]);

      const skillResult = await service.buildSkillExpansionTestSet(['log-123']);
      const classResult = await service.buildClassificationTestSet(['log-123']);
      const retrievalResult = await service.buildCourseRetrievalTestSet([
        'log-123',
      ]);
      const filterResult = await service.buildCourseFilterTestSet(['log-123']);
      const aggregationResult = await service.buildCourseAggregationTestSet([
        'log-123',
      ]);
      const synthesisResult = await service.buildAnswerSynthesisTestSet([
        'log-123',
      ]);

      // All should return the same queryLogId and question
      expect(skillResult[0].queryLogId).toBe(createId('log-123'));
      expect(classResult[0].queryLogId).toBe(createId('log-123'));
      expect(retrievalResult[0].queryLogId).toBe(createId('log-123'));
      expect(filterResult[0].queryLogId).toBe(createId('log-123'));
      expect(aggregationResult[0].queryLogId).toBe(createId('log-123'));
      expect(synthesisResult[0].queryLogId).toBe(createId('log-123'));
    });
  });
});
