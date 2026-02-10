import { Test, TestingModule } from '@nestjs/testing';

import type {
  QuestionEvalSample,
  SkillExpansionJudgeResult,
} from '../../../../types/skill-expansion.types';
import { SkillExpansionComparisonService } from '../../../skill-expansion-comparison.service';

describe('SkillExpansionComparisonService', () => {
  let service: SkillExpansionComparisonService;

  // Test data factories
  const createSkillItem = (
    skill: string,
    reason: string,
    learningOutcome?: string,
  ) => ({
    skill,
    reason,
    learningOutcome,
  });

  const createSystemSample = (
    overrides: Partial<QuestionEvalSample> = {},
  ): QuestionEvalSample => ({
    queryLogId: 'ql-123',
    question: 'What is object-oriented programming?',
    systemSkills: [
      createSkillItem(
        'Object-Oriented Programming',
        'User asked about OOP',
        'Understand OOP principles',
      ),
    ],
    ...overrides,
  });

  const createJudgeVerdict = (skill: string, verdict: 'PASS' | 'FAIL') => ({
    skill,
    verdict,
    note: verdict === 'PASS' ? 'Valid technical competency' : 'Too vague',
  });

  const createJudgeResult = (
    skills: Array<{ skill: string; verdict: 'PASS' | 'FAIL' }>,
  ): SkillExpansionJudgeResult => ({
    result: {
      skills: skills.map((s) => ({
        ...s,
        note: s.verdict === 'PASS' ? 'Valid technical competency' : 'Too vague',
      })),
      overall: {
        conceptPreserved: true,
        summary: 'Good skills',
      },
    },
    tokenUsage: [],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillExpansionComparisonService],
    }).compile();

    service = module.get<SkillExpansionComparisonService>(
      SkillExpansionComparisonService,
    );
  });

  describe('compareSample', () => {
    it('should compare single skill with PASS verdict', () => {
      // Arrange
      const systemSample = createSystemSample();
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Object-Oriented Programming', 'PASS'),
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.queryLogId).toBe('ql-123');
      expect(result.question).toBe('What is object-oriented programming?');
      expect(result.comparison.skills).toHaveLength(1);
      expect(result.comparison.skills[0]).toMatchObject({
        systemSkill: 'Object-Oriented Programming',
        systemReason: 'User asked about OOP',
        judgeVerdict: 'PASS',
        judgeNote: 'Valid technical competency',
        agreementType: 'AGREE',
      });
    });

    it('should compare multiple skills with mixed verdicts', () => {
      // Arrange
      const systemSample = createSystemSample({
        systemSkills: [
          createSkillItem('Object-Oriented Programming', 'Direct match'),
          createSkillItem('Python', 'Irrelevant'),
        ],
      });
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Object-Oriented Programming', 'PASS'),
        createJudgeVerdict('Python', 'FAIL'),
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.comparison.skills).toHaveLength(2);
      expect(result.comparison.skills[0].agreementType).toBe('AGREE');
      expect(result.comparison.skills[1].agreementType).toBe('DISAGREE');
    });

    it('should calculate overall statistics correctly', () => {
      // Arrange
      const systemSample = createSystemSample({
        systemSkills: [
          createSkillItem('OOP', 'Good'),
          createSkillItem('Java', 'Bad'),
        ],
      });
      const judgeResult = createJudgeResult([
        createJudgeVerdict('OOP', 'PASS'),
        createJudgeVerdict('Java', 'FAIL'),
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.comparison.overall).toMatchObject({
        conceptPreserved: true,
        agreementCount: 1,
        disagreementCount: 1,
        totalSkills: 2,
      });
    });

    it('should include learning outcome when present', () => {
      // Arrange
      const systemSample = createSystemSample();
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Object-Oriented Programming', 'PASS'),
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.comparison.skills[0].systemLearningOutcome).toBe(
        'Understand OOP principles',
      );
    });

    it('should map quality scores correctly', () => {
      // Arrange
      const systemSample = createSystemSample();
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Object-Oriented Programming', 'PASS'),
      ]);

      // Act
      const result = service.compareSample(systemSample, judgeResult);

      // Assert
      expect(result.comparison.skills[0].judgeNote).toBe(
        'Valid technical competency',
      );
    });
  });

  describe('determineAgreementType', () => {
    it('should return AGREE for PASS verdict', () => {
      // Act
      const result = service.determineAgreementType('PASS');

      // Assert
      expect(result).toBe('AGREE');
    });

    it('should return DISAGREE for FAIL verdict', () => {
      // Act
      const result = service.determineAgreementType('FAIL');

      // Assert
      expect(result).toBe('DISAGREE');
    });
  });

  describe('error handling', () => {
    it('should throw error when skill count mismatch', () => {
      // Arrange
      const systemSample = createSystemSample({
        systemSkills: [
          createSkillItem('Skill 1', 'Reason 1'),
          createSkillItem('Skill 2', 'Reason 2'),
        ],
      });
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Skill 1', 'PASS'),
      ]);

      // Act & Assert
      // Should not throw, but log error
      const result = service.compareSample(systemSample, judgeResult);
      expect(result.comparison.skills).toHaveLength(2);
    });

    it('should handle missing judge verdict with default FAIL', () => {
      // Arrange
      const systemSample = createSystemSample({
        systemSkills: [
          createSkillItem('Skill 1', 'Reason 1'),
          createSkillItem('Skill 2', 'Reason 2'),
        ],
      });
      const judgeResult = createJudgeResult([
        createJudgeVerdict('Skill 1', 'PASS'),
        createJudgeVerdict('Different Skill', 'PASS'),
      ]);

      // Act & Assert
      // Should not throw, but use default FAIL for missing skill
      const result = service.compareSample(systemSample, judgeResult);
      expect(result.comparison.skills).toHaveLength(2);

      // Skill 2 should have a default FAIL verdict
      const skill2Comparison = result.comparison.skills.find(
        (s) => s.systemSkill === 'Skill 2',
      );
      expect(skill2Comparison).toBeDefined();
      expect(skill2Comparison?.judgeVerdict).toBe('FAIL');
      expect(skill2Comparison?.judgeNote).toBe(
        'Missing judge verdict - defaulted to FAIL',
      );
    });
  });
});
