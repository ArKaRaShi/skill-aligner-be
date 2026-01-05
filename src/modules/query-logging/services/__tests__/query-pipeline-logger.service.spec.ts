import type { EmbeddingUsage } from '../../../../shared/contracts/types/embedding-usage.type';
import type { Identifier } from '../../../../shared/contracts/types/identifier';
import type { LlmInfo } from '../../../../shared/contracts/types/llm-info.type';
import { HashHelper } from '../../../../shared/utils/hash.helper';
import { type IQueryLoggingRepository } from '../../contracts/i-query-logging-repository.contract';
import type {
  QueryProcessLogWithSteps,
  QueryProcessStep,
} from '../../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from '../../types/query-log.type';
import { QueryPipelineLoggerService } from '../query-pipeline-logger.service';

// Helper to create Identifier from string for tests
const toId = (id: string): Identifier => id as Identifier;

describe('QueryPipelineLoggerService', () => {
  let service: QueryPipelineLoggerService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  const mockQueryLogId = toId('query-log-123');
  const mockStepId = toId('step-123');

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      createQueryLog: jest.fn(),
      createStep: jest.fn(),
      findStepById: jest.fn(),
      updateStep: jest.fn(),
      updateQueryLog: jest.fn(),
      findQueryLogById: jest.fn(),
      findLastQueryLog: jest.fn(),
    };

    // Create service with mocked repository
    service = new QueryPipelineLoggerService(mockRepository);
  });

  describe('start', () => {
    it('should create a query log and return the ID', async () => {
      // Arrange
      const question = 'What is machine learning?';
      const input: QueryLogInput = {
        question,
        campusId: 'campus-1',
        facultyId: 'faculty-1',
        isGenEd: false,
      };
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question,
        input,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      // Act
      const result = await service.start(question, input);

      // Assert
      expect(result).toBe(mockQueryLogId);
      expect(mockRepository.createQueryLog).toHaveBeenCalledWith({
        question,
        input,
      });
    });

    it('should create a query log without input', async () => {
      // Arrange
      const question = 'What is AI?';
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      // Act
      const result = await service.start(question);

      // Assert
      expect(result).toBe(mockQueryLogId);
      expect(mockRepository.createQueryLog).toHaveBeenCalledWith({
        question,
        input: undefined,
      });
    });
  });

  describe('complete', () => {
    beforeEach(async () => {
      // Start a log first
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should complete a query log with output and metrics', async () => {
      // Arrange
      const output: QueryLogOutput = {
        answer: 'This is the answer',
        relatedCourses: [{ courseCode: 'CS101', courseName: 'Intro to CS' }],
      };
      const metrics: Partial<QueryLogMetrics> = {
        totalDuration: 5000,
        totalTokens: {
          input: 1000,
          output: 500,
          total: 1500,
        },
      };

      // Act
      await service.complete(output, metrics);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
          metrics,
        },
      );
    });

    it('should complete a query log with only output', async () => {
      // Arrange
      const output: QueryLogOutput = {
        suggestQuestion: 'What is deep learning?',
      };

      // Act
      await service.complete(output);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          output,
        },
      );
    });
  });

  describe('earlyExit', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should mark query as early exit with classification', async () => {
      // Arrange
      const output: QueryLogOutput = {
        classification: {
          category: 'irrelevant',
          reason: 'Question is not about courses',
        },
      };

      // Act
      await service.earlyExit(output);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'EARLY_EXIT',
          completedAt: expect.any(Date),
          output,
        },
      );
    });
  });

  describe('fail', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should mark query as failed with error', async () => {
      // Arrange
      const error: QueryLogError = {
        code: 'LLM_ERROR',
        message: 'Failed to connect to LLM',
        stack: 'Error: ...',
      };

      // Act
      await service.fail(error);

      // Assert
      expect(mockRepository.updateQueryLog).toHaveBeenCalledWith(
        mockQueryLogId,
        {
          status: 'FAILED',
          completedAt: expect.any(Date),
          error,
        },
      );
    });
  });

  describe('classification', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log classification step with LLM info', async () => {
      // Arrange
      const input = { question: 'What is AI?' };
      const output = { category: 'relevant', confidence: 0.95 };
      const llmInfo: LlmInfo = {
        model: 'openai/gpt-4o-mini',
        provider: 'openrouter',
        systemPrompt: 'You are a classifier',
        userPrompt: 'Classify this',
        promptVersion: '1.0',
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification(input, output, llmInfo);

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input,
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: expect.any(Number),
        output,
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
        },
      });
    });
  });

  describe('skillExpansion', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log skill expansion step', async () => {
      // Arrange
      const input = { skills: ['AI', 'ML'] };
      const output = {
        expandedSkills: ['artificial intelligence', 'machine learning'],
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.skillExpansion(input, output);

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
        input,
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: expect.any(Number),
        output,
      });
    });
  });

  describe('courseRetrieval', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log course retrieval step with embedding info', async () => {
      // Arrange
      const input = { skills: ['AI', 'ML'] };
      const output = { courseCount: 10 };
      const embeddingUsage: EmbeddingUsage = {
        bySkill: [
          {
            skill: 'AI',
            model: 'e5-base',
            provider: 'local',
            dimension: 768,
            embeddedText: 'artificial intelligence',
            generatedAt: new Date().toISOString(),
            promptTokens: 2,
            totalTokens: 2,
          },
          {
            skill: 'ML',
            model: 'e5-base',
            provider: 'local',
            dimension: 768,
            embeddedText: 'machine learning',
            generatedAt: new Date().toISOString(),
            promptTokens: 2,
            totalTokens: 2,
          },
        ],
        totalTokens: 4,
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'COURSE_RETRIEVAL',
        stepOrder: 4,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.courseRetrieval(input, output, embeddingUsage);

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'COURSE_RETRIEVAL',
        stepOrder: 4,
        input: { skills: ['AI', 'ML'] },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: expect.any(Number),
        output,
        embedding: {
          model: 'e5-base',
          provider: 'local',
          dimension: 768,
          totalTokens: 4,
          bySkill: embeddingUsage.bySkill,
          skillsCount: 2,
        },
      });
    });
  });

  describe('answerSynthesis', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should log answer synthesis step', async () => {
      // Arrange
      const input = { courses: [] };
      const output = { answer: 'This is the synthesized answer' };
      const llmInfo: LlmInfo = {
        model: 'openai/gpt-4o-mini',
        provider: 'openrouter',
        systemPrompt: 'Synthesize answer',
        userPrompt: 'Create answer',
        promptVersion: '1.0',
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'ANSWER_SYNTHESIS',
        stepOrder: 6,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.answerSynthesis(input, output, llmInfo);

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'ANSWER_SYNTHESIS',
        stepOrder: 6,
        input: { courses: [] },
      });
      expect(mockRepository.updateStep).toHaveBeenCalledWith(mockStepId, {
        completedAt: expect.any(Date),
        duration: expect.any(Number),
        output,
        llm: expect.objectContaining({
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
        }),
      });
    });
  });

  describe('getFullLog', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should return full query log with steps', async () => {
      // Arrange
      const mockLogWithSteps: QueryProcessLogWithSteps = {
        id: mockQueryLogId,
        status: 'COMPLETED',
        question: 'Test question',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        processSteps: [],
      };
      mockRepository.findQueryLogById.mockResolvedValue(mockLogWithSteps);

      // Act
      const result = await service.getFullLog();

      // Assert
      expect(mockRepository.findQueryLogById).toHaveBeenCalledWith(
        mockQueryLogId,
        true,
      );
      expect(result).toEqual(mockLogWithSteps);
    });
  });

  describe('getLastLog', () => {
    it('should return the last query log', async () => {
      // Arrange
      const mockLogWithSteps: QueryProcessLogWithSteps = {
        id: mockQueryLogId,
        status: 'COMPLETED',
        question: 'Last question',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        processSteps: [],
      };
      mockRepository.findLastQueryLog.mockResolvedValue(mockLogWithSteps);

      // Act
      const result =
        await QueryPipelineLoggerService.getLastLog(mockRepository);

      // Assert
      expect(mockRepository.findLastQueryLog).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockLogWithSteps);
    });
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
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should convert Map to Object for JSONB storage', async () => {
      // Arrange
      const input = { courses: new Map([['CS101', 'Intro to CS']]) };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification(input);

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: { courses: { CS101: 'Intro to CS' } },
      });
    });

    it('should handle nested Maps', async () => {
      // Arrange
      const input = {
        data: new Map([
          [
            'skills',
            new Map([
              ['AI', 0.9],
              ['ML', 0.8],
            ]),
          ],
        ]),
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification(input);

      // Assert - Outer Map and inner Map should both be converted to objects
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: {
          data: {
            skills: { AI: 0.9, ML: 0.8 },
          },
        },
      });
    });

    it('should handle undefined input', async () => {
      // Arrange
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification();

      // Assert
      expect(mockRepository.createStep).toHaveBeenCalledWith({
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: undefined,
      });
    });
  });

  describe('extractLlmInfo', () => {
    beforeEach(async () => {
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question: 'Test question',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);
      await service.start('Test question');
      jest.clearAllMocks();
    });

    it('should extract LLM info and hash system prompt', async () => {
      // Arrange
      const llmInfo: LlmInfo = {
        model: 'openai/gpt-4o-mini',
        provider: 'openrouter',
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Help me',
        promptVersion: '1.0',
        schemaName: 'MySchema',
        // schemaShape excluded - Zod schema objects contain non-serializable functions
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
      };
      const mockStep: QueryProcessStep = {
        id: mockStepId,
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(mockStep);

      // Act
      await service.classification({}, {}, llmInfo);

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
            // schemaShape excluded - Zod schema objects contain non-serializable functions
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
          },
        }),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete query logging workflow', async () => {
      // Arrange
      const question = 'What courses teach AI?';
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      const classificationStep: QueryProcessStep = {
        id: toId('step-1'),
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const expansionStep: QueryProcessStep = {
        id: toId('step-2'),
        queryLogId: mockQueryLogId,
        stepName: 'SKILL_EXPANSION',
        stepOrder: 3,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep
        .mockResolvedValueOnce(classificationStep)
        .mockResolvedValueOnce(expansionStep);

      // Act
      await service.start(question);
      await service.classification(
        { question },
        { category: 'relevant' },
        {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Classify',
          userPrompt: question,
          promptVersion: '1.0',
        },
      );
      await service.skillExpansion(
        { skills: ['AI'] },
        { expandedSkills: ['artificial intelligence'] },
        {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Expand',
          userPrompt: 'Expand AI',
          promptVersion: '1.0',
        },
      );

      // Assert
      expect(mockRepository.createQueryLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.createStep).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateStep).toHaveBeenCalledTimes(2);
    });

    it('should handle early exit workflow', async () => {
      // Arrange
      const question = 'Tell me a joke';
      const mockLog: QueryProcessLog = {
        id: mockQueryLogId,
        status: 'PENDING',
        question,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createQueryLog.mockResolvedValue(mockLog);

      const classificationStep: QueryProcessStep = {
        id: toId('step-1'),
        queryLogId: mockQueryLogId,
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.createStep.mockResolvedValue(classificationStep);

      // Act
      await service.start(question);
      await service.classification(
        { question },
        { category: 'irrelevant' },
        {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Classify',
          userPrompt: question,
          promptVersion: '1.0',
        },
      );
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
