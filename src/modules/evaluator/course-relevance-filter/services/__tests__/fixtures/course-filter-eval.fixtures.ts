import type {
  AgreementType,
  CourseComparisonRecord,
  FinalMetricsFile,
  JudgeVerdict,
  MatchedSkill,
  MetricsFile,
  SampleEvaluationRecord,
  SystemAction,
  SystemRelevanceScore,
} from '../../../types/course-relevance-filter.types';

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

/**
 * Create a mock matched skill
 */
export const createMockMatchedSkill = (
  overrides: Partial<MatchedSkill> = {},
): MatchedSkill => ({
  skill: 'Python programming',
  score: 3 as SystemRelevanceScore,
  learningOutcomes: [
    { id: 'lo-1', name: 'Learn Python basics' },
    { id: 'lo-2', name: 'Build applications' },
  ],
  ...overrides,
});

/**
 * Create a mock course comparison record
 */
export const createMockCourseRecord = (
  overrides: Partial<{
    subjectCode: string;
    subjectName: string;
    outcomes: string[];
    matchedSkills: MatchedSkill[];
    system: {
      score: SystemRelevanceScore;
      action: SystemAction;
      reason: string;
    };
    judge: {
      verdict: JudgeVerdict;
      reason: string;
    };
    agreement: boolean;
    agreementType: AgreementType;
  }> = {},
): CourseComparisonRecord => ({
  subjectCode: 'CS101',
  subjectName: 'Introduction to Python',
  outcomes: ['Learn Python basics', 'Build applications'],
  matchedSkills: [createMockMatchedSkill()],
  system: {
    score: 3 as SystemRelevanceScore,
    action: 'KEEP' as SystemAction,
    reason: 'Direct match to user interest',
  },
  judge: {
    verdict: 'PASS' as JudgeVerdict,
    reason: 'Teaches exactly what user asked for',
  },
  agreement: true,
  agreementType: 'BOTH_KEEP' as AgreementType,
  ...overrides,
});

/**
 * Create a mock sample evaluation record
 */
export const createMockSampleRecord = (
  courses: CourseComparisonRecord[] = [],
  overrides: Partial<{
    queryLogId: string;
    question: string;
  }> = {},
): SampleEvaluationRecord => ({
  queryLogId: 'query-log-001',
  question: 'How do I learn Python programming?',
  courses: courses.length > 0 ? courses : [createMockCourseRecord()],
  ...overrides,
});

// ============================================================================
// PRE-BUILT TEST SCENARIOS
// ============================================================================

/**
 * Create a test scenario with all four agreement types
 */
export const createMixedAgreementScenario = (): SampleEvaluationRecord => {
  return createMockSampleRecord([
    createMockCourseRecord({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      system: { score: 3, action: 'KEEP', reason: 'Direct match' },
      judge: { verdict: 'PASS', reason: 'Perfect fit' },
      agreement: true,
      agreementType: 'BOTH_KEEP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS102',
      subjectName: 'Advanced Python',
      system: { score: 0, action: 'DROP', reason: 'Not relevant' },
      judge: { verdict: 'FAIL', reason: 'Irrelevant' },
      agreement: true,
      agreementType: 'BOTH_DROP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS103',
      subjectName: 'Python for Beginners',
      system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
      judge: { verdict: 'FAIL', reason: 'Too basic for experienced user' },
      agreement: false,
      agreementType: 'EXPLORATORY_DELTA',
    }),
    createMockCourseRecord({
      subjectCode: 'MATH201',
      subjectName: 'Linear Algebra for Data Science',
      system: { score: 0, action: 'DROP', reason: 'Not directly relevant' },
      judge: { verdict: 'PASS', reason: 'Enabling tool for the user' },
      agreement: false,
      agreementType: 'CONSERVATIVE_DROP',
    }),
  ]);
};

/**
 * Create a test scenario with perfect agreement
 */
export const createPerfectAgreementScenario = (): SampleEvaluationRecord => {
  return createMockSampleRecord([
    createMockCourseRecord({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      system: { score: 3, action: 'KEEP', reason: 'Direct match' },
      judge: { verdict: 'PASS', reason: 'Perfect fit' },
      agreement: true,
      agreementType: 'BOTH_KEEP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS102',
      subjectName: 'Advanced Python',
      system: { score: 0, action: 'DROP', reason: 'Not relevant' },
      judge: { verdict: 'FAIL', reason: 'Irrelevant' },
      agreement: true,
      agreementType: 'BOTH_DROP',
    }),
  ]);
};

/**
 * Create a test scenario with score distribution
 */
