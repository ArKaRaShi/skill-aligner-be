import type { SkillExpansionTestSet } from '../../../types/skill-expansion.types';

// ============================================================================
// TEST DATA FIXTURES FOR SKILL EXPANSION TEST SET LOADER
// ============================================================================

/**
 * Create a mock test set entry
 */
export const createMockTestSetEntry = (
  overrides: Partial<SkillExpansionTestSet['cases'][0]> = {},
): SkillExpansionTestSet['cases'][0] => ({
  queryLogId: 'ql-123',
  question: 'What is object-oriented programming?',
  rawOutput: {
    skillItems: [
      {
        skill: 'Object-Oriented Programming',
        reason: 'User asked about OOP concepts',
        learningOutcome: 'Understand encapsulation, inheritance, polymorphism',
      },
    ],
  },
  ...overrides,
});

/**
 * Create a complete mock test set
 */
export const createMockTestSet = (
  overrides: Partial<SkillExpansionTestSet> = {},
): SkillExpansionTestSet => ({
  name: 'test-set-skill-expansion',
  cases: [
    createMockTestSetEntry({
      queryLogId: 'ql-1',
      question: 'What is OOP?',
    }),
    createMockTestSetEntry({
      queryLogId: 'ql-2',
      question: 'Explain polymorphism',
    }),
  ],
  ...overrides,
});

/**
 * Create a mock test set with multiple skills
 */
export const createMockTestSetWithMultipleSkills =
  (): SkillExpansionTestSet => ({
    name: 'test-set-multiple-skills',
    cases: [
      createMockTestSetEntry({
        queryLogId: 'ql-1',
        question: 'What are the best programming courses?',
        rawOutput: {
          skillItems: [
            {
              skill: 'Python Programming',
              reason: 'User wants programming courses',
            },
            {
              skill: 'Java Programming',
              reason: 'User wants programming courses',
            },
            {
              skill: 'Data Structures',
              reason: 'Fundamental CS concept',
            },
          ],
        },
      }),
    ],
  });

/**
 * Create a mock test set with learning outcomes
 */
export const createMockTestSetWithLearningOutcomes =
  (): SkillExpansionTestSet => ({
    name: 'test-set-with-lo',
    cases: [
      createMockTestSetEntry({
        queryLogId: 'ql-1',
        question: 'What will I learn in OOP courses?',
        rawOutput: {
          skillItems: [
            {
              skill: 'Object-Oriented Programming',
              reason: 'Core concept',
              learningOutcome:
                'Master encapsulation, abstraction, inheritance, and polymorphism',
            },
            {
              skill: 'Design Patterns',
              reason: 'Advanced OOP',
              learningOutcome:
                'Apply Gang of Four design patterns in real projects',
            },
          ],
        },
      }),
    ],
  });

/**
 * Create an empty test set
 */
export const createEmptyTestSet = (): SkillExpansionTestSet => ({
  name: 'empty-test-set',
  cases: [],
});

/**
 * Create a test set with missing required fields (for error testing)
 */
export const createInvalidTestSet = (): any => ({
  name: 'invalid-test-set',
  // Missing 'cases' field
});
