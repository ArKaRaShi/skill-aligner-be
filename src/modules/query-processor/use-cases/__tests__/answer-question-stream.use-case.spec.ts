import { Test } from '@nestjs/testing';

import { Identifier } from 'src/shared/contracts/types/identifier';

import { I_CAMPUS_REPOSITORY_TOKEN } from 'src/modules/campus/contracts/i-campus-repository.contract';
import { I_COURSE_RETRIEVER_SERVICE_TOKEN } from 'src/modules/course/contracts/i-course-retriever-service.contract';
import { I_FACULTY_REPOSITORY_TOKEN } from 'src/modules/faculty/contracts/i-faculty.contract';
import { QueryPipelineLoggerService } from 'src/modules/query-logging/services/query-pipeline-logger.service';
import { CourseFilterHelper } from 'src/modules/query-processor/helpers/course-filter.helper';
import { I_QUESTION_LOG_REPOSITORY_TOKEN } from 'src/modules/question-analyses/contracts/repositories/i-question-log-repository.contract';

import { I_ANSWER_SYNTHESIS_SERVICE_TOKEN } from '../../contracts/i-answer-synthesis-service.contract';
import { I_COURSE_AGGREGATION_SERVICE_TOKEN } from '../../contracts/i-course-aggregation-service.contract';
import { I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN } from '../../contracts/i-course-relevance-filter-service.contract';
import { I_QUESTION_CLASSIFIER_SERVICE_TOKEN } from '../../contracts/i-question-classifier-service.contract';
import { I_SKILL_EXPANDER_SERVICE_TOKEN } from '../../contracts/i-skill-expander-service.contract';
import { SSE_EVENT_NAME } from '../../types/sse-event.type';
import { AnswerQuestionStreamUseCase } from '../answer-question-stream.use-case';
import { AnswerQuestionStreamUseCaseInput } from '../inputs/answer-question-stream.use-case.input';

// Helper to create Identifier from string for tests
const toId = (id: string): Identifier => id as Identifier;

// Mock all dependencies
const mockQuestionClassifierService = {
  classify: jest.fn(),
};

const mockSkillExpanderService = {
  expandSkills: jest.fn(),
};

const mockCourseAggregationService = {
  aggregate: jest.fn(),
};

const mockAnswerSynthesisService = {
  synthesizeAnswer: jest.fn(),
  synthesizeAnswerStream: jest.fn(),
};

const mockCourseRetrieverService = {
  getCoursesWithLosBySkillsWithFilter: jest.fn(),
};

const mockFacultyRepository = {
  findMany: jest.fn(),
};

const mockCampusRepository = {
  findMany: jest.fn(),
};

const mockCourseRelevanceFilterService = {
  batchFilterCoursesBySkillV2: jest.fn(),
};

const mockQuestionLogRepository = {
  create: jest.fn(),
};

const mockQueryPipelineLoggerService = {
  start: jest.fn(),
  classification: jest.fn(),
  skillExpansion: jest.fn(),
  courseRetrieval: jest.fn(),
  courseFilter: jest.fn(),
  courseAggregation: jest.fn(),
  answerSynthesis: jest.fn(),
  completeWithRawMetrics: jest.fn(),
  earlyExit: jest.fn(),
  fail: jest.fn(),
};

const mockEmitter = {
  emit: jest.fn(),
  complete: jest.fn(),
  error: jest.fn(),
};

