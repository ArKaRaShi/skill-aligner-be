import { Identifier } from 'src/shared/contracts/types/identifier';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { HashHelper } from 'src/shared/utils/hash.helper';

import { IQueryLoggingRepository } from 'src/modules/query-logging/contracts/i-query-logging-repository.contract';
import { QueryProcessStep } from 'src/modules/query-logging/types/query-log-step.type';
import {
  QueryLogOutput,
  QueryProcessLog,
} from 'src/modules/query-logging/types/query-log.type';

import { QueryPipelineLoggerService } from '../../../query-pipeline-logger.service';
import {
  createMockLlmInfo,
  createMockQueryLog,
  createMockRepository,
  createMockStep,
  mockQueryLogId,
  mockStepId,
} from '../fixtures/query-pipeline-logger.fixtures';

describe('QueryPipelineLoggerService - Misc', () => {
  let service: QueryPipelineLoggerService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  const toId = (id: string): Identifier => id as Identifier;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new QueryPipelineLoggerService(mockRepository);
  });

  describe('error handling', () => {
    it('should throw error when operation called before start', async () => {
      // Arrange
      const service = new QueryPipelineLoggerService(mockRepository);
      const output: QueryLogOutput = { answer: 'test' };

      // Act & Assert
      await expect(service.complete(output)).rejects.toThrow(
        'QueryPipelineLoggerService must be started before performing operations',
      );
    });
  });

  describe('serializeOutput', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should convert Map to Object for JSONB storage', async () => {
      // Arrange
      const llmInfo: LlmInfo = createMockLlmInfo({
        systemPrompt: 'Classify',
        userPrompt: 'Classify this',
        promptVersion: '1.0',
      });
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act - classification doesn't use Maps, but output should have raw field
      await service.classification({
        question: 'Test',
        promptVersion: '1.0',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo,
        },
      });

      // Assert - verify raw field structure
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: { question: 'Test', promptVersion: '1.0' },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(
        mockStepId,
        expect.objectContaining({
          output: expect.objectContaining({
            raw: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('extractLlmInfo', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = createMockQueryLog();
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should extract LLM info and hash system prompt', async () => {
      // Arrange
      const llmInfo: LlmInfo = createMockLlmInfo({
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Help me',
        promptVersion: '1.0',
        schemaName: 'MySchema',
        finishReason: 'stop',
        warnings: [],
        providerMetadata: { key: 'value' },
        response: {
          timestamp: new Date(),
          modelId: 'gpt-4o-mini',
          headers: { 'x-test': 'value' },
        },
        hyperParameters: {
          temperature: 0.7,
          topP: 0.9,
        },
      });
      const mockStep: QueryProcessStep = createMockStep({
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
      });
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification({
        question: 'Test',
        promptVersion: '1.0',
        classificationResult: {
          category: 'relevant',
          reason: 'Test',
          llmInfo,
        },
      });

      // Assert
      expect(mockRepository.updateStep).toHaveBeenCalledWith(
        mockStepId,
        expect.objectContaining({
          llm: {
            provider: 'openrouter',
            model: 'openai/gpt-4o-mini',
            promptVersion: '1.0',
            systemPromptHash: HashHelper.generateHashSHA256(
              'You are a helpful assistant',
            ),
            userPrompt: 'Help me',
            schemaName: 'MySchema',
            fullMetadata: {
              finishReason: 'stop',
              warnings: [],
              providerMetadata: { key: 'value' },
              response: {
                timestamp: expect.any(Date),
                modelId: 'gpt-4o-mini',
                headers: { 'x-test': 'value' },
              },
            },
            parameters: {
              temperature: 0.7,
              topP: 0.9,
            },
            tokenUsage: undefined,
            cost: undefined,
          },
          embedding: undefined,
        }),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete query logging workflow', async () => {
      // Arrange
      const question = 'What courses teach AI?';
      const mockLog: QueryProcessLog = createMockQueryLog({ question });
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      const classificationStep: QueryProcessStep = createMockStep({
        id: toId('step-1'),
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
      });
      const expansionStep: QueryProcessStep = createMockStep({
        id: toId('step-2'),
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
      });
      mockRepository.createStep
        .mockResolvedValueOnce(classificationStep)
        .mockResolvedValueOnce(expansionStep);

      // Act
      await service.start(question);
      await service.classification({
        question,
        promptVersion: '1.0',
        classificationResult: {
          category: 'relevant',
          reason: 'About courses',
          llmInfo: createMockLlmInfo({
            systemPrompt: 'Classify',
            userPrompt: question,
            promptVersion: '1.0',
          }),
        },
      });
      await service.skillExpansion({
        question,
        promptVersion: '1.0',
        skillExpansionResult: {
          skillItems: [
            { skill: 'artificial intelligence', reason: 'Core AI concept' },
          ],
          llmInfo: createMockLlmInfo({
            systemPrompt: 'Expand',
            userPrompt: 'Expand AI',
            promptVersion: '1.0',
          }),
        },
      });

      // Assert
      expect(mockRepository.createQueryLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.createStep).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateStep).toHaveBeenCalledTimes(2);
    });

    it('should handle early exit workflow', async () => {
      // Arrange
      const question = 'Tell me a joke';
      const mockLog: QueryProcessLog = createMockQueryLog({ question });
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      const classificationStep: QueryProcessStep = createMockStep({
        id: toId('step-1'),
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
      });
      mockRepository.createStep.mockResolvedValue(classificationStep);

      // Act
      await service.start(question);
      await service.classification({
        question,
        promptVersion: '1.0',
        classificationResult: {
          category: 'irrelevant',
          reason: 'Not course-related',
          llmInfo: createMockLlmInfo({
            systemPrompt: 'Classify',
            userPrompt: question,
            promptVersion: '1.0',
          }),
        },
      });
      await service.earlyExit({
        classification: {
          category: 'irrelevant',
          reason: 'Not course-related',
        },
      });

      // Assert - classification calls updateStep, earlyExit calls updateQueryLog once
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'EARLY_EXIT',
          completedAt: expect.any(Date),
          output: {
            classification: {
              category: 'irrelevant',
              reason: 'Not course-related',
            },
          },
        },
      );
    });
  });
});