export const createScoreDistributionScenario = (): SampleEvaluationRecord => {
  return createMockSampleRecord([
    createMockCourseRecord({
      subjectCode: 'CS101',
      subjectName: 'Course Score 0',
      system: { score: 0, action: 'DROP', reason: 'Not relevant' },
      judge: { verdict: 'FAIL', reason: 'Irrelevant' },
      agreement: true,
      agreementType: 'BOTH_DROP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS102',
      subjectName: 'Course Score 1',
      system: { score: 1, action: 'KEEP', reason: 'Low relevance' },
      judge: { verdict: 'PASS', reason: 'Useful' },
      agreement: true,
      agreementType: 'BOTH_KEEP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS103',
      subjectName: 'Course Score 2',
      system: { score: 2, action: 'KEEP', reason: 'Medium relevance' },
      judge: { verdict: 'PASS', reason: 'Useful' },
      agreement: true,
      agreementType: 'BOTH_KEEP',
    }),
    createMockCourseRecord({
      subjectCode: 'CS104',
      subjectName: 'Course Score 3',
      system: { score: 3, action: 'KEEP', reason: 'High relevance' },
      judge: { verdict: 'PASS', reason: 'Perfect fit' },
      agreement: true,
      agreementType: 'BOTH_KEEP',
    }),
  ]);
};

/**
 * Create a test scenario with exploratory delta patterns
 */
export const createExploratoryDeltaScenario = (): SampleEvaluationRecord => {
  return createMockSampleRecord([
    createMockCourseRecord({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Programming',
      system: { score: 1, action: 'KEEP', reason: 'Good intro' },
      judge: { verdict: 'FAIL', reason: 'Too basic for experienced user' },
      agreement: false,
      agreementType: 'EXPLORATORY_DELTA',
    }),
    createMockCourseRecord({
      subjectCode: 'CS201',
      subjectName: 'Software Engineering',
      system: { score: 2, action: 'KEEP', reason: 'Related to tech' },
      judge: {
        verdict: 'FAIL',
        reason: 'Related but not directly relevant to user interest',
      },
      agreement: false,
      agreementType: 'EXPLORATORY_DELTA',
    }),
    createMockCourseRecord({
      subjectCode: 'HIST301',
      subjectName: 'History of Computing',
      system: { score: 1, action: 'KEEP', reason: 'Mentions computing' },
      judge: {
        verdict: 'FAIL',
        reason: 'Only tangentially related through context mention',
      },
      agreement: false,
      agreementType: 'EXPLORATORY_DELTA',
    }),
  ]);
};

// ============================================================================
// MOCK METRICS DATA
// ============================================================================

/**
 * Create mock iteration metrics for testing
 */
export const createMockMetricsFile = (): MetricsFile => ({
  iteration: 1,
  timestamp: '2025-01-01T00:00:00.000Z',
  sampleCount: 2,
  totalCoursesEvaluated: 5,
  overallAgreementRate: {
    value: 0.8,
    numerator: 4,
    denominator: 5,
    description: 'Total matches / Total samples',
  },
  noiseRemovalEfficiency: {
    value: 0.9,
    numerator: 9,
    denominator: 10,
    description: 'When System=DROP, Judge also FAIL',
  },
  exploratoryRecall: {
    value: 0.1,
    numerator: 1,
    denominator: 10,
    description: 'System=KEEP but Judge=FAIL',
  },
  conservativeDropRate: {
    value: 0,
    numerator: 0,
    denominator: 10,
    description: 'System=DROP but Judge=PASS',
  },
  systemScoreDistribution: {
    score0: 1,
    score1: 1,
    score2: 1,
    score3: 2,
  },
  confusionMatrix: {
    label: 'Judge (rows) vs System Action (cols)',
    matrix: [
      [1, 0],
      [1, 3],
    ] as [[number, number], [number, number]],
    totals: {
      systemDrop: 1,
      systemKeep: 4,
      judgeFail: 1,
      judgePass: 4,
    },
  },
});

/**
 * Create mock final metrics for testing
 */
export const createMockFinalMetricsFile = (): FinalMetricsFile => ({
  iterations: 3,
  timestamp: '2025-01-01T00:00:00.000Z',
  aggregateMetrics: {
    overallAgreementRate: {
      mean: 0.75,
      min: 0.7,
      max: 0.8,
      stdDev: 0.05,
    },
    noiseRemovalEfficiency: {
      mean: 0.85,
      min: 0.8,
      max: 0.9,
      stdDev: 0.05,
    },
    exploratoryRecall: {
      mean: 0.15,
      min: 0.1,
      max: 0.2,
      stdDev: 0.05,
    },
  },
  perIterationMetrics: [
    createMockMetricsFile(),
    createMockMetricsFile(),
    createMockMetricsFile(),
  ],
});