describe('AnswerQuestionStreamUseCase', () => {
  let useCase: AnswerQuestionStreamUseCase;

  // Test fixtures
  const defaultInput: AnswerQuestionStreamUseCaseInput = {
    question: 'What is machine learning?',
    isGenEd: false,
    campusId: undefined,
    facultyId: undefined,
    academicYearSemesters: undefined,
    stream: true, // Default to streaming mode
  };

  const mockFaculties = [
    { facultyId: toId('faculty-1'), name: 'Engineering', code: 'ENG' },
  ];

  const mockCampuses = [
    { campusId: toId('campus-1'), name: 'Bangkok', code: 'B' },
  ];

  const mockClassificationResult = {
    category: 'relevant' as const,
    reason: 'Question about machine learning',
    llmInfo: {
      model: 'gpt-4',
      userPrompt: 'What is machine learning?',
      systemPrompt: 'Classify this question',
      promptVersion: 'v1',
    },
    tokenUsage: {
      model: 'gpt-4',
      inputTokens: 10,
      outputTokens: 5,
    },
  };

  const mockSkillExpansion = {
    skillItems: [{ skill: 'machine learning', confidence: 0.9 }],
    llmInfo: {
      model: 'gpt-4',
      userPrompt: 'What is machine learning?',
      systemPrompt: 'Expand skills',
      promptVersion: 'v1',
    },
    tokenUsage: {
      model: 'gpt-4',
      inputTokens: 20,
      outputTokens: 10,
    },
  };

  const mockRetrieverResult = {
    coursesBySkill: new Map([
      [
        'machine learning',
        [
          {
            courseId: 'course-1',
            learningOutcomes: [
              { loId: 'lo-1', originalName: 'Understand ML', score: 0.9 },
            ],
          },
        ],
      ],
    ]),
    embeddingUsage: {
      totalTokens: 100,
      bySkill: [
        {
          skill: 'machine learning',
          model: 'text-embedding-ada-002',
          inputTokens: 100,
        },
      ],
    },
  };

  const mockRelevanceFilterResults = [
    {
      skill: 'machine learning',
      llmAcceptedCoursesBySkill: new Map([
        [
          'machine learning',
          [
            {
              courseId: 'course-1',
              learningOutcomes: [
                { loId: 'lo-1', originalName: 'Understand ML', score: 0.9 },
              ],
            },
          ],
        ],
      ]),
      tokenUsage: {
        model: 'gpt-4',
        inputTokens: 50,
        outputTokens: 20,
      },
    },
  ];

  const mockAggregatedCourses = [
    {
      id: toId('course-1'),
      campusId: toId('campus-1'),
      facultyId: toId('faculty-1'),
      subjectCode: 'CS101',
      subjectName: 'Introduction to Machine Learning',
      isGenEd: false,
      courseLearningOutcomes: [],
      courseOfferings: [],
      matchedSkills: [],
      courseClickLogs: [],
      maxRelevanceScore: 1,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSynthesisResult = {
    answerText: 'Machine learning is a subset of AI...',
    llmInfo: {
      model: 'gpt-4',
      userPrompt: 'What is machine learning?',
      systemPrompt: 'Synthesize answer',
      promptVersion: 'v1',
    },
    tokenUsage: {
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 200,
    },
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockQuestionClassifierService.classify.mockResolvedValue(
      mockClassificationResult,
    );
    mockSkillExpanderService.expandSkills.mockResolvedValue(mockSkillExpansion);
    mockCourseRetrieverService.getCoursesWithLosBySkillsWithFilter.mockResolvedValue(
      mockRetrieverResult,
    );
    mockCourseRelevanceFilterService.batchFilterCoursesBySkillV2.mockResolvedValue(
      mockRelevanceFilterResults,
    );
    // aggregate is synchronous, use mockReturnValue not mockResolvedValue
    mockCourseAggregationService.aggregate.mockReturnValue({
      rankedCourses: mockAggregatedCourses,
    });
    mockAnswerSynthesisService.synthesizeAnswer.mockResolvedValue(
      mockSynthesisResult,
    );
    // Mock synthesizeAnswerStream for streaming mode tests
    mockAnswerSynthesisService.synthesizeAnswerStream.mockReturnValue({
      stream: (function* () {
        yield {
          text: mockSynthesisResult.answerText,
          isFirst: true,
          isLast: true,
        };
      })(),
      question: mockSynthesisResult.answerText,
      onComplete: Promise.resolve({
        tokenUsage: mockSynthesisResult.tokenUsage,
        llmInfo: mockSynthesisResult.llmInfo,
      }),
    });
    mockFacultyRepository.findMany.mockResolvedValue(mockFaculties);
    mockCampusRepository.findMany.mockResolvedValue(mockCampuses);
    mockQueryPipelineLoggerService.start.mockResolvedValue('process-log-1');
    mockQuestionLogRepository.create.mockResolvedValue({
      id: 'question-log-1',
    });

    // Create test module using factory pattern
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AnswerQuestionStreamUseCase,
          inject: [
            I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
            I_SKILL_EXPANDER_SERVICE_TOKEN,
            I_COURSE_AGGREGATION_SERVICE_TOKEN,
            I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
            I_COURSE_RETRIEVER_SERVICE_TOKEN,
            I_FACULTY_REPOSITORY_TOKEN,
            I_CAMPUS_REPOSITORY_TOKEN,
            I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
            I_QUESTION_LOG_REPOSITORY_TOKEN,
            QueryPipelineLoggerService,
          ],
          useFactory: (
            questionClassifierService: any,
            skillExpanderService: any,
            courseAggregationService: any,
            answerSynthesisService: any,
            courseRetrieverService: any,
            facultyRepository: any,
            campusRepository: any,
            courseRelevanceFilterService: any,
            questionLogRepository: any,
            queryPipelineLoggerService: any,
          ) => {
            return new AnswerQuestionStreamUseCase(
              questionClassifierService,
              skillExpanderService,
              courseAggregationService,
              answerSynthesisService,
              courseRetrieverService,
              facultyRepository,
              campusRepository,
              courseRelevanceFilterService,
              questionLogRepository,
              queryPipelineLoggerService,
            );
          },
        },
        {
          provide: I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
          useValue: mockQuestionClassifierService,
        },
        {
          provide: I_SKILL_EXPANDER_SERVICE_TOKEN,
          useValue: mockSkillExpanderService,
        },
        {
          provide: I_COURSE_AGGREGATION_SERVICE_TOKEN,
          useValue: mockCourseAggregationService,
        },
        {
          provide: I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
          useValue: mockAnswerSynthesisService,
        },
        {
          provide: I_COURSE_RETRIEVER_SERVICE_TOKEN,
          useValue: mockCourseRetrieverService,
        },
        {
          provide: I_FACULTY_REPOSITORY_TOKEN,
          useValue: mockFacultyRepository,
        },
        {
          provide: I_CAMPUS_REPOSITORY_TOKEN,
          useValue: mockCampusRepository,
        },
        {
          provide: I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
          useValue: mockCourseRelevanceFilterService,
        },
        {
          provide: I_QUESTION_LOG_REPOSITORY_TOKEN,
          useValue: mockQuestionLogRepository,
        },
        {
          provide: QueryPipelineLoggerService,
          useValue: mockQueryPipelineLoggerService,
        },
      ],
    }).compile();

    useCase = module.get(AnswerQuestionStreamUseCase);

    // Mock the static CourseFilterHelper method after module is created
    jest.spyOn(CourseFilterHelper, 'aggregateFilteredCourses').mockReturnValue({
      aggregatedMap: new Map([
        [
          'machine learning',
          [
            {
              courseId: 'course-1',
              learningOutcomes: [
                { loId: 'lo-1', originalName: 'Understand ML', score: 0.9 },
              ],
            },
          ] as any,
        ],
      ]),
    } as any);
  });

  describe('execute', () => {
    it('should successfully execute the full pipeline and emit SSE events', async () => {
      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify query pipeline was started
      expect(mockQueryPipelineLoggerService.start).toHaveBeenCalledWith(
        defaultInput.question,
        expect.objectContaining({
          question: defaultInput.question,
        }),
      );

      // Verify step events were emitted (started and completed for each of 6 steps)
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          total: 6,
          name: 'classification',
          status: 'started',
        }),
        SSE_EVENT_NAME.STEP,
      );

      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 1,
          total: 6,
          name: 'classification',
          status: 'completed',
        }),
        SSE_EVENT_NAME.STEP,
      );

      // Verify classification was called
      expect(mockQuestionClassifierService.classify).toHaveBeenCalledWith({
        question: defaultInput.question,
        promptVersion: expect.any(String),
      });

      // Verify skill expansion
      expect(mockSkillExpanderService.expandSkills).toHaveBeenCalledWith(
        defaultInput.question,
        expect.any(String),
      );

      // Verify course retrieval
      expect(
        mockCourseRetrieverService.getCoursesWithLosBySkillsWithFilter,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: ['machine learning'],
        }),
      );

      // Verify relevance filter
      expect(
        mockCourseRelevanceFilterService.batchFilterCoursesBySkillV2,
      ).toHaveBeenCalledWith(
        defaultInput.question,
        expect.any(Map),
        expect.any(String),
      );

      // Verify aggregation
      expect(mockCourseAggregationService.aggregate).toHaveBeenCalledWith({
        filteredSkillCoursesMap: expect.any(Map),
        rawSkillCoursesMap: expect.any(Map),
      });

      // Verify answer synthesis stream was called (streaming mode)
      expect(
        mockAnswerSynthesisService.synthesizeAnswerStream,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          question: defaultInput.question,
        }),
      );

      // Verify COURSES event was emitted (streaming mode emits courses early)
      const coursesCalls = mockEmitter.emit.mock.calls.filter(
        (call) => call[1] === SSE_EVENT_NAME.COURSES,
      );
      expect(coursesCalls.length).toBe(1);
      expect(coursesCalls[0][0]).toMatchObject({
        courses: expect.any(Array),
      });

      // Verify TEXT_CHUNK event was emitted
      const chunkCalls = mockEmitter.emit.mock.calls.filter(
        (call) => call[1] === SSE_EVENT_NAME.TEXT_CHUNK,
      );
      expect(chunkCalls.length).toBe(1);
      expect(chunkCalls[0][0]).toMatchObject({
        chunk: mockSynthesisResult.answerText,
        isFirst: true,
        isLast: true,
      });

      // Verify final DONE event was emitted WITHOUT courses (streaming mode)
      const doneCalls = mockEmitter.emit.mock.calls.filter(
        (call) => call[1] === SSE_EVENT_NAME.DONE,
      );
      expect(doneCalls.length).toBe(1);
      expect(doneCalls[0][0]).toMatchObject({
        answer: mockSynthesisResult.answerText,
        suggestQuestion: null,
      });
      expect(doneCalls[0][0].relatedCourses).toBeUndefined();

      // Verify query logging was completed
      expect(
        mockQueryPipelineLoggerService.completeWithRawMetrics,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: mockSynthesisResult.answerText,
        }),
        expect.any(Object),
        expect.any(Object),
        1,
      );
    });

    it('should emit fallback event for irrelevant questions', async () => {
      mockQuestionClassifierService.classify.mockResolvedValue({
        ...mockClassificationResult,
        category: 'irrelevant',
        reason: 'Question about cooking',
      });

      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify early exit was logged
      expect(mockQueryPipelineLoggerService.earlyExit).toHaveBeenCalledWith({
        classification: {
          category: 'irrelevant',
          reason: 'Question about cooking',
        },
      });

      // Verify fallback event was emitted
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'irrelevant',
          reason: 'Question about cooking',
          answer: expect.stringContaining('อยู่นอกขอบเขต'),
          suggestQuestion: expect.any(String),
          relatedCourses: [],
        }),
        SSE_EVENT_NAME.FALLBACK,
      );

      // Verify pipeline stopped after fallback (no skill expansion)
      expect(mockSkillExpanderService.expandSkills).not.toHaveBeenCalled();
    });

    it('should emit fallback event for dangerous questions', async () => {
      mockQuestionClassifierService.classify.mockResolvedValue({
        ...mockClassificationResult,
        category: 'dangerous',
        reason: 'Harmful content detected',
      });

      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify early exit was logged
      expect(mockQueryPipelineLoggerService.earlyExit).toHaveBeenCalledWith({
        classification: {
          category: 'dangerous',
          reason: 'Harmful content detected',
        },
      });

      // Verify fallback event was emitted
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'dangerous',
          reason: 'Harmful content detected',
          answer: expect.stringContaining('ไม่เหมาะสมหรือเป็นอันตราย'),
          suggestQuestion: expect.any(String),
          relatedCourses: [],
        }),
        SSE_EVENT_NAME.FALLBACK,
      );
    });

    it('should handle empty course results gracefully', async () => {
      // aggregate is synchronous, use mockReturnValue not mockResolvedValue
      mockCourseAggregationService.aggregate.mockReturnValue({
        rankedCourses: [],
      });

      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify DONE event was emitted with empty courses
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: expect.stringContaining('ไม่พบรายวิชา'),
          suggestQuestion: expect.any(String),
          relatedCourses: [],
        }),
        SSE_EVENT_NAME.DONE,
      );

      // Verify answer synthesis was not called
      expect(
        mockAnswerSynthesisService.synthesizeAnswer,
      ).not.toHaveBeenCalled();
    });

    it('should emit error event and re-throw on pipeline errors', async () => {
      const testError = new Error('LLM service failed');
      mockQuestionClassifierService.classify.mockRejectedValue(testError);

      await expect(
        useCase.execute(defaultInput, mockEmitter as any),
      ).rejects.toThrow('LLM service failed');

      // Verify error was logged
      expect(mockQueryPipelineLoggerService.fail).toHaveBeenCalledWith({
        message: 'LLM service failed',
        stack: expect.any(String),
      });

      // Verify ERROR event was emitted
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        { message: 'LLM service failed' },
        SSE_EVENT_NAME.ERROR,
      );
    });

    it('should emit step events for all 6 pipeline steps', async () => {
      await useCase.execute(defaultInput, mockEmitter as any);

      const stepEvents = mockEmitter.emit.mock.calls.filter(
        (call) => call[1] === SSE_EVENT_NAME.STEP,
      );

      // Should have 12 step events (started + completed for 6 steps)
      expect(stepEvents.length).toBe(12);

      // Verify step names in order
      const stepNames = stepEvents.map(
        (call) => (call[0] as { name: string }).name,
      );
      const expectedSteps = [
        'classification',
        'classification',
        'skill_expansion',
        'skill_expansion',
        'course_retrieval',
        'course_retrieval',
        'relevance_filter',
        'relevance_filter',
        'aggregation',
        'aggregation',
        'answer_synthesis',
        'answer_synthesis',
      ];
      expect(stepNames).toEqual(expectedSteps);
    });

    it('should create QuestionLog even if it fails', async () => {
      mockQuestionLogRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify pipeline continued despite QuestionLog failure
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 2,
          total: 6,
          status: 'started',
        }),
        SSE_EVENT_NAME.STEP,
      );
    });

    it('should filter courses by relevance score in answer synthesis', async () => {
      const mockCoursesWithScores = [
        {
          ...mockAggregatedCourses[0],
          id: toId('course-a'),
          maxRelevanceScore: 0.5,
        },
        {
          ...mockAggregatedCourses[0],
          id: toId('course-b'),
          maxRelevanceScore: 1.0,
        },
        {
          ...mockAggregatedCourses[0],
          id: toId('course-c'),
          maxRelevanceScore: 1.5,
        },
      ];

      // aggregate is synchronous, use mockReturnValue not mockResolvedValue
      mockCourseAggregationService.aggregate.mockReturnValue({
        rankedCourses: mockCoursesWithScores,
      });

      await useCase.execute(defaultInput, mockEmitter as any);

      // Verify only courses with score >= 1 were passed to synthesis (streaming mode)
      expect(
        mockAnswerSynthesisService.synthesizeAnswerStream,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregatedCourseSkills: expect.arrayContaining([
            expect.objectContaining({ maxRelevanceScore: 1.0 }),
            expect.objectContaining({ maxRelevanceScore: 1.5 }),
          ]),
        }),
      );

      const synthesisCall = mockAnswerSynthesisService.synthesizeAnswerStream
        .mock.calls[0][0] as {
        aggregatedCourseSkills: { maxRelevanceScore: number }[];
      };
      expect(synthesisCall.aggregatedCourseSkills).toHaveLength(2);
      expect(
        synthesisCall.aggregatedCourseSkills.every(
          (c) => c.maxRelevanceScore >= 1,
        ),
      ).toBe(true);
    });
  });

  describe('getFallbackAnswerForClassification', () => {
    it('should return fallback for irrelevant classification', async () => {
      // Access private method through test
      const result = await useCase['getFallbackAnswerForClassification'](
        'irrelevant',
        'Not relevant',
      );

      expect(result).toEqual({
        answer: expect.stringContaining('อยู่นอกขอบเขต'),
        suggestQuestion: expect.any(String),
        relatedCourses: [],
      });
      expect(mockQueryPipelineLoggerService.earlyExit).toHaveBeenCalled();
    });

    it('should return fallback for dangerous classification', async () => {
      const result = await useCase['getFallbackAnswerForClassification'](
        'dangerous',
        'Harmful',
      );

      expect(result).toEqual({
        answer: expect.stringContaining('ไม่เหมาะสมหรือเป็นอันตราย'),
        suggestQuestion: expect.any(String),
        relatedCourses: [],
      });
      expect(mockQueryPipelineLoggerService.earlyExit).toHaveBeenCalled();
    });

    it('should return null for relevant classification', async () => {
      const result = await useCase['getFallbackAnswerForClassification'](
        'relevant',
        'Good question',
      );

      expect(result).toBeNull();
      expect(mockQueryPipelineLoggerService.earlyExit).not.toHaveBeenCalled();
    });
  });

  describe('transformToCourseOutputDtos', () => {
    it('should transform aggregated courses to DTOs correctly', async () => {
      const result = await useCase['transformToCourseOutputDtos'](
        mockAggregatedCourses,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'course-1',
        subjectCode: 'CS101',
        subjectName: 'Introduction to Machine Learning',
        isGenEd: false,
        campus: expect.objectContaining({
          id: 'campus-1',
        }),
        faculty: expect.objectContaining({
          id: 'faculty-1',
        }),
        score: 1,
        totalClicks: 0,
      });

      expect(mockFacultyRepository.findMany).toHaveBeenCalled();
      expect(mockCampusRepository.findMany).toHaveBeenCalled();
    });
  });
});
