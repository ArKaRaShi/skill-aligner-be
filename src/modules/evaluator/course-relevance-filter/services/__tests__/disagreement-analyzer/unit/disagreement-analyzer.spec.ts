import { DisagreementAnalyzerService } from '../../../disagreement-analyzer.service';
import {
  createMockCourseRecord,
  createMockSampleRecord,
} from '../../fixtures/course-filter-eval.fixtures';

describe('DisagreementAnalyzerService', () => {
  let analyzer: DisagreementAnalyzerService;

  beforeEach(() => {
    analyzer = new DisagreementAnalyzerService();
  });

  describe('analyzeDisagreements', () => {
    it('should calculate disagreement rate correctly', () => {
      // Arrange - 4 courses, 2 disagreements
      const records = createMockSampleRecord([
        createMockCourseRecord({
          system: { score: 3, action: 'KEEP', reason: 'Good' },
          judge: { verdict: 'PASS', reason: 'Good' },
          agreement: true,
          agreementType: 'BOTH_KEEP',
        }),
        createMockCourseRecord({
          system: { score: 2, action: 'KEEP', reason: 'Fair' },
          judge: { verdict: 'FAIL', reason: 'Too tangential' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          judge: { verdict: 'FAIL', reason: 'Irrelevant' },
          agreement: true,
          agreementType: 'BOTH_DROP',
        }),
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          judge: { verdict: 'PASS', reason: 'Actually useful tool' },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.totalDisagreements).toBe(2);
      expect(result.totalSamples).toBe(1);
      expect(result.disagreementRate).toBe(0.5); // 2/4
    });

    it('should analyze exploratory delta disagreements', () => {
      // Arrange
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'CS101',
          subjectName: 'Introduction to Python',
          system: { score: 1, action: 'KEEP', reason: 'Teaches Python' },
          judge: { verdict: 'FAIL', reason: 'Too basic for advanced user' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          subjectCode: 'CS102',
          subjectName: 'Advanced Python',
          system: { score: 3, action: 'KEEP', reason: 'Direct match' },
          judge: { verdict: 'PASS', reason: 'Perfect fit' },
          agreement: true,
          agreementType: 'BOTH_KEEP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.byType.EXPLORATORY_DELTA.count).toBe(1);
      expect(result.byType.EXPLORATORY_DELTA.description).toBe(
        'System keeps courses that judge would drop (system is too exploratory)',
      );
      expect(result.byType.EXPLORATORY_DELTA.bySystemScore.score1).toBe(1);
      expect(result.byType.EXPLORATORY_DELTA.examples).toHaveLength(1);
      expect(result.byType.EXPLORATORY_DELTA.examples[0].subjectCode).toBe(
        'CS101',
      );
    });

    it('should analyze conservative drop disagreements', () => {
      // Arrange
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'MATH201',
          subjectName: 'Linear Algebra for Data Science',
          system: { score: 0, action: 'DROP', reason: 'Not directly relevant' },
          judge: { verdict: 'PASS', reason: 'Enabling tool for the user' },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.byType.CONSERVATIVE_DROP.count).toBe(1);
      expect(result.byType.CONSERVATIVE_DROP.description).toBe(
        'System drops courses that judge would keep (system is too strict)',
      );
      expect(result.byType.CONSERVATIVE_DROP.examples).toHaveLength(1);
      expect(result.byType.CONSERVATIVE_DROP.examples[0].subjectCode).toBe(
        'MATH201',
      );
    });

    it('should identify foundational overkeep pattern', () => {
      // Arrange - Multiple intro courses kept by system
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'CS101',
          subjectName: 'Introduction to Programming',
          system: { score: 1, action: 'KEEP', reason: 'Good intro' },
          judge: { verdict: 'FAIL', reason: 'Too basic for experienced user' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          subjectCode: 'CS102',
          subjectName: 'Elementary Python',
          system: { score: 1, action: 'KEEP', reason: 'Teaches basics' },
          judge: { verdict: 'FAIL', reason: 'Assumes no prior knowledge' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      const exploratoryPatterns =
        result.byType.EXPLORATORY_DELTA.commonPatterns;
      const foundationalPattern = exploratoryPatterns.find(
        (p) => p.pattern === 'FOUNDATIONAL_OVERKEEP',
      );
      expect(foundationalPattern).toBeDefined();
      expect(foundationalPattern?.count).toBe(2);
      expect(foundationalPattern?.description).toContain('foundational');
    });

    it('should identify sibling misclassification pattern', () => {
      // Arrange - Sibling topics
      const records = createMockSampleRecord([
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
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      const exploratoryPatterns =
        result.byType.EXPLORATORY_DELTA.commonPatterns;
      const siblingPattern = exploratoryPatterns.find(
        (p) => p.pattern === 'SIBLING_MISCLASSIFICATION',
      );
      expect(siblingPattern).toBeDefined();
      expect(siblingPattern?.count).toBe(1);
    });

    it('should identify contextual overalignment pattern', () => {
      // Arrange
      const records = createMockSampleRecord([
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

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      const exploratoryPatterns =
        result.byType.EXPLORATORY_DELTA.commonPatterns;
      const contextPattern = exploratoryPatterns.find(
        (p) => p.pattern === 'CONTEXTUAL_OVERALIGNMENT',
      );
      expect(contextPattern).toBeDefined();
      expect(contextPattern?.count).toBe(1);
    });

    it('should identify enabling tool underdrop pattern', () => {
      // Arrange
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'PYTHON101',
          subjectName: 'Python for Biologists',
          system: { score: 0, action: 'DROP', reason: 'Not biology content' },
          judge: {
            verdict: 'PASS',
            reason: 'Useful tool that empowers the biologist',
          },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      const conservativePatterns =
        result.byType.CONSERVATIVE_DROP.commonPatterns;
      const enablingPattern = conservativePatterns.find(
        (p) => p.pattern === 'ENABLING_TOOL_UNDERDROP',
      );
      expect(enablingPattern).toBeDefined();
      expect(enablingPattern?.count).toBe(1);
    });

    it('should identify valid pivot rejection pattern', () => {
      // Arrange
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'MGT401',
          subjectName: 'Management for Engineers',
          system: { score: 0, action: 'DROP', reason: 'Not engineering' },
          judge: {
            verdict: 'PASS',
            reason: 'Valid logical career expansion for engineers',
          },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      const conservativePatterns =
        result.byType.CONSERVATIVE_DROP.commonPatterns;
      const pivotPattern = conservativePatterns.find(
        (p) => p.pattern === 'VALID_PIVOT_REJECTION',
      );
      expect(pivotPattern).toBeDefined();
      expect(pivotPattern?.count).toBe(1);
    });

    it('should generate insights for exploratory system', () => {
      // Arrange - Mostly exploratory deltas
      const records = createMockSampleRecord([
        createMockCourseRecord({
          system: { score: 1, action: 'KEEP', reason: 'Maybe useful' },
          judge: { verdict: 'FAIL', reason: 'Not relevant' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          system: { score: 2, action: 'KEEP', reason: 'Could be useful' },
          judge: { verdict: 'FAIL', reason: 'Tangential' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          judge: { verdict: 'FAIL', reason: 'Correct drop' },
          agreement: true,
          agreementType: 'BOTH_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.insights.systemCharacter).toContain('exploratory');
      expect(result.insights.recommendation).toContain('tightening');
    });

    it('should generate insights for conservative system', () => {
      // Arrange - Mostly conservative drops
      const records = createMockSampleRecord([
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          judge: { verdict: 'PASS', reason: 'Actually useful' },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Not relevant' },
          judge: { verdict: 'PASS', reason: 'Enabling tool' },
          agreement: false,
          agreementType: 'CONSERVATIVE_DROP',
        }),
        createMockCourseRecord({
          system: { score: 1, action: 'KEEP', reason: 'Good match' },
          judge: { verdict: 'PASS', reason: 'Good' },
          agreement: true,
          agreementType: 'BOTH_KEEP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.insights.systemCharacter).toContain('conservative');
      expect(result.insights.recommendation).toContain('relaxing');
    });

    it('should handle no disagreements gracefully', () => {
      // Arrange - All agreements
      const records = createMockSampleRecord([
        createMockCourseRecord({
          system: { score: 3, action: 'KEEP', reason: 'Good' },
          judge: { verdict: 'PASS', reason: 'Good' },
          agreement: true,
          agreementType: 'BOTH_KEEP',
        }),
        createMockCourseRecord({
          system: { score: 0, action: 'DROP', reason: 'Bad' },
          judge: { verdict: 'FAIL', reason: 'Bad' },
          agreement: true,
          agreementType: 'BOTH_DROP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.totalDisagreements).toBe(0);
      expect(result.disagreementRate).toBe(0);
      expect(result.byType.EXPLORATORY_DELTA.count).toBe(0);
      expect(result.byType.CONSERVATIVE_DROP.count).toBe(0);
      expect(result.insights.systemCharacter).toContain('Perfect agreement');
    });

    it('should limit examples to 5 per type', () => {
      // Arrange - 10 exploratory deltas
      const courses: ReturnType<typeof createMockCourseRecord>[] = [];
      for (let i = 0; i < 10; i++) {
        courses.push(
          createMockCourseRecord({
            subjectCode: `CS${i}`,
            system: { score: 1, action: 'KEEP', reason: 'Maybe' },
            judge: { verdict: 'FAIL', reason: 'No' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
        );
      }
      const records = createMockSampleRecord(courses);

      // Act
      const result = analyzer.analyzeDisagreements([records]);

      // Assert
      expect(result.byType.EXPLORATORY_DELTA.examples).toHaveLength(5);
    });
  });

  describe('analyzeExploratoryDelta', () => {
    it('should categorize exploratory delta cases', () => {
      // Arrange
      const records = createMockSampleRecord([
        createMockCourseRecord({
          subjectCode: 'CS101',
          subjectName: 'Introduction to Programming',
          system: { score: 1, action: 'KEEP', reason: 'Good match' },
          judge: { verdict: 'FAIL', reason: 'Too basic for user level' },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
        createMockCourseRecord({
          subjectCode: 'CS201',
          subjectName: 'Software Engineering',
          system: { score: 2, action: 'KEEP', reason: 'Good match' },
          judge: {
            verdict: 'FAIL',
            reason: 'Related but not directly relevant',
          },
          agreement: false,
          agreementType: 'EXPLORATORY_DELTA',
        }),
      ]);

      // Act
      const result = analyzer.analyzeExploratoryDelta([records]);

      // Assert
      expect(result.totalCases).toBe(2);
      expect(result.categories.FOUNDATIONAL_OVERKEEP.count).toBe(1);
      expect(result.categories.SIBLING_MISCLASSIFICATION.count).toBe(1);
    });

    it('should generate insights based on dominant category', () => {
      // Arrange - Mostly foundational overkeep
      const courses: ReturnType<typeof createMockCourseRecord>[] = [];
      for (let i = 0; i < 5; i++) {
        courses.push(
          createMockCourseRecord({
            subjectCode: `CS${i}`,
            subjectName: `Introduction to Course ${i}`,
            system: { score: 1, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'FAIL', reason: 'Too basic' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
        );
      }
      const records = createMockSampleRecord(courses);

      // Act
      const result = analyzer.analyzeExploratoryDelta([records]);

      // Assert
      expect(result.insights.weakness).toContain('foundational');
      expect(result.insights.recommendation).toContain('introductory');
    });

    it('should limit examples to 3 per category', () => {
      // Arrange - 5 foundational cases
      const courses: ReturnType<typeof createMockCourseRecord>[] = [];
      for (let i = 0; i < 5; i++) {
        courses.push(
          createMockCourseRecord({
            subjectCode: `INTRO${i}`,
            subjectName: 'Introduction to Basics',
            system: { score: 1, action: 'KEEP', reason: 'Good match' },
            judge: { verdict: 'FAIL', reason: 'Too basic' },
            agreement: false,
            agreementType: 'EXPLORATORY_DELTA',
          }),
        );
      }
      const records = createMockSampleRecord(courses);

      // Act
      const result = analyzer.analyzeExploratoryDelta([records]);

      // Assert
      expect(result.categories.FOUNDATIONAL_OVERKEEP.examples).toHaveLength(3);
    });

    it('should handle empty exploratory delta cases', () => {
      // Arrange - No exploratory deltas
      const records = createMockSampleRecord([
        createMockCourseRecord({
          system: { score: 3, action: 'KEEP', reason: 'Direct match' },
          judge: { verdict: 'PASS', reason: 'Good' },
          agreement: true,
          agreementType: 'BOTH_KEEP',
        }),
      ]);

      // Act
      const result = analyzer.analyzeExploratoryDelta([records]);

      // Assert
      expect(result.totalCases).toBe(0);
      expect(result.categories.FOUNDATIONAL_OVERKEEP.count).toBe(0);
      expect(result.categories.SIBLING_MISCLASSIFICATION.count).toBe(0);
      expect(result.categories.CONTEXTUAL_OVERALIGNMENT.count).toBe(0);
      expect(result.insights.strength).toContain('No exploratory delta');
    });
  });
});
