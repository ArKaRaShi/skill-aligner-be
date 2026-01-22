import { Test, TestingModule } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

import type { LlmJudgeCourseVerdict } from '../../../schemas/schema';
import type { JudgeEvaluationInput } from '../../../types/course-relevance-filter.types';
import { CourseFilterJudgeEvaluator } from '../../course-filter-judge.evaluator';

describe('CourseFilterJudgeEvaluator', () => {
  let evaluator: CourseFilterJudgeEvaluator;
  let llmRouter: jest.Mocked<ILlmRouterService>;

  // Test data factories
  const createTestCourse = (
    code: string,
    name: string,
    outcomes: string[] = ['Learn fundamental concepts'],
  ) => ({
    code,
    name,
    outcomes,
  });

  const createTestInput = (
    overrides: Partial<JudgeEvaluationInput> = {},
  ): JudgeEvaluationInput => ({
    question: 'What courses teach Python programming?',
    courses: [
      createTestCourse('CS101', 'Introduction to Python', [
        'Learn Python basics',
        'Write simple programs',
      ]),
    ],
    ...overrides,
  });

  const createLlmCourseVerdict = (
    overrides: Partial<LlmJudgeCourseVerdict> = {},
  ): LlmJudgeCourseVerdict => ({
    code: 'CS101',
    verdict: 'PASS',
    reason: 'Direct match - teaches Python programming',
    ...overrides,
  });

  const createLlmResult = (
    courses: LlmJudgeCourseVerdict[],
    model: string = 'gpt-4.1-mini',
  ) => ({
    model,
    provider: 'openai' as const,
    inputTokens: 100,
    outputTokens: 50,
    object: {
      courses,
    },
    finishReason: 'stop' as const,
    warnings: [] as Array<unknown>,
    providerMetadata: {},
    response: { timestamp: new Date() },
    hyperParameters: {},
  });

  beforeEach(async () => {
    const mockLlmRouter = {
      generateText: jest.fn(),
      streamText: jest.fn(),
      generateObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseFilterJudgeEvaluator,
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
      ],
    }).compile();

    evaluator = module.get<CourseFilterJudgeEvaluator>(
      CourseFilterJudgeEvaluator,
    );
    llmRouter = mockLlmRouter as jest.Mocked<ILlmRouterService>;
  });

  describe('evaluate', () => {
    it('should evaluate single course and return PASS verdict', async () => {
      // Arrange
      const input = createTestInput();
      const llmVerdicts = [
        createLlmCourseVerdict({
          code: 'CS101',
          verdict: 'PASS',
          reason: 'Direct match - teaches Python programming',
        }),
      ];
      llmRouter.generateObject.mockResolvedValue(createLlmResult(llmVerdicts));

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith({
        prompt: expect.stringContaining('What courses teach Python'),
        systemPrompt: expect.stringContaining(
          'You will be given a User Question',
        ),
        model: 'gpt-4.1-mini',
        schema: expect.any(Object),
        timeout: 60_000,
      });
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]).toEqual({
        code: 'CS101',
        verdict: 'PASS',
        reason: 'Direct match - teaches Python programming',
      });
    });

    it('should evaluate multiple courses with mixed verdicts', async () => {
      // Arrange
      const input = createTestInput({
        courses: [
          createTestCourse('CS101', 'Introduction to Python', [
            'Learn Python basics',
          ]),
          createTestCourse('ENG101', 'Creative Writing', [
            'Write fiction stories',
          ]),
        ],
      });
      const llmVerdicts = [
        createLlmCourseVerdict({
          code: 'CS101',
          verdict: 'PASS',
          reason: 'Direct match for Python',
        }),
        createLlmCourseVerdict({
          code: 'ENG101',
          verdict: 'FAIL',
          reason: 'Irrelevant - no connection to programming',
        }),
      ];
      llmRouter.generateObject.mockResolvedValue(createLlmResult(llmVerdicts));

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.courses).toHaveLength(2);
      expect(result.courses[0].verdict).toBe('PASS');
      expect(result.courses[1].verdict).toBe('FAIL');
    });

    it('should format courses as JSON in prompt', async () => {
      // Arrange
      const input = createTestInput({
        courses: [
          createTestCourse('CS101', 'Python Programming', [
            'Learn Python syntax',
            'Build applications',
          ]),
        ],
      });
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createLlmCourseVerdict()]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert
      const promptArg = llmRouter.generateObject.mock.calls[0][0];
      expect(promptArg.prompt).toContain('CS101');
      expect(promptArg.prompt).toContain('Python Programming');
      expect(promptArg.prompt).toContain('Learn Python syntax');
      expect(promptArg.prompt).toContain('Build applications');
    });

    it('should use correct system prompt', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createLlmCourseVerdict()]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('EVALUATION CRITERIA'),
        }),
      );
    });

    it('should validate schema with correct min/max counts', async () => {
      // Arrange
      const input = createTestInput({
        courses: [
          createTestCourse('CS101', 'Course 1'),
          createTestCourse('CS102', 'Course 2'),
          createTestCourse('CS103', 'Course 3'),
        ],
      });
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([
          createLlmCourseVerdict({ code: 'CS101' }),
          createLlmCourseVerdict({ code: 'CS102' }),
          createLlmCourseVerdict({ code: 'CS103' }),
        ]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert - schema should be created with min=3, max=3
      const schemaArg = llmRouter.generateObject.mock.calls[0][0];
      expect(schemaArg.schema).toBeDefined();
    });

    it('should handle empty courses array', async () => {
      // Arrange
      const input = createTestInput({ courses: [] });
      llmRouter.generateObject.mockResolvedValue(createLlmResult([]));

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.courses).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error when LLM call fails', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockRejectedValue(new Error('LLM API error'));

      // Act & Assert
      await expect(evaluator.evaluate(input)).rejects.toThrow('LLM API error');
    });

    it('should handle timeout from LLM service', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(evaluator.evaluate(input)).rejects.toThrow(
        'Request timeout',
      );
    });
  });
});
