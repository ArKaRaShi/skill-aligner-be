import type {
  AggregatedCourseForEval,
  JudgeEvaluationResult,
  JudgeVerdict,
  QuestionEvalSample,
  SystemAction,
  SystemRelevanceScore,
} from '../../../../types/course-relevance-filter.types';
import { CourseComparisonService } from '../../../course-comparison.service';

describe('CourseComparisonService', () => {
  let service: CourseComparisonService;

  beforeEach(() => {
    service = new CourseComparisonService();
  });

  describe('mapScoreToAction', () => {
    it('should map score 0 to DROP', () => {
      expect(service['mapScoreToAction'](0)).toBe('DROP');
    });

    it('should map score 1 to KEEP', () => {
      expect(service['mapScoreToAction'](1)).toBe('KEEP');
    });

    it('should map score 2 to KEEP', () => {
      expect(service['mapScoreToAction'](2)).toBe('KEEP');
    });

    it('should map score 3 to KEEP', () => {
      expect(service['mapScoreToAction'](3)).toBe('KEEP');
    });
  });

  describe('determineAgreementType', () => {
    it('should return BOTH_DROP when DROP + FAIL', () => {
      const result = service['determineAgreementType']('DROP', 'FAIL');
      expect(result).toBe('BOTH_DROP');
    });

    it('should return BOTH_KEEP when KEEP + PASS', () => {
      const result = service['determineAgreementType']('KEEP', 'PASS');
      expect(result).toBe('BOTH_KEEP');
    });

    it('should return CONSERVATIVE_DROP when DROP + PASS', () => {
      const result = service['determineAgreementType']('DROP', 'PASS');
      expect(result).toBe('CONSERVATIVE_DROP');
    });

    it('should return EXPLORATORY_DELTA when KEEP + FAIL', () => {
      const result = service['determineAgreementType']('KEEP', 'FAIL');
      expect(result).toBe('EXPLORATORY_DELTA');
    });
  });

  describe('compareSample', () => {
    // Test data helpers
    const createSystemCourse = (
      overrides: Partial<AggregatedCourseForEval> = {},
    ): AggregatedCourseForEval => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      systemAction: 'KEEP' as SystemAction,
      systemScore: 3 as SystemRelevanceScore,
      systemReason: 'Direct match',
      matchedSkills: [
        {
          skill: 'Python programming',
          score: 3 as SystemRelevanceScore,
          learningOutcomes: [{ id: 'lo-1', name: 'Learn Python' }],
        },
      ],
      allLearningOutcomes: [{ id: 'lo-1', name: 'Learn Python' }],
      ...overrides,
    });

    const createSystemSample = (
      overrides: Partial<QuestionEvalSample> = {},
    ): QuestionEvalSample => ({
      queryLogId: 'query-1',
      question: 'What courses teach Python?',
      courses: [createSystemCourse()],
      ...overrides,
    });

    const createJudgeResult = (
      verdicts: Array<{ code: string; verdict: JudgeVerdict; reason: string }>,
    ): JudgeEvaluationResult => ({
      courses: verdicts,
    });

    it('should compare single course with agreement (BOTH_KEEP)', () => {
      // Arrange
      const systemSample = createSystemSample();
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Teaches Python' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.queryLogId).toBe('query-1');
      expect(result.question).toBe('What courses teach Python?');
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]).toEqual({
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        outcomes: ['Learn Python'],
        matchedSkills: [
          {
            skill: 'Python programming',
            score: 3,
            learningOutcomes: [{ id: 'lo-1', name: 'Learn Python' }],
          },
        ],
        system: {
          score: 3,
          action: 'KEEP',
          reason: 'Direct match',
        },
        judge: {
          verdict: 'PASS',
          reason: 'Teaches Python',
        },
        agreement: true,
        agreementType: 'BOTH_KEEP',
      });
    });

    it('should compare single course with disagreement (EXPLORATORY_DELTA)', () => {
      // Arrange
      const systemSample = createSystemSample();
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'FAIL', reason: 'Irrelevant to question' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.courses[0].agreement).toBe(false);
      expect(result.courses[0].agreementType).toBe('EXPLORATORY_DELTA');
      expect(result.courses[0].system.action).toBe('KEEP');
      expect(result.courses[0].judge.verdict).toBe('FAIL');
    });

    it('should compare single course with disagreement (CONSERVATIVE_DROP)', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({
            subjectCode: 'CS101',
            systemScore: 0 as SystemRelevanceScore,
            systemAction: 'DROP' as SystemAction,
            systemReason: 'Not relevant',
          }),
        ],
      });
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Actually useful' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.courses[0].agreement).toBe(false);
      expect(result.courses[0].agreementType).toBe('CONSERVATIVE_DROP');
      expect(result.courses[0].system.action).toBe('DROP');
      expect(result.courses[0].judge.verdict).toBe('PASS');
    });

    it('should compare single course with agreement (BOTH_DROP)', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({
            subjectCode: 'CS101',
            systemScore: 0 as SystemRelevanceScore,
            systemAction: 'DROP' as SystemAction,
            systemReason: 'Not relevant',
          }),
        ],
      });
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'FAIL', reason: 'Irrelevant' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.courses[0].agreement).toBe(true);
      expect(result.courses[0].agreementType).toBe('BOTH_DROP');
      expect(result.courses[0].system.action).toBe('DROP');
      expect(result.courses[0].judge.verdict).toBe('FAIL');
    });

    it('should compare multiple courses', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({
            subjectCode: 'CS101',
            systemScore: 3,
            systemAction: 'KEEP' as SystemAction,
          }),
          createSystemCourse({
            subjectCode: 'CS102',
            systemScore: 0,
            systemAction: 'DROP' as SystemAction,
          }),
        ],
      });
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Good match' },
        { code: 'CS102', verdict: 'FAIL', reason: 'Irrelevant' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.courses).toHaveLength(2);
      expect(result.courses[0].agreementType).toBe('BOTH_KEEP');
      expect(result.courses[1].agreementType).toBe('BOTH_DROP');
    });

    it('should throw error and log when judge verdict is missing', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({ subjectCode: 'CS101' }),
          createSystemCourse({ subjectCode: 'CS102' }),
        ],
      });
      // Missing CS102 in judge results
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Good match' },
      ]);

      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => {});

      // Act & Assert
      expect(() => service.compareSample(systemSample, judgeResult)).toThrow(
        'Missing judge verdict for course CS102',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Course count mismatch'),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No judge verdict found for course CS102'),
      );
    });

    it('should map systemScore to action when systemAction is missing', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({
            subjectCode: 'CS101',
            systemScore: 2,
            systemAction: undefined, // Missing action
            systemReason: undefined,
          }),
        ],
      });
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Good match' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      // Score 2 should map to KEEP
      expect(result.courses[0].system.action).toBe('KEEP');
      expect(result.courses[0].system.reason).toBe('Score 2 - KEEP');
    });

    it('should extract learning outcomes names correctly', () => {
      // Arrange
      const systemSample = createSystemSample({
        courses: [
          createSystemCourse({
            subjectCode: 'CS101',
            allLearningOutcomes: [
              { id: 'lo-1', name: 'Learn Python basics' },
              { id: 'lo-2', name: 'Build applications' },
              { id: 'lo-3', name: 'Debug code' },
            ],
          }),
        ],
      });
      const judgeResult = createJudgeResult([
        { code: 'CS101', verdict: 'PASS', reason: 'Good' },
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.courses[0].outcomes).toEqual([
        'Learn Python basics',
        'Build applications',
        'Debug code',
      ]);
    });
  });
});
