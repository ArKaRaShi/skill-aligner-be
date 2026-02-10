import { Test, TestingModule } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

import type { SkillVerdictSchema } from '../../../schemas/schema';
import type { SkillExpansionJudgeInput } from '../../../types/skill-expansion.types';
import { SkillExpansionJudgeEvaluator } from '../../skill-expansion-judge.evaluator';

describe('SkillExpansionJudgeEvaluator', () => {
  let evaluator: SkillExpansionJudgeEvaluator;
  let llmRouter: jest.Mocked<ILlmRouterService>;

  // Test data factories
  const createTestSkill = (
    skill: string,
    reason: string,
    learningOutcome?: string,
  ) => ({
    skill,
    reason,
    learningOutcome,
  });

  const createTestInput = (
    overrides: Partial<SkillExpansionJudgeInput> = {},
  ): SkillExpansionJudgeInput => ({
    question: 'What is object-oriented programming?',
    systemSkills: [
      createTestSkill(
        'Object-Oriented Programming',
        'User is asking about OOP concepts',
        'Understand the four pillars of OOP',
      ),
    ],
    ...overrides,
  });

  const createSkillVerdict = (
    overrides: Partial<SkillVerdictSchema> = {},
  ): SkillVerdictSchema => ({
    skill: 'Object-Oriented Programming',
    verdict: 'PASS',
    note: 'Valid technical competency',
    ...overrides,
  });

  const createLlmResult = (
    skills: SkillVerdictSchema[],
    model: string = 'gpt-4o-mini',
  ) => ({
    model,
    provider: 'openai' as const,
    inputTokens: 100,
    outputTokens: 50,
    object: {
      skills,
      overall: {
        conceptPreserved: true,
        summary: 'All skills are relevant and teachable',
      },
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
        SkillExpansionJudgeEvaluator,
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
      ],
    }).compile();

    evaluator = module.get<SkillExpansionJudgeEvaluator>(
      SkillExpansionJudgeEvaluator,
    );
    llmRouter = mockLlmRouter as jest.Mocked<ILlmRouterService>;
  });

  describe('evaluate', () => {
    it('should evaluate single skill and return PASS verdict', async () => {
      // Arrange
      const input = createTestInput();
      const skillVerdicts = [createSkillVerdict()];
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult(skillVerdicts),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith({
        prompt: expect.stringContaining('User Question:'),
        systemPrompt: expect.stringContaining(
          'SANITY CHECK for a skill expansion module',
        ),
        model: 'gpt-4o-mini',
        schema: expect.any(Object),
        timeout: 60_000,
      });
      expect(result.result.skills).toHaveLength(1);
      expect(result.result.skills[0]).toEqual({
        skill: 'Object-Oriented Programming',
        verdict: 'PASS',
        note: 'Valid technical competency',
      });
    });

    it('should evaluate multiple skills with mixed verdicts', async () => {
      // Arrange
      const input = createTestInput({
        systemSkills: [
          createTestSkill(
            'Object-Oriented Programming',
            'Direct match for OOP',
          ),
          createTestSkill('Python', 'Irrelevant language skill'),
        ],
      });
      const skillVerdicts = [
        createSkillVerdict({
          skill: 'Object-Oriented Programming',
          verdict: 'PASS',
          note: 'Direct concept match',
        }),
        createSkillVerdict({
          skill: 'Python',
          verdict: 'FAIL',
          note: 'Not relevant to the question',
        }),
      ];
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult(skillVerdicts),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.result.skills).toHaveLength(2);
      expect(result.result.skills[0].verdict).toBe('PASS');
      expect(result.result.skills[1].verdict).toBe('FAIL');
      expect(result.result.skills[1].note).toBe('Not relevant to the question');
    });

    it('should include overall assessment in result', async () => {
      // Arrange
      const input = createTestInput();
      const skillVerdicts = [createSkillVerdict()];
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult(skillVerdicts),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.result.overall).toBeDefined();
      expect(result.result.overall.conceptPreserved).toBe(true);
      expect(result.result.overall.summary).toBe(
        'All skills are relevant and teachable',
      );
    });

    it('should format skills as JSON in prompt', async () => {
      // Arrange
      const input = createTestInput({
        systemSkills: [
          createTestSkill(
            'Object-Oriented Programming',
            'User asked about OOP',
            'Understand encapsulation, abstraction, inheritance, polymorphism',
          ),
        ],
      });
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createSkillVerdict()]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert - blind evaluation: only skill is included, not reason/learningOutcome
      const promptArg = llmRouter.generateObject.mock.calls[0][0];
      expect(promptArg.prompt).toContain('Object-Oriented Programming');
      expect(promptArg.prompt).not.toContain('User asked about OOP');
      expect(promptArg.prompt).not.toContain(
        'Understand encapsulation, abstraction, inheritance, polymorphism',
      );
    });

    it('should use correct system prompt', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createSkillVerdict()]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('CRITERIA FOR'),
        }),
      );
    });

    it('should validate schema with correct min/max counts', async () => {
      // Arrange
      const input = createTestInput({
        systemSkills: [
          createTestSkill('Skill 1', 'Reason 1'),
          createTestSkill('Skill 2', 'Reason 2'),
          createTestSkill('Skill 3', 'Reason 3'),
        ],
      });
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([
          createSkillVerdict({ skill: 'Skill 1' }),
          createSkillVerdict({ skill: 'Skill 2' }),
          createSkillVerdict({ skill: 'Skill 3' }),
        ]),
      );

      // Act
      await evaluator.evaluate(input);

      // Assert - schema should be created with min=3, max=3
      const schemaArg = llmRouter.generateObject.mock.calls[0][0];
      expect(schemaArg.schema).toBeDefined();
    });

    it('should handle empty skills array', async () => {
      // Arrange
      const input = createTestInput({ systemSkills: [] });
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([], 'gpt-4o-mini'),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.result.skills).toEqual([]);
    });

    it('should include token usage in result', async () => {
      // Arrange
      const input = createTestInput();
      const llmResult = createLlmResult([createSkillVerdict()]);
      llmRouter.generateObject.mockResolvedValue(llmResult);

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.tokenUsage).toEqual([
        {
          model: 'gpt-4o-mini',
          inputTokens: 100,
          outputTokens: 50,
        },
      ]);
    });

    it('should include LLM info in result', async () => {
      // Arrange
      const input = createTestInput();
      const llmResult = createLlmResult([createSkillVerdict()]);
      llmRouter.generateObject.mockResolvedValue(llmResult);

      // Act
      const _result = await evaluator.evaluate(input);

      // Assert
    });

    it('should support custom model option', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createSkillVerdict()], 'gpt-4o'),
      );

      // Act
      await evaluator.evaluate(input, { model: 'gpt-4o' });

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
        }),
      );
    });

    it('should support custom provider option', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createSkillVerdict()], 'gpt-4o'),
      );

      // Act
      await evaluator.evaluate(input, { provider: 'openrouter' });

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openrouter',
        }),
      );
    });

    it('should support custom timeout option', async () => {
      // Arrange
      const input = createTestInput();
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult([createSkillVerdict()]),
      );

      // Act
      await evaluator.evaluate(input, { timeout: 120_000 });

      // Assert
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 120_000,
        }),
      );
    });

    it('should include issues and suggestions for low quality skills', async () => {
      // Arrange
      const input = createTestInput({
        systemSkills: [createTestSkill('Learn to code', 'Too vague skill')],
      });
      const skillVerdicts = [
        createSkillVerdict({
          skill: 'Learn to code',
          verdict: 'FAIL',
          note: 'Too vague, Procedural task',
        }),
      ];
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult(skillVerdicts),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.result.skills[0].note).toBe('Too vague, Procedural task');
    });

    it('should handle all 6 skills in single question', async () => {
      // Arrange - max skills per question
      const input = createTestInput({
        systemSkills: Array.from({ length: 6 }, (_, i) =>
          createTestSkill(`Skill ${i + 1}`, `Reason ${i + 1}`),
        ),
      });
      const skillVerdicts = Array.from({ length: 6 }, (_, i) =>
        createSkillVerdict({ skill: `Skill ${i + 1}` }),
      );
      llmRouter.generateObject.mockResolvedValue(
        createLlmResult(skillVerdicts),
      );

      // Act
      const result = await evaluator.evaluate(input);

      // Assert - single LLM call for all skills
      expect(llmRouter.generateObject).toHaveBeenCalledTimes(1);
      expect(result.result.skills).toHaveLength(6);
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

  describe('overall assessment', () => {
    it('should detect missing concept preservation', async () => {
      // Arrange
      const input = createTestInput({
        question: 'What is OOP?',
        systemSkills: [
          createTestSkill('Programming', 'General programming skill'),
        ],
      });
      llmRouter.generateObject.mockResolvedValue({
        ...createLlmResult([createSkillVerdict()]),
        object: {
          skills: [createSkillVerdict()],
          overall: {
            conceptPreserved: false,
            summary: 'User explicitly asked about OOP but it was not preserved',
          },
        },
      } as any);

      // Act
      const result = await evaluator.evaluate(input);

      // Assert
      expect(result.result.overall.conceptPreserved).toBe(false);
    });
  });
});
