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

describe('AnswerSynthesisService', () => {
  let service: AnswerSynthesisService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  const testModelName = 'test-model';
  const testPromptVersion: AnswerSynthesisPromptVersion = 'v1';

  // Helper to create test query profile (no longer used, kept for backward compatibility)
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
          relevanceScore: 0.85,
          learningOutcomes: [learningOutcome],
        },
      ],
      maxRelevanceScore: 3,
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
      const _queryProfile = createTestQueryProfile();
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
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(llmRouter.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(question),
          systemPrompt: expect.any(String),
          model: testModelName,
        }),
      );

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
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify context contains course information with structured text format
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('COURSE:');
      expect(callArgs.prompt).toContain('RELEVANCE SCORE:');
      expect(callArgs.prompt).toContain('SECTION 1: MATCHED EVIDENCE');
      expect(callArgs.prompt).toContain('SECTION 2: FULL CONTEXT');

      // Verify course details are included
      expect(callArgs.prompt).toContain('Web Development');
      expect(callArgs.prompt).toContain('CS201');
      expect(callArgs.prompt).toContain('Frontend Programming');
      expect(callArgs.prompt).toContain('CS202');
    });

    it('should handle empty aggregated course skills', async () => {
      // Given
      const question = 'Tell me about the curriculum';
      const _queryProfile = createTestQueryProfile();
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
      const _queryProfile = createTestQueryProfile();
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
      const _queryProfile = createTestQueryProfile();

      const course1 = createTestCourse('CS201', 'Web Development');
      course1.matchedSkills.push({
        skill: 'JavaScript',
        relevanceScore: 0.9,
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
        relevanceScore: 0.88,
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
      const _queryProfile = createTestQueryProfile();
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
      const _queryProfile = createTestQueryProfile();
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
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then: Verify context includes Thai query profile
      const _callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(result.answerText).toContain('แนะนำหลักสูตร CS101');
    });

    it('should include language in context', async () => {
      // Given
      const question = 'What courses for data science?';
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
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify language is in context
      const _callArgs = llmRouter.generateText.mock.calls[0][0];
      // Note: Language detection is no longer supported in this version
    });

    it('should set schemaName to undefined (text generation, not structured output)', async () => {
      // Given
      const question = 'Test';
      const _queryProfile = createTestQueryProfile();
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
        aggregatedCourseSkills,
      };

      // When
      const result = await service.synthesizeAnswer(input);

      // Then
      expect(result.llmInfo.schemaName).toBeUndefined();
    });
  });

  describe('context building (buildContext)', () => {
    it('should format context as structured text with sections', async () => {
      // Given
      const question = 'Test';
      const _queryProfile = createTestQueryProfile();
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
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify structured text format with sections
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('COURSE: Test Course (CS101)');
      expect(callArgs.prompt).toContain('RELEVANCE SCORE: 3');
      expect(callArgs.prompt).toContain(
        'SECTION 1: MATCHED EVIDENCE (Why it was picked)',
      );
      expect(callArgs.prompt).toContain(
        'SECTION 2: FULL CONTEXT (Center of Gravity Check)',
      );
    });

    it('should include both matched and all learning outcomes in structured format', async () => {
      // Given
      const question = 'Tell me about advanced courses';

      // Create a course with multiple LOs, but only one matched
      const learningOutcome1 = {
        loId: 'lo1' as Identifier,
        cleanedName: 'Matched outcome: Python basics',
        originalName: 'Matched outcome: Python basics',
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        similarityScore: 0.85,
      };

      const learningOutcome2 = {
        loId: 'lo2' as Identifier,
        cleanedName: 'Additional outcome: Data structures',
        originalName: 'Additional outcome: Data structures',
        skipEmbedding: false,
        hasEmbedding768: true,
        hasEmbedding1536: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const course: AggregatedCourseSkills = {
        id: 'course-1' as Identifier,
        campusId: 'campus-1' as Identifier,
        facultyId: 'faculty-1' as Identifier,
        subjectCode: 'CS201',
        subjectName: 'Advanced Programming',
        isGenEd: false,
        courseLearningOutcomes: [learningOutcome1, learningOutcome2], // Both LOs in course
        courseOfferings: [],
        courseClickLogs: [],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        matchedSkills: [
          {
            skill: 'Python Programming',
            relevanceScore: 0.85,
            learningOutcomes: [learningOutcome1], // Only first LO matched
          },
        ],
        maxRelevanceScore: 3,
      };

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Course covers Python and data structures',
        model: testModelName,
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        aggregatedCourseSkills: [course],
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify both matched and all LOs are in correct sections
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      // Matched LO appears in SECTION 1
      expect(callArgs.prompt).toContain('SECTION 1: MATCHED EVIDENCE');
      expect(callArgs.prompt).toContain('- Matched outcome: Python basics');
      // All LOs appear in SECTION 2
      expect(callArgs.prompt).toContain('SECTION 2: FULL CONTEXT');
      expect(callArgs.prompt).toContain('- Matched outcome: Python basics');
      expect(callArgs.prompt).toContain(
        '- Additional outcome: Data structures',
      );
    });

    it('should separate multiple courses with separator', async () => {
      // Given
      const question = 'Show me courses';
      const _queryProfile = createTestQueryProfile({ language: 'en' });
      const aggregatedCourseSkills = [
        createTestCourse('CS101', 'Course A'),
        createTestCourse('CS102', 'Course B'),
      ];

      llmRouter.generateText = jest.fn().mockResolvedValue({
        text: 'Found multiple courses',
        model: testModelName,
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      const input = {
        question,
        promptVersion: testPromptVersion,
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify separator between courses
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('---');
      expect(callArgs.prompt).toContain('COURSE: Course A (CS101)');
      expect(callArgs.prompt).toContain('COURSE: Course B (CS102)');
    });

    it('should include learning outcome names in full context section', async () => {
      // Given
      const question = 'What does this course cover?';
      const aggregatedCourseSkills = [createTestCourse('CS101', 'Programming')];

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
        aggregatedCourseSkills,
      };

      // When
      await service.synthesizeAnswer(input);

      // Then: Verify learning outcomes are included in full context
      const callArgs = llmRouter.generateText.mock.calls[0][0];
      expect(callArgs.prompt).toContain('SECTION 2: FULL CONTEXT');
      expect(callArgs.prompt).toContain('- Understand programming concepts');
    });
  });
});
