import {
  QuestionSetBuilderService,
  QuestionSetItem,
} from '../question-set-builder.service';

describe('QuestionSetBuilderService', () => {
  let service: QuestionSetBuilderService;

  beforeEach(() => {
    service = new QuestionSetBuilderService();
  });

  describe('Constructor', () => {
    it('should initialize with empty questions and typeStats', () => {
      const result = service.build();

      expect(result.questions).toEqual([]);
      expect(result.stats.totalQuestions).toBe(0);
      expect(result.stats.totalThai).toBe(0);
      expect(result.stats.totalEnglish).toBe(0);
    });
  });

  describe('addRelevantParaphrase', () => {
    it('should add relevant paraphrase questions and return self', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          thai: {
            templates: ['อยากเรียนทักษะ {word} ควรเริ่มจากไหน'],
            words: ['programming'],
          },
          english: {
            templates: ['I want to learn {word} skills'],
            words: ['programming'],
          },
        },
        reasoning: 'Test reasoning for {word}',
      };

      const result = service.addRelevantParaphrase(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(2);
      expect(buildResult.questions[0].expectedCategory).toBe('relevant');
      expect(buildResult.questions[0].language).toBe('thai');
      expect(buildResult.questions[0].question).toBe(
        'อยากเรียนทักษะ programming ควรเริ่มจากไหน',
      );
      expect(buildResult.questions[0].reasoning).toBe(
        'Test reasoning for programming',
      );

      expect(buildResult.questions[1].expectedCategory).toBe('relevant');
      expect(buildResult.questions[1].language).toBe('english');
      expect(buildResult.questions[1].question).toBe(
        'I want to learn programming skills',
      );
      expect(buildResult.questions[1].reasoning).toBe(
        'Test reasoning for programming',
      );
    });

    it('should handle only Thai templates', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          thai: {
            templates: ['อยากเรียนทักษะ {word}'],
            words: ['testing'],
          },
        },
        reasoning: 'Thai only reasoning',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].language).toBe('thai');
    });

    it('should handle only English templates', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          english: {
            templates: ['I want to learn {word}'],
            words: ['testing'],
          },
        },
        reasoning: 'English only reasoning',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].language).toBe('english');
    });

    it('should handle multiple words and templates', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          thai: {
            templates: ['ทักษะ {word}', 'เรียน {word}'],
            words: ['testing', 'development'],
          },
        },
        reasoning: 'Multiple words reasoning',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(4); // 2 templates × 2 words
    });
  });

  describe('addIrrelevantParaphrase', () => {
    it('should add irrelevant paraphrase questions and return self', () => {
      const params = {
        type: 'J' as const,
        typeDescription: 'Course-Specific Queries',
        templates: {
          thai: {
            templates: ['คอร์ส {word} สอนอะไรบ้าง'],
            words: ['XYZ'],
          },
        },
        reasoning: 'Irrelevant reasoning',
      };

      const result = service.addIrrelevantParaphrase(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(1);
      expect(buildResult.questions[0].expectedCategory).toBe('irrelevant');
      expect(buildResult.questions[0].language).toBe('thai');
    });
  });

  describe('addDangerousParaphrase', () => {
    it('should add dangerous paraphrase questions and return self', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Direct Skill Request',
        templates: {
          english: {
            templates: ['I want to learn {word}'],
            words: ['dangerous skill'],
          },
        },
        reasoning: 'Dangerous reasoning',
      };

      const result = service.addDangerousParaphrase(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(1);
      expect(buildResult.questions[0].expectedCategory).toBe('dangerous');
      expect(buildResult.questions[0].language).toBe('english');
    });
  });

  describe('addRelevantCustom', () => {
    it('should add relevant custom questions and return self', () => {
      const params = {
        questions: {
          thai: ['คำถามทดสอบ 1', 'คำถามทดสอบ 2'],
          english: ['Test question 1'],
        },
        reasoning: 'Custom reasoning',
      };

      const result = service.addRelevantCustom(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(3);
      expect(buildResult.questions[0].expectedCategory).toBe('relevant');
      expect(buildResult.questions[0].language).toBe('thai');
      expect(buildResult.questions[0].question).toBe('คำถามทดสอบ 1');
      expect(buildResult.questions[2].language).toBe('english');
      expect(buildResult.questions[2].question).toBe('Test question 1');
    });

    it('should handle empty questions object', () => {
      const params = {
        questions: {},
        reasoning: 'Empty questions',
      };

      service.addRelevantCustom(params);
      const result = service.build();

      expect(result.questions).toHaveLength(0);
    });
  });

  describe('addIrrelevantCustom', () => {
    it('should add irrelevant custom questions and return self', () => {
      const params = {
        questions: {
          thai: ['คำถามไม่เกี่ยวข้อง'],
        },
        reasoning: 'Irrelevant custom reasoning',
      };

      const result = service.addIrrelevantCustom(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(1);
      expect(buildResult.questions[0].expectedCategory).toBe('irrelevant');
    });
  });

  describe('addDangerousCustom', () => {
    it('should add dangerous custom questions and return self', () => {
      const params = {
        questions: {
          english: ['Dangerous question'],
        },
        reasoning: 'Dangerous custom reasoning',
      };

      const result = service.addDangerousCustom(params);

      expect(result).toBe(service);

      const buildResult = service.build();
      expect(buildResult.questions).toHaveLength(1);
      expect(buildResult.questions[0].expectedCategory).toBe('dangerous');
    });
  });

  describe('Placeholder replacement behavior', () => {
    it('should replace single word placeholder in questions and reasoning', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          english: {
            templates: ['I want to learn {word}'],
            words: ['programming'],
          },
        },
        reasoning: 'This is about {word}',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe('I want to learn programming');
      expect(result.questions[0].reasoning).toBe('This is about programming');
    });

    it('should replace multiple word placeholders', () => {
      const params = {
        type: 'F' as const,
        typeDescription: 'Multi-word test',
        templates: {
          english: {
            templates: ['Learn {word1} and {word2}'],
            words: [['programming', 'testing']],
          },
        },
        reasoning: 'Skills for {word1} and {word2}',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe(
        'Learn programming and testing',
      );
      expect(result.questions[0].reasoning).toBe(
        'Skills for programming and testing',
      );
    });

    it('should handle multiple occurrences of the same placeholder', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Repeated placeholder test',
        templates: {
          english: {
            templates: ['{word} is important, I love {word}'],
            words: ['programming'],
          },
        },
        reasoning: '{word} {word}',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe(
        'programming is important, I love programming',
      );
      expect(result.questions[0].reasoning).toBe('programming programming');
    });
  });

  describe('Type statistics behavior', () => {
    it('should generate questions with proper type statistics for paraphrase questions', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Test Type A',
        templates: {
          thai: {
            templates: ['ทักษะ {word}'],
            words: ['testing'],
          },
          english: {
            templates: ['{word} skills'],
            words: ['testing'],
          },
        },
        reasoning: 'Test reasoning {word}',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(2);
      expect(result.stats.byType.A).toBeDefined();
      expect(result.stats.byType.A.description).toBe('Test Type A');
      expect(result.stats.byType.A.total).toBe(2);
      expect(result.stats.byType.A.thai).toBe(1);
      expect(result.stats.byType.A.english).toBe(1);
    });

    it('should accumulate type statistics for multiple calls of same type', () => {
      service.addRelevantParaphrase({
        type: 'A',
        typeDescription: 'Type A',
        templates: {
          thai: {
            templates: ['ทักษะ {word}'],
            words: ['testing'],
          },
        },
        reasoning: 'Reasoning A',
      });

      service.addRelevantParaphrase({
        type: 'A',
        typeDescription: 'Type A',
        templates: {
          english: {
            templates: ['{word} skills'],
            words: ['programming'],
          },
        },
        reasoning: 'Reasoning A',
      });

      const result = service.build();

      expect(result.questions).toHaveLength(2);
      expect(result.stats.byType.A.total).toBe(2);
      expect(result.stats.byType.A.thai).toBe(1);
      expect(result.stats.byType.A.english).toBe(1);
    });

    it('should not create type statistics for custom questions', () => {
      service.addRelevantCustom({
        questions: {
          thai: ['คำถาม 1', 'คำถาม 2'],
          english: ['Question 1'],
        },
        reasoning: 'Custom reasoning',
      });

      const result = service.build();

      expect(result.questions).toHaveLength(3);
      expect(Object.keys(result.stats.byType)).toHaveLength(0);
    });
  });

  describe('Private method: calculateStats', () => {
    it('should calculate statistics correctly', () => {
      const service = new QuestionSetBuilderService();

      service.addRelevantCustom({
        questions: { thai: ['คำถาม 1'] },
        reasoning: 'Relevant reasoning',
      });

      service.addIrrelevantCustom({
        questions: { english: ['Question 1'] },
        reasoning: 'Irrelevant reasoning',
      });

      service.addDangerousCustom({
        questions: { thai: ['คำถาม 2'], english: ['Question 2'] },
        reasoning: 'Dangerous reasoning',
      });

      const result = service.build();

      expect(result.stats.totalQuestions).toBe(4);
      expect(result.stats.totalThai).toBe(2);
      expect(result.stats.totalEnglish).toBe(2);
      expect(result.stats.byCategory.relevant.total).toBe(1);
      expect(result.stats.byCategory.relevant.thai).toBe(1);
      expect(result.stats.byCategory.relevant.english).toBe(0);
      expect(result.stats.byCategory.irrelevant.total).toBe(1);
      expect(result.stats.byCategory.irrelevant.thai).toBe(0);
      expect(result.stats.byCategory.irrelevant.english).toBe(1);
      expect(result.stats.byCategory.dangerous.total).toBe(2);
      expect(result.stats.byCategory.dangerous.thai).toBe(1);
      expect(result.stats.byCategory.dangerous.english).toBe(1);
    });
  });

  describe('build', () => {
    it('should reset state after building', () => {
      service.addRelevantCustom({
        questions: { thai: ['คำถาม 1'] },
        reasoning: 'Test reasoning',
      });

      const firstBuild = service.build();
      expect(firstBuild.questions).toHaveLength(1);

      const secondBuild = service.build();
      expect(secondBuild.questions).toHaveLength(0);
    });

    it('should return questions and stats', () => {
      service.addRelevantCustom({
        questions: { thai: ['คำถาม 1'], english: ['Question 1'] },
        reasoning: 'Test reasoning',
      });

      const result = service.build();

      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('stats');
      expect(Array.isArray(result.questions)).toBe(true);
      expect(typeof result.stats).toBe('object');
    });

    it('should create a copy of questions array', () => {
      service.addRelevantCustom({
        questions: { thai: ['คำถาม 1'] },
        reasoning: 'Test reasoning',
      });

      const result = service.build();
      result.questions.push({} as QuestionSetItem);

      const secondResult = service.build();
      expect(secondResult.questions).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates gracefully', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Empty templates',
        templates: {},
        reasoning: 'Empty templates test',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(0);
    });

    it('should handle empty words arrays', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Empty words',
        templates: {
          thai: {
            templates: ['Template {word}'],
            words: [],
          },
        },
        reasoning: 'Empty words test',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(0);
    });

    it('should handle empty templates arrays', () => {
      const params = {
        type: 'A' as const,
        typeDescription: 'Empty template arrays',
        templates: {
          thai: {
            templates: [],
            words: ['word'],
          },
        },
        reasoning: 'Empty template arrays test',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(0);
    });

    it('should handle complex word arrays with multiple elements', () => {
      const params = {
        type: 'F' as const,
        typeDescription: 'Multi-word test',
        templates: {
          english: {
            templates: ['Learn {word1} and {word2} and {word3}'],
            words: [['skill1', 'skill2', 'skill3']],
          },
        },
        reasoning: 'Multi-word reasoning with {word1}, {word2}, and {word3}',
      };

      service.addRelevantParaphrase(params);
      const result = service.build();

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe(
        'Learn skill1 and skill2 and skill3',
      );
      expect(result.questions[0].reasoning).toBe(
        'Multi-word reasoning with skill1, skill2, and skill3',
      );
    });
  });

  describe('Method Chaining', () => {
    it('should support method chaining for fluent interface', () => {
      const result = service
        .addRelevantCustom({
          questions: { thai: ['คำถาม 1'] },
          reasoning: 'Relevant',
        })
        .addIrrelevantCustom({
          questions: { english: ['Question 1'] },
          reasoning: 'Irrelevant',
        })
        .addDangerousCustom({
          questions: { thai: ['คำถาม 2'] },
          reasoning: 'Dangerous',
        })
        .build();

      expect(result.questions).toHaveLength(3);
      expect(result.questions[0].expectedCategory).toBe('relevant');
      expect(result.questions[1].expectedCategory).toBe('irrelevant');
      expect(result.questions[2].expectedCategory).toBe('dangerous');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for question categories', () => {
      service.addRelevantCustom({
        questions: { thai: ['test'] },
        reasoning: 'test',
      });

      const result = service.build();
      const categories = result.questions.map((q) => q.expectedCategory);

      expect(
        categories.every(
          (cat) =>
            cat === 'relevant' || cat === 'irrelevant' || cat === 'dangerous',
        ),
      ).toBe(true);
    });

    it('should enforce correct types for languages', () => {
      service.addRelevantCustom({
        questions: { thai: ['test'], english: ['test'] },
        reasoning: 'test',
      });

      const result = service.build();
      const languages = result.questions.map((q) => q.language);

      expect(
        languages.every((lang) => lang === 'thai' || lang === 'english'),
      ).toBe(true);
    });
  });
});
