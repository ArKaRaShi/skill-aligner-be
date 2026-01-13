import { Test } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { AnswerSynthesisPromptVersion } from 'src/modules/query-processor/prompts/answer-synthesis';
import { AggregatedCourseSkills } from 'src/modules/query-processor/types/course-aggregation.type';
import { QueryProfile } from 'src/modules/query-processor/types/query-profile.type';

import { AnswerSynthesisService } from '../answer-synthesis.service';

// Mock @toon-format/toon to avoid ESM import issues
jest.mock('@toon-format/toon', () => ({
  encode: jest.fn((data: unknown) => JSON.stringify(data)),
}));

describe('AnswerSynthesisService', () => {
  let service: AnswerSynthesisService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  const testModelName = 'test-model';
  const testPromptVersion: AnswerSynthesisPromptVersion = 'v1';

  // Helper to create test query profile
  const createTestQueryProfile = (
    overrides: Partial<QueryProfile> = {},
  ): QueryProfile => ({
    language: 'en',
    tokenUsage: {
      model: testModelName,
      inputTokens: 100,
      outputTokens: 50,
    },
    ...overrides,
  });

  // Helper to create test course
  const createTestCourse = (
    subjectCode: string,
    subjectName: string,
  ): AggregatedCourseSkills => {
    const learningOutcome = {
      loId: 'lo1' as Identifier,
      cleanedName: 'Understand programming concepts',
      originalName: 'Understand programming concepts',
      skipEmbedding: false,
      hasEmbedding768: true,
      hasEmbedding1536: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      similarityScore: 0.85,
    };
    return {
      id: 'course-1' as Identifier,
      campusId: 'campus-1' as Identifier,
      facultyId: 'faculty-1' as Identifier,
      subjectCode,
      subjectName,
      isGenEd: false,
      courseLearningOutcomes: [learningOutcome],
      courseOfferings: [],
      courseClickLogs: [],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      matchedSkills: [
        {
          skill: 'Python Programming',
          learningOutcomes: [learningOutcome],
        },
      ],
      relevanceScore: 3,
    };
  };

  beforeEach(async () => {
    const mockLlmRouter = {
      generateText: jest.fn(),
      generateObject: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AnswerSynthesisService,
          inject: [I_LLM_ROUTER_SERVICE_TOKEN],
          useFactory: (llmRouterService: ILlmRouterService) => {
            return new AnswerSynthesisService(llmRouterService, testModelName);
          },
        },
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
      ],
    }).compile();

    service = module.get(AnswerSynthesisService);
    llmRouter = module.get(I_LLM_ROUTER_SERVICE_TOKEN);

    jest.clearAllMocks();
  });

  describe('synthesizeAnswer', () => {
    it('should call LLM with generated context and return answer', async () => {
      // Given
      const question = 'What courses cover Python programming?';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [
        createTestCourse('CS101', 'Python Basics'),
      ];

      const mockAnswer =
        'Based on your interest in Python programming, I recommend CS101 which covers fundamental programming concepts.';

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: mockAnswer,
        model: testModelName,
        inputTokens: 150,
        outputTokens: 80,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(llmRouter.generateText).toHaveBeenCalledWith({
        prompt: expect.stringContaining(question),
        systemPrompt: expect.any(String),
        model: testModelName,
      });

      expect(result.answerText).toBe(mockAnswer);
      expect(result.question).toBe(question);

      expect(result.tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 150,
        outputTokens: 80,
      });

      expect(result.llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 150,
        outputTokens: 80,
        promptVersion: testPromptVersion,
        finishReason: 'stop',
        warnings: [],
      });
    });

    it('should build context with course skills and query profile', async () => {
      // Given
      const question = 'What courses for web development?';
      const queryProfile = createTestQueryProfile({
        language: 'en',
      });
      const aggregatedCourseSkills = [
        createTestCourse('CS201', 'Web Development'),
        createTestCourse('CS202', 'Frontend Programming'),
      ];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Recommended courses: CS201, CS202',
        model: testModelName,
        inputTokens: 200,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify context contains course information
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Courses with skills:');
      expect(callArgs.prompt).toContain('Language:');

      // Verify snake_case transformation in context
      expect(callArgs.prompt).toContain('subject_name'); // transformed from subjectName
      expect(callArgs.prompt).toContain('subject_code'); // transformed from subjectCode
      expect(callArgs.prompt).toContain('relevance_score'); // relevance score is included
      expect(callArgs.prompt).toContain('matched_skills_and_learning_outcomes'); // transformed from matchedSkills
      expect(callArgs.prompt).toContain('learning_outcome_name'); // transformed from cleanedName
    });

    it('should handle empty aggregated course skills', async () => {
      // Given
      const question = 'Tell me about the curriculum';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills: AggregatedCourseSkills[] = [];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'I cannot find specific courses matching your request.',
        model: testModelName,
        inputTokens: 50,
        outputTokens: 30,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(result.answerText).toBe(
        'I cannot find specific courses matching your request.',
      );
      expect(result.tokenUsage.inputTokens).toBe(50);
      expect(result.tokenUsage.outputTokens).toBe(30);
    });

    it('should build correct TokenUsage and LlmInfo with all metadata', async () => {
      // Given
      const question = 'Test question';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Test Course')];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Test answer',
        model: testModelName,
        inputTokens: 100,
        outputTokens: 75,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: ['Model warning'],
        providerMetadata: { key: 'value' },
        response: { timestamp: new Date() },
        hyperParameters: { temperature: 0.5 },
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then: Verify TokenUsage
      expect(result.tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 100,
        outputTokens: 75,
      });

      // Then: Verify LlmInfo
      expect(result.llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 100,
        outputTokens: 75,
        promptVersion: testPromptVersion,
        schemaName: undefined,
        finishReason: 'stop',
        warnings: ['Model warning'],
      });
      expect(result.llmInfo.providerMetadata).toEqual({ key: 'value' });
      expect(result.llmInfo.response).toBeDefined();
      expect(result.llmInfo.hyperParameters).toEqual({ temperature: 0.5 });
    });

    it('should handle multiple courses with multiple skills', async () => {
      // Given
      const question = 'What skills for full stack development?';
      const queryProfile = createTestQueryProfile();

      const course1 = createTestCourse('CS201', 'Web Development');
      course1.matchedSkills.push({
        skill: 'JavaScript',
        learningOutcomes: [
          {
            loId: 'lo2' as Identifier,
            cleanedName: 'DOM manipulation',
            originalName: 'DOM manipulation',
            skipEmbedding: false,
            hasEmbedding768: true,
            hasEmbedding1536: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            similarityScore: 0.9,
          },
        ],
      });

      const course2 = createTestCourse('CS301', 'Backend Development');
      course2.matchedSkills.push({
        skill: 'Node.js',
        learningOutcomes: [
          {
            loId: 'lo3' as Identifier,
            cleanedName: 'REST API design',
            originalName: 'REST API design',
            skipEmbedding: false,
            hasEmbedding768: true,
            hasEmbedding1536: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            similarityScore: 0.88,
          },
        ],
      });

      const aggregatedCourseSkills = [course1, course2];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'For full stack development, take CS201 and CS301.',
        model: testModelName,
        inputTokens: 250,
        outputTokens: 60,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then: Verify context contains both courses and all skills
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('CS201');
      expect(callArgs.prompt).toContain('CS301');
      expect(callArgs.prompt).toContain('Python Programming');
      expect(callArgs.prompt).toContain('JavaScript');
      expect(callArgs.prompt).toContain('Node.js');

      expect(result.answerText).toBe(
        'For full stack development, take CS201 and CS301.',
      );
    });

    it('should use generateText instead of generateObject (no schema validation)', async () => {
      // Given
      const question = 'Test question';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Test')];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Test answer',
        model: testModelName,
        inputTokens: 50,
        outputTokens: 25,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify generateText is used (not generateObject)
      expect(llmRouter.generateText).toHaveBeenCalled();
      expect(llmRouter.generateObject).not.toHaveBeenCalled();

      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('schema');
    });

    it('should preserve the question in the result', async () => {
      // Given
      const question = 'What AI courses are available?';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [
        createTestCourse('CS401', 'AI Fundamentals'),
      ];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'We offer CS401 (AI Fundamentals) and CS402 (Machine Learning).',
        model: testModelName,
        inputTokens: 80,
        outputTokens: 40,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(result.question).toBe(question);
      expect(result.answerText).toContain('CS401');
    });

    it('should handle Thai language query profile', async () => {
      // Given
      const question = 'มีหลักสูตรเกี่ยวกับการเขียนโปรแกรมไหมไทย';
      const queryProfile = createTestQueryProfile({
        language: 'th',
      });
      const aggregatedCourseSkills = [
        createTestCourse('CS101', 'Introduction to Programming'),
      ];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'แนะนำหลักสูตร CS101',
        model: testModelName,
        inputTokens: 120,
        outputTokens: 60,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then: Verify context includes Thai query profile
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Language:');
      expect(callArgs.prompt).toContain('th'); // language field
      expect(result.answerText).toContain('แนะนำหลักสูตร CS101');
    });

    it('should include language in context', async () => {
      // Given
      const question = 'What courses for data science?';
      const queryProfile = createTestQueryProfile({
        language: 'en',
      });
      const aggregatedCourseSkills = [
        createTestCourse('CS301', 'Data Science'),
      ];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Recommended: CS301',
        model: testModelName,
        inputTokens: 180,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify language is in context
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Language:');
      expect(callArgs.prompt).toContain('en'); // language field
    });

    it('should set schemaName to undefined (text generation, not structured output)', async () => {
      // Given
      const question = 'Test';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Test')];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Answer',
        model: testModelName,
        inputTokens: 50,
        outputTokens: 25,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(result.llmInfo.schemaName).toBeUndefined();
    });
  });

  describe('context building (buildContext)', () => {
    it('should transform camelCase to snake_case for LLM consumption', async () => {
      // Given
      const question = 'Test';
      const queryProfile = createTestQueryProfile();
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Test Course')];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Answer',
        model: testModelName,
        inputTokens: 50,
        outputTokens: 25,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify snake_case in context
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('subject_name'); // not subjectName
      expect(callArgs.prompt).toContain('subject_code'); // not subjectCode
      expect(callArgs.prompt).toContain('relevance_score'); // relevance score is included
      expect(callArgs.prompt).toContain('matched_skills_and_learning_outcomes'); // not matchedSkills
      expect(callArgs.prompt).toContain('learning_outcome_name'); // not cleanedName
    });

    it('should encode both course data and query profile using toon format', async () => {
      // Given
      const question = 'Test';
      const queryProfile = createTestQueryProfile({
        language: 'en',
      });
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Test')];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Answer',
        model: testModelName,
        inputTokens: 50,
        outputTokens: 25,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        language: queryProfile.language,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify JSON encoding in context
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Courses with skills:');
      expect(callArgs.prompt).toContain('Language:');
      // The actual encoded JSON will be in the string
    });
  });
});
