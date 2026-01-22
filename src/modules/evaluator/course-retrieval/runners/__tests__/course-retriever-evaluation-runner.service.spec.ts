import { Test, TestingModule } from '@nestjs/testing';

import { FileHelper } from 'src/shared/utils/file';

import { CourseRetrieverEvaluator } from '../../evaluators/course-retriever.evaluator';
import { EvaluationResultManagerService } from '../../evaluators/evaluation-result-manager.service';
import {
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
} from '../../types/course-retrieval.types';
import { CourseRetrieverEvaluatorOutput } from '../../types/type';
import { CourseRetrieverEvaluationRunnerService } from '../course-retriever-evaluation-runner.service';

// Mock @toon-format/toon to avoid ESM import issues
jest.mock('@toon-format/toon', () => ({
  encode: jest.fn((data: unknown) => JSON.stringify(data)),
}));

// Mock FileHelper
jest.mock('src/shared/utils/file', () => ({
  FileHelper: {
    saveJson: jest.fn().mockResolvedValue(undefined),
    saveLatestJson: jest.fn().mockResolvedValue(undefined),
    appendToJsonArray: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('CourseRetrieverEvaluationRunnerService', () => {
  let runner: CourseRetrieverEvaluationRunnerService;
  let mockEvaluator: jest.Mocked<CourseRetrieverEvaluator>;
  let mockResultManager: jest.Mocked<EvaluationResultManagerService>;
  let mockFileHelper: jest.Mocked<typeof FileHelper>;

  // Test data factories
  const createTestInput = (
    overrides: Partial<EvaluateRetrieverInput> = {},
  ): EvaluateRetrieverInput => ({
    question: 'What courses should I take to learn Python programming?',
    skill: 'Python programming',
    retrievedCourses: [
      {
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        cleanedLearningOutcomes: ['Learn Python basics', 'Understand syntax'],
      },
      {
        subjectCode: 'CS102',
        subjectName: 'Advanced Python',
        cleanedLearningOutcomes: ['Advanced Python concepts', 'OOP in Python'],
      },
    ],
    ...overrides,
  });

  const createEvaluatorOutput = (
    overrides: Partial<CourseRetrieverEvaluatorOutput> = {},
  ): CourseRetrieverEvaluatorOutput => ({
    question: 'What courses should I take to learn Python programming?',
    skill: 'Python programming',
    evaluations: [
      {
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        skillRelevance: 3,
        skillReason: 'Direct skill match',
        contextAlignment: 2,
        contextReason: 'Good alignment',
      },
      {
        subjectCode: 'CS102',
        subjectName: 'Advanced Python',
        skillRelevance: 2,
        skillReason: 'Related skill',
        contextAlignment: 1,
        contextReason: 'Some alignment',
      },
    ],
    metrics: {
      averageSkillRelevance: 2.5,
      skillRelevanceDistribution: [
        { relevanceScore: 3, count: 1, percentage: 50 },
        { relevanceScore: 2, count: 1, percentage: 50 },
      ],
      averageContextAlignment: 1.5,
      contextAlignmentDistribution: [
        { relevanceScore: 2, count: 1, percentage: 50 },
        { relevanceScore: 1, count: 1, percentage: 50 },
      ],
      alignmentGap: 1.0,
      contextMismatchRate: 50.0,
      contextMismatchCourses: [
        {
          subjectCode: 'CS102',
          subjectName: 'Advanced Python',
          skillRelevance: 2,
          skillReason: 'Related skill',
          contextAlignment: 1,
          contextReason: 'Some alignment',
        },
      ],
    },
    llmInfo: {
      model: 'gpt-4',
      provider: 'openai',
      inputTokens: 500,
      outputTokens: 200,
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      promptVersion: '1.0',
      schemaName: 'schema',
      finishReason: 'stop',
      warnings: [],
      providerMetadata: {},
      response: { timestamp: new Date(), modelId: 'gpt-4' },
      hyperParameters: {},
    },
    llmTokenUsage: {
      model: 'gpt-4',
      inputTokens: 500,
      outputTokens: 200,
    },
    llmCostEstimateSummary: {
      totalEstimatedCost: 0.003,
      details: [],
    },
    ...overrides,
  });

  const createTestOutput = (
    overrides: Partial<EvaluateRetrieverOutput> = {},
  ): EvaluateRetrieverOutput => ({
    testCaseId: 'test-1',
    question: 'What courses should I take to learn Python programming?',
    skill: 'Python programming',
    retrievedCount: 2,
    evaluations: [
      {
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        skillRelevance: 3,
        contextAlignment: 2,
        skillReason: 'Direct skill match',
        contextReason: 'Good alignment',
      },
      {
        subjectCode: 'CS102',
        subjectName: 'Advanced Python',
        skillRelevance: 2,
        contextAlignment: 1,
        skillReason: 'Related skill',
        contextReason: 'Some alignment',
      },
    ],
    metrics: {
      averageSkillRelevance: 2.5,
      averageContextAlignment: 1.5,
      alignmentGap: 1.0,
      contextMismatchRate: 50.0,
      contextMismatchCourses: [
        {
          subjectCode: 'CS102',
          subjectName: 'Advanced Python',
          skillRelevance: 2,
          contextAlignment: 1,
        },
      ],
    },
    llmModel: 'gpt-4',
    llmProvider: 'openai',
    inputTokens: 500,
    outputTokens: 200,
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock evaluator and result manager
    mockEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<CourseRetrieverEvaluator>;

    mockResultManager = {
      calculateIterationMetrics: jest.fn(),
      ensureDirectoryStructure: jest.fn(),
      extractContextMismatches: jest.fn(),
      saveContextMismatches: jest.fn(),
      saveIterationMetrics: jest.fn(),
      saveIterationRecords: jest.fn(),
      saveTestCaseMetrics: jest.fn(),
    } as unknown as jest.Mocked<EvaluationResultManagerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRetrieverEvaluationRunnerService,
        {
          provide: CourseRetrieverEvaluator,
          useValue: mockEvaluator,
        },
        {
          provide: EvaluationResultManagerService,
          useValue: mockResultManager,
        },
      ],
    }).compile();

    runner = module.get<CourseRetrieverEvaluationRunnerService>(
      CourseRetrieverEvaluationRunnerService,
    );

    mockFileHelper = FileHelper as jest.Mocked<typeof FileHelper>;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runEvaluator', () => {
    it('should execute evaluator and return results', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      const context = { iterationNumber: 1 };

      // Act
      const result = await runner.runEvaluator(context, input);

      // Assert
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith({
        question: input.question,
        skill: input.skill,
        retrievedCourses: input.retrievedCourses,
      });
      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(1);
      expect(result.question).toBe(input.question);
      expect(result.skill).toBe(input.skill);
      expect(result.retrievedCount).toBe(input.retrievedCourses.length);
    });

    it('should save results after evaluator execution', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      const context = { iterationNumber: 1 };
      const saveResultsSpy = jest.spyOn(runner, 'saveResults');

      // Act
      await runner.runEvaluator(context, input);

      // Assert
      expect(saveResultsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          question: input.question,
          skill: input.skill,
        }),
        expect.any(Number),
        context,
      );
    });

    it('should pass correct parameters to evaluator', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      const context = { iterationNumber: 5, prefixDir: 'experiment-a' };

      // Act
      await runner.runEvaluator(context, input);

      // Assert
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith({
        question: input.question,
        skill: input.skill,
        retrievedCourses: input.retrievedCourses,
      });
    });

    it('should handle context without iteration number', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      const context = { prefixDir: 'baseline' };

      // Act
      const result = await runner.runEvaluator(context, input);

      // Assert
      expect(result.question).toBe(input.question);
      expect(result.skill).toBe(input.skill);
    });

    it('should handle empty context', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      // Act
      const result = await runner.runEvaluator({}, input);

      // Assert
      expect(result.question).toBe(input.question);
      expect(result.skill).toBe(input.skill);
    });

    it('should handle evaluator output with no context mismatches', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput({
        metrics: {
          averageSkillRelevance: 3.0,
          skillRelevanceDistribution: [
            { relevanceScore: 3, count: 2, percentage: 100 },
          ],
          averageContextAlignment: 3.0,
          contextAlignmentDistribution: [
            { relevanceScore: 3, count: 2, percentage: 100 },
          ],
          alignmentGap: 0.0,
          contextMismatchRate: 0.0,
          contextMismatchCourses: [],
        },
      });
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      // Act
      const result = await runner.runEvaluator({}, input);

      // Assert
      expect(result.metrics.contextMismatchCourses).toHaveLength(0);
    });
  });

  describe('saveResults', () => {
    it('should save results with timestamped filename', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 1500;
      const context = { iterationNumber: 1 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.saveJson).toHaveBeenCalledWith(
        expect.stringContaining('evaluation-'),
        expect.objectContaining({
          ...output,
          evaluationMetadata: expect.objectContaining({
            duration,
            iterationNumber: 1,
          }),
        }),
      );
    });

    it('should save latest evaluation file', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 1500;
      const context = { iterationNumber: 1 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.saveLatestJson).toHaveBeenCalledWith(
        expect.stringContaining('latest.json'),
        expect.objectContaining({
          ...output,
          evaluationMetadata: expect.objectContaining({
            duration,
          }),
        }),
      );
    });

    it('should save context mismatches when they exist', async () => {
      // Arrange
      const output = createTestOutput({
        metrics: {
          averageSkillRelevance: 2.5,
          averageContextAlignment: 1.5,
          alignmentGap: 1.0,
          contextMismatchRate: 50.0,
          contextMismatchCourses: [
            {
              subjectCode: 'CS102',
              subjectName: 'Advanced Python',
              skillRelevance: 2,
              contextAlignment: 1,
            },
          ],
        },
      });
      const duration = 1500;
      const context = { iterationNumber: 1 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.appendToJsonArray).toHaveBeenCalledWith(
        expect.stringContaining('context-mismatches.json'),
        expect.objectContaining({
          question: output.question,
          skill: output.skill,
          mismatches: output.metrics.contextMismatchCourses,
          iterationNumber: 1,
        }),
      );
    });

    it('should not save context mismatches when none exist', async () => {
      // Arrange
      const output = createTestOutput({
        metrics: {
          averageSkillRelevance: 3.0,
          averageContextAlignment: 3.0,
          alignmentGap: 0.0,
          contextMismatchRate: 0.0,
          contextMismatchCourses: [],
        },
      });
      const duration = 1500;
      const context = { iterationNumber: 1 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.appendToJsonArray).not.toHaveBeenCalled();
    });

    it('should include evaluation metadata in saved output', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 2500;
      const context = { iterationNumber: 3, prefixDir: 'exp-1' };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.saveJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          evaluationMetadata: expect.objectContaining({
            duration,
            iterationNumber: 3,
            prefixDir: 'exp-1',
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should build correct path with iteration number', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 1500;
      const context = { iterationNumber: 2 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.saveJson).toHaveBeenCalledWith(
        expect.stringContaining('iteration-2'),
        expect.any(Object),
      );
    });

    it('should build correct path with prefix directory', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 1500;
      const context = { prefixDir: 'baseline-test' };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      expect(mockFileHelper.saveJson).toHaveBeenCalledWith(
        expect.stringContaining('baseline-test'),
        expect.any(Object),
      );
    });

    it('should build correct path with both prefix and iteration', async () => {
      // Arrange
      const output = createTestOutput();
      const duration = 1500;
      const context = { prefixDir: 'experiment-a', iterationNumber: 5 };

      // Act
      await runner.saveResults(output, duration, context);

      // Assert
      const savedPath = (mockFileHelper.saveJson as jest.Mock).mock.calls[0][0];
      expect(savedPath).toContain('experiment-a');
      expect(savedPath).toContain('iteration-5');
    });
  });

  describe('getBaseDir', () => {
    it('should return the base directory path', () => {
      // Act
      const baseDir = runner.getBaseDir();

      // Assert
      expect(baseDir).toBe('data/evaluation/course-retriever');
    });

    it('should return consistent base directory', () => {
      // Act
      const baseDir1 = runner.getBaseDir();
      const baseDir2 = runner.getBaseDir();

      // Assert
      expect(baseDir1).toBe(baseDir2);
    });
  });

  describe('Integration: IRunEvaluator Contract', () => {
    it('should implement all required contract methods', () => {
      // Assert
      expect(typeof runner.runEvaluator).toBe('function');
      expect(typeof runner.saveResults).toBe('function');
      expect(typeof runner.getBaseDir).toBe('function');
    });

    it('should support generic type parameters for different evaluator types', () => {
      // This test documents that IRunEvaluator is generic
      // CourseRetrieverEvaluationRunnerService implements:
      // IRunEvaluator<EvaluateRetrieverInput, EvaluateRetrieverOutput, CourseRetrieverEvaluationContext>
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle output with no courses retrieved', async () => {
      // Arrange
      const input = createTestInput({
        retrievedCourses: [],
      });
      const evaluatorOutput = createEvaluatorOutput({
        evaluations: [],
      });
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      // Act
      const result = await runner.runEvaluator({}, input);

      // Assert
      expect(result.retrievedCount).toBe(0);
      expect(result.evaluations).toHaveLength(0);
    });

    it('should handle output with single course', async () => {
      // Arrange
      const input = createTestInput({
        retrievedCourses: [
          {
            subjectCode: 'CS101',
            subjectName: 'Intro to Python',
            cleanedLearningOutcomes: ['Learn Python'],
          },
        ],
      });
      const evaluatorOutput = createEvaluatorOutput({
        evaluations: [
          {
            subjectCode: 'CS101',
            subjectName: 'Intro to Python',
            skillRelevance: 3,
            contextAlignment: 3,
            skillReason: 'Perfect match',
            contextReason: 'Perfect alignment',
          },
        ],
      });
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);

      // Act
      const result = await runner.runEvaluator({}, input);

      // Assert
      expect(result.retrievedCount).toBe(1);
      expect(result.evaluations).toHaveLength(1);
    });

    it('should handle high context mismatch rate', async () => {
      // Arrange
      const output = createTestOutput({
        metrics: {
          averageSkillRelevance: 3.0,
          averageContextAlignment: 0.5,
          alignmentGap: 2.5,
          contextMismatchRate: 100.0,
          contextMismatchCourses: [
            {
              subjectCode: 'CS101',
              subjectName: 'Course 1',
              skillRelevance: 3,
              contextAlignment: 0,
            },
            {
              subjectCode: 'CS102',
              subjectName: 'Course 2',
              skillRelevance: 3,
              contextAlignment: 1,
            },
          ],
        },
      });
      const duration = 1500;

      // Act
      await runner.saveResults(output, duration, {});

      // Assert
      expect(mockFileHelper.appendToJsonArray).toHaveBeenCalled();
      const savedEntry = (mockFileHelper.appendToJsonArray as jest.Mock).mock
        .calls[0][1];
      expect(savedEntry.mismatches).toHaveLength(2);
    });
  });

  describe('Logging', () => {
    it('should log evaluation start with question and skill', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);
      const loggerSpy = jest.spyOn(runner['logger'], 'log');

      // Act
      await runner.runEvaluator({}, input);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting evaluation'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(input.question),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(input.skill),
      );
    });

    it('should log retrieved courses count', async () => {
      // Arrange
      const input = createTestInput({
        retrievedCourses: [
          {
            subjectCode: 'CS101',
            subjectName: 'Test',
            cleanedLearningOutcomes: [],
          },
          {
            subjectCode: 'CS102',
            subjectName: 'Test2',
            cleanedLearningOutcomes: [],
          },
          {
            subjectCode: 'CS103',
            subjectName: 'Test3',
            cleanedLearningOutcomes: [],
          },
        ],
      });
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);
      const loggerSpy = jest.spyOn(runner['logger'], 'log');

      // Act
      await runner.runEvaluator({}, input);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrieved courses: 3'),
      );
    });

    it('should log iteration number when provided', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);
      const loggerSpy = jest.spyOn(runner['logger'], 'log');

      // Act
      await runner.runEvaluator({ iterationNumber: 5 }, input);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Iteration: 5'),
      );
    });

    it('should log evaluation completion with duration', async () => {
      // Arrange
      const input = createTestInput();
      const evaluatorOutput = createEvaluatorOutput();
      mockEvaluator.evaluate.mockResolvedValue(evaluatorOutput);
      const loggerSpy = jest.spyOn(runner['logger'], 'log');

      // Act
      await runner.runEvaluator({}, input);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Evaluation completed in \d+ms/),
      );
    });
  });
});
