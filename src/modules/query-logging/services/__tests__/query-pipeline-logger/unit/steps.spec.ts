import type { LlmInfo } from '../../../../../../shared/contracts/types/llm-info.type';
import { HashHelper } from '../../../../../../shared/utils/hash.helper';
import type { IQueryLoggingRepository } from '../../../../contracts/i-query-logging-repository.contract';
import type { QueryProcessStep } from '../../../../types/query-log-step.type';
import type { QueryProcessLog } from '../../../../types/query-log.type';
import { QueryPipelineLoggerService } from '../../../query-pipeline-logger.service';
import {
  createMockEmbeddingUsage,
  createMockLlmInfo,
  createMockQueryLog,
  createMockRepository,
  createMockStep,
  mockQueryLogId,
  mockStepId,
} from '../fixtures/query-pipeline-logger.fixtures';

describe('QueryPipelineLoggerService - Steps', () => {
  let service: QueryPipelineLoggerService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new QueryPipelineLoggerService(mockRepository);
  });

  describe('classification', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log classification step with LLM info', async () => {
      // Arrange
      const llmInfo: LlmInfo = createMockLlmInfo({
        systemPrompt: 'You are a classifier',
        userPrompt: 'Classify this',
        promptVersion: '1.0',
      });
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification({
        question: 'What is AI?',
        promptVersion: '1.0',
        classificationResult: {
          category: 'relevant',
          reason: 'Question is about courses',
          llmInfo,
        },
      });

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: { question: 'What is AI?', promptVersion: '1.0' },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: undefined,
        output: {
          raw: { category: 'relevant', reason: 'Question is about courses' },
        },
        llm: {
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          promptVersion: '1.0',
          systemPromptHash: HashHelper.generateHashSHA256(
            'You are a classifier',
          ),
          userPrompt: 'Classify this',
          schemaName: undefined,
          fullMetadata: {
            finishReason: undefined,
            warnings: undefined,
            providerMetadata: undefined,
            response: undefined,
          },
          parameters: undefined,
          tokenUsage: undefined,
          cost: undefined,
        },
        embedding: undefined,
      });
    });
  });

  describe('skillExpansion', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log skill expansion step', async () => {
      // Arrange
      const llmInfo: LlmInfo = createMockLlmInfo({
        systemPrompt: 'Expand skills',
        userPrompt: 'Expand these skills',
        promptVersion: '1.0',
      });
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.skillExpansion({
        question: 'What skills are needed for AI?',
        promptVersion: '1.0',
        skillExpansionResult: {
          skillItems: [
            { skill: 'artificial intelligence', reason: 'Core AI concept' },
            { skill: 'machine learning', reason: 'AI subfield' },
          ],
          llmInfo,
        },
      });

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
        input: {
          question: 'What skills are needed for AI?',
          promptVersion: '1.0',
        },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: undefined,
        output: {
          raw: {
            skillItems: [
              { skill: 'artificial intelligence', reason: 'Core AI concept' },
              { skill: 'machine learning', reason: 'AI subfield' },
            ],
          },
        },
        llm: expect.objectContaining({
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
        }),
        embedding: undefined,
      });
    });
  });

  describe('courseRetrieval', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log course retrieval step with embedding info', async () => {
      // Arrange
      const embeddingUsage = createMockEmbeddingUsage('AI');
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'COURSE_RETRIEVAL',
        stepOrder: 4,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.courseRetrieval({
        skills: ['AI'],
        skillCoursesMap: new Map([['AI', []]]),
        embeddingUsage,
      });

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'COURSE_RETRIEVAL',
        stepOrder: 4,
        input: { skills: ['AI'], threshold: 0, topN: 10 },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: undefined,
        output: {
          raw: {
            skills: ['AI'],
            skillCoursesMap: { AI: [] },
            embeddingUsage,
          },
        },
        llm: undefined,
        embedding: {
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          totalTokens: 2,
          bySkill: embeddingUsage.bySkill,
          skillsCount: 1,
        },
      });
    });
  });

  describe('answerSynthesis', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log answer synthesis step', async () => {
      // Arrange
      const llmInfo: LlmInfo = createMockLlmInfo({
        systemPrompt: 'Synthesize answer',
        userPrompt: 'Create answer',
        promptVersion: '1.0',
      });
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'ANSWER_SYNTHESIS',
        stepOrder: 7,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.answerSynthesis({
        question: 'What courses teach AI?',
        promptVersion: '1.0',
        synthesisResult: {
          answerText: 'This is the synthesized answer',
          llmInfo,
        },
      });

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'ANSWER_SYNTHESIS',
        stepOrder: 7,
        input: { question: 'What courses teach AI?', promptVersion: '1.0' },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: undefined,
        output: {
          raw: { answer: 'This is the synthesized answer' },
        },
        llm: expect.objectContaining({
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
        }),
        embedding: undefined,
      });
    });
  });
});
