import { Test } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { CourseRelevanceFilterPromptVersion } from '../../../prompts/course-relevance-filter';
import { CourseRelevanceFilterService } from '../course-relevance-filter.service';

describe('CourseRelevanceFilterService', () => {
  let service: CourseRelevanceFilterService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  const testModelName = 'test-model';
  const testPromptVersion: CourseRelevanceFilterPromptVersion = 'v2';

  // Helper to create test course
  const createTestCourse = (
    subjectCode: string,
    subjectName: string,
  ): CourseWithLearningOutcomeV2Match => {
    const learningOutcome = {
      loId: 'lo1' as Identifier,
      cleanedName: 'Understand programming concepts',
      originalName: 'Understand programming concepts',
      skipEmbedding: false,
      hasEmbedding768: true,
      hasEmbedding1536: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return {
      id: 'course-1' as Identifier,
      campusId: 'campus-1' as Identifier,
      facultyId: 'faculty-1' as Identifier,
      subjectCode,
      subjectName,
      isGenEd: false,
      courseOfferings: [],
      courseClickLogs: [],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      matchedLearningOutcomes: [],
      remainingLearningOutcomes: [],
      allLearningOutcomes: [learningOutcome],
    };
  };

  beforeEach(async () => {
    const mockLlmRouter = {
      generateObject: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CourseRelevanceFilterService,
          inject: [I_LLM_ROUTER_SERVICE_TOKEN],
          useFactory: (llmRouterService: ILlmRouterService) => {
            return new CourseRelevanceFilterService(
              llmRouterService,
              testModelName,
            );
          },
        },
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
      ],
    }).compile();

    service = module.get(CourseRelevanceFilterService);
    llmRouter = module.get(I_LLM_ROUTER_SERVICE_TOKEN);

    jest.clearAllMocks();
  });

  describe('batchFilterCoursesBySkillV2', () => {
    it('should return empty result when no courses for skill (skip LLM call)', async () => {
      // Given: Empty course array for "python" skill
      const skillCourseMatchMap = new Map<
        string,
        CourseWithLearningOutcomeV2Match[]
      >([['python', []]]);
      const question = 'What courses cover web development?';

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].llmAcceptedCoursesBySkill.get('python')).toBeUndefined();
      expect(result[0].llmRejectedCoursesBySkill.get('python')).toBeUndefined();
      expect(result[0].llmMissingCoursesBySkill.get('python')).toBeUndefined();
      expect(result[0].llmAcceptedCoursesBySkill.size).toBe(0);
      expect(result[0].llmRejectedCoursesBySkill.size).toBe(0);
      expect(result[0].llmMissingCoursesBySkill.size).toBe(0);
      expect(result[0].tokenUsage.inputTokens).toBe(0);
      expect(result[0].tokenUsage.outputTokens).toBe(0);
      expect(result[0].tokenUsage.model).toBe(testModelName);
      expect(result[0].llmInfo.model).toBe(testModelName);

      // And: LLM should NOT be called
      expect(llmRouter.generateObject).not.toHaveBeenCalled();
    });

    it('should drop courses with score < MIN_RELEVANCE_SCORE (score = 0)', async () => {
      // Given: Courses with LLM returning score 0
      const courses = [
        createTestCourse('CS101', 'Intro to Programming'),
        createTestCourse('CS102', 'Basic Math'),
      ];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              code: 'CS101',
              name: 'Intro to Programming',
              score: 0,
              reason: 'No relevance to python',
            },
            {
              code: 'CS102',
              name: 'Basic Math',
              score: 0,
              reason: 'No relevance to python',
            },
          ],
        },
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then
      expect(result[0].llmRejectedCoursesBySkill.get('python')).toHaveLength(2);
      expect(result[0].llmAcceptedCoursesBySkill.get('python')).toHaveLength(0);
      expect(result[0].llmMissingCoursesBySkill.get('python')).toHaveLength(0);

      // Verify dropped courses have score 0
      const dropped = result[0].llmRejectedCoursesBySkill.get('python')!;
      expect(dropped.every((c) => c.score === 0)).toBe(true);
    });

    it('should accept courses with score >= MIN_RELEVANCE_SCORE (scores 1, 2, 3)', async () => {
      // Given: Courses with LLM returning scores 1, 2, 3
      const courses = [
        createTestCourse('CS101', 'Intro to Python'),
        createTestCourse('CS102', 'Python Data Science'),
        createTestCourse('CS103', 'Advanced Python'),
      ];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              code: 'CS101',
              name: 'Intro to Python',
              score: 1,
              reason: 'Low relevance',
            },
            {
              code: 'CS102',
              name: 'Python Data Science',
              score: 2,
              reason: 'Medium relevance',
            },
            {
              code: 'CS103',
              name: 'Advanced Python',
              score: 3,
              reason: 'High relevance',
            },
          ],
        },
        inputTokens: 120,
        outputTokens: 60,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then
      expect(result[0].llmAcceptedCoursesBySkill.get('python')).toHaveLength(3);
      expect(result[0].llmRejectedCoursesBySkill.get('python')).toHaveLength(0);
      expect(result[0].llmMissingCoursesBySkill.get('python')).toHaveLength(0);

      // Verify relevant courses have scores >= 1
      const relevant = result[0].llmAcceptedCoursesBySkill.get('python')!;
      expect(relevant.map((c) => c.score)).toEqual([1, 2, 3]);
    });

    it('should correctly categorize mixed scores (0, 1, 2, 0, 3)', async () => {
      // Given: 5 courses with mixed scores
      const courses = [
        createTestCourse('CS101', 'Intro'),
        createTestCourse('CS102', 'Basics'),
        createTestCourse('CS103', 'Intermediate'),
        createTestCourse('CS104', 'Advanced'),
        createTestCourse('CS105', 'Expert'),
      ];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              code: 'CS101',
              name: 'Intro',
              score: 0,
              reason: 'No',
            },
            {
              code: 'CS102',
              name: 'Basics',
              score: 1,
              reason: 'Low',
            },
            {
              code: 'CS103',
              name: 'Intermediate',
              score: 2,
              reason: 'Med',
            },
            {
              code: 'CS104',
              name: 'Advanced',
              score: 0,
              reason: 'No',
            },
            {
              code: 'CS105',
              name: 'Expert',
              score: 3,
              reason: 'High',
            },
          ],
        },
        inputTokens: 150,
        outputTokens: 75,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then: 2 dropped (scores 0), 3 relevant (scores 1,2,3)
      expect(result[0].llmRejectedCoursesBySkill.get('python')).toHaveLength(2);
      expect(result[0].llmAcceptedCoursesBySkill.get('python')).toHaveLength(3);

      // Verify which courses went where
      const dropped = result[0].llmRejectedCoursesBySkill.get('python')!;
      expect(dropped.map((c) => c.subjectCode).sort()).toEqual([
        'CS101',
        'CS104',
      ]);

      const relevant = result[0].llmAcceptedCoursesBySkill.get('python')!;
      expect(relevant.map((c) => c.subjectCode).sort()).toEqual([
        'CS102',
        'CS103',
        'CS105',
      ]);
    });

    it('should track courses not returned by LLM as missing', async () => {
      // Given: 5 courses input, LLM returns only 3
      const courses = [
        createTestCourse('CS101', 'Intro'),
        createTestCourse('CS102', 'Basics'),
        createTestCourse('CS103', 'Intermediate'),
        createTestCourse('CS104', 'Advanced'),
        createTestCourse('CS105', 'Expert'),
      ];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      // LLM only returns CS101, CS103, CS105 (missing CS102, CS104)
      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              code: 'CS101',
              name: 'Intro',
              score: 2,
              reason: 'Good match',
            },
            {
              code: 'CS103',
              name: 'Intermediate',
              score: 1,
              reason: 'OK match',
            },
            {
              code: 'CS105',
              name: 'Expert',
              score: 3,
              reason: 'Great match',
            },
          ],
        },
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then
      expect(result[0].llmMissingCoursesBySkill.get('python')).toHaveLength(2);
      expect(result[0].llmAcceptedCoursesBySkill.get('python')).toHaveLength(3);
      expect(result[0].llmRejectedCoursesBySkill.get('python')).toHaveLength(0);

      // Verify missing courses
      const missing = result[0].llmMissingCoursesBySkill.get('python')!;
      expect(missing.map((c) => c.subjectCode).sort()).toEqual([
        'CS102',
        'CS104',
      ]);
      expect(missing.every((c) => c.score === 0)).toBe(true);
      expect(
        missing.every((c) => c.reason === 'Not found in LLM response'),
      ).toBe(true);
    });

    it('should build correct TokenUsage and LlmInfo metadata', async () => {
      // Given
      const courses = [createTestCourse('CS101', 'Python Basics')];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              code: 'CS101',
              name: 'Python Basics',
              score: 2,
              reason: 'Good match',
            },
          ],
        },
        inputTokens: 150,
        outputTokens: 75,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
        providerMetadata: { key: 'value' },
        response: { timestamp: new Date(), modelId: 'actual-model' },
        hyperParameters: { temperature: 0.7 },
      });

      // When
      const result = await service.batchFilterCoursesBySkillV2(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then: Verify TokenUsage
      expect(result[0].tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 150,
        outputTokens: 75,
      });

      // Then: Verify LlmInfo
      expect(result[0].llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 150,
        outputTokens: 75,
        promptVersion: testPromptVersion,
        schemaName: 'CourseRelevanceFilterResultSchemaV2',
        finishReason: 'stop',
        warnings: [],
      });
    });
  });

  describe('batchFilterCoursesBySkill (V1)', () => {
    it('should filter courses by binary decision (yes/no)', async () => {
      // Given: Courses with yes/no decisions
      const courses = [
        createTestCourse('CS101', 'Python Basics'),
        createTestCourse('CS102', 'Java Fundamentals'),
      ];
      const skillCourseMatchMap = new Map([['python', courses]]);
      const question = 'What courses cover python?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        object: {
          courses: [
            {
              course_name: 'Python Basics',
              decision: 'yes',
              reason: 'Directly covers python',
            },
            {
              course_name: 'Java Fundamentals',
              decision: 'no',
              reason: 'Does not cover python',
            },
          ],
        },
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.batchFilterCoursesBySkill(
        question,
        skillCourseMatchMap,
        testPromptVersion,
      );

      // Then
      expect(result[0].relevantCoursesBySkill.get('python')).toHaveLength(1);
      expect(result[0].nonRelevantCoursesBySkill.get('python')).toHaveLength(1);

      const relevant = result[0].relevantCoursesBySkill.get('python')!;
      expect(relevant[0].subjectName).toBe('Python Basics');

      const nonRelevant = result[0].nonRelevantCoursesBySkill.get('python')!;
      expect(nonRelevant[0].subjectName).toBe('Java Fundamentals');
    });
  });
});
