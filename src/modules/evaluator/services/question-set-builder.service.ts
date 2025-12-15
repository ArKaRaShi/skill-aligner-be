// bunx ts-node --require tsconfig-paths/register prisma/seeds/campus-faculty.seed.ts

export type QuestionCategory = 'relevant' | 'irrelevant' | 'dangerous';
export type Language = 'thai' | 'english';

export type QuestionSetItem = {
  question: string;
  expectedCategory: QuestionCategory;
  reasoning: string;
  language: Language;
};

interface BuildStats {
  totalQuestions: number;
  totalThai: number;
  totalEnglish: number;
  byCategory: {
    relevant: { total: number; thai: number; english: number };
    irrelevant: { total: number; thai: number; english: number };
    dangerous: { total: number; thai: number; english: number };
  };
  byType: Record<
    string,
    {
      description: string;
      total: number;
      thai: number;
      english: number;
    }
  >;
}

interface ParaphraseParams<T extends string> {
  type: T;
  typeDescription: string;
  templates: {
    thai?: {
      templates: string[];
      words: string[] | string[][];
    };
    english?: {
      templates: string[];
      words: string[] | string[][];
    };
  };
  reasoning: string;
}

interface CustomParams {
  questions: {
    thai?: string[];
    english?: string[];
  };
  reasoning: string;
}

type DangerousParaphraseParams = ParaphraseParams<
  'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
>;

export class QuestionSetBuilderService {
  private questions: QuestionSetItem[] = [];
  private typeStats: Record<
    string,
    { description: string; total: number; thai: number; english: number }
  > = {};

  addRelevantParaphrase(
    params: ParaphraseParams<
      'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
    >,
  ): this {
    this.generateParaphraseQuestions({
      category: 'relevant',
      type: params.type,
      typeDescription: params.typeDescription,
      templates: params.templates,
      reasoning: params.reasoning,
    });

    return this;
  }

  addIrrelevantParaphrase(
    params: ParaphraseParams<'J' | 'K' | 'L' | 'M' | 'N' | 'O'>,
  ): this {
    this.generateParaphraseQuestions({
      category: 'irrelevant',
      type: params.type,
      typeDescription: params.typeDescription,
      templates: params.templates,
      reasoning: params.reasoning,
    });

    return this;
  }

  addDangerousParaphrase(params: DangerousParaphraseParams): this {
    this.generateParaphraseQuestions({
      category: 'dangerous',
      type: params.type,
      typeDescription: params.typeDescription,
      templates: params.templates,
      reasoning: params.reasoning,
    });

    return this;
  }

  addRelevantCustom(params: CustomParams): this {
    this.generateCustomQuestions({
      category: 'relevant',
      questions: params.questions,
      reasoning: params.reasoning,
    });

    return this;
  }

  addIrrelevantCustom(params: CustomParams): this {
    this.generateCustomQuestions({
      category: 'irrelevant',
      questions: params.questions,
      reasoning: params.reasoning,
    });

    return this;
  }

  addDangerousCustom(params: CustomParams): this {
    this.generateCustomQuestions({
      category: 'dangerous',
      questions: params.questions,
      reasoning: params.reasoning,
    });

    return this;
  }

  private generateParaphraseQuestions(params: {
    category: QuestionCategory;
    type: string;
    typeDescription: string;
    templates: {
      thai?: {
        templates: string[];
        words: string[] | string[][];
      };
      english?: {
        templates: string[];
        words: string[] | string[][];
      };
    };
    reasoning: string;
  }): void {
    const { category, templates, reasoning, type, typeDescription } = params;

    if (!this.typeStats[type]) {
      this.typeStats[type] = {
        description: typeDescription,
        total: 0,
        thai: 0,
        english: 0,
      };
    }

    if (templates.thai) {
      for (const template of templates.thai.templates) {
        for (const wordData of templates.thai.words) {
          const question = this.replacePlaceholders(template, wordData);
          const processedReasoning = this.processReasoning(reasoning, wordData);
          this.questions.push({
            question,
            expectedCategory: category,
            reasoning: processedReasoning,
            language: 'thai',
          });
          this.typeStats[type].total++;
          this.typeStats[type].thai++;
        }
      }
    }

    if (templates.english) {
      for (const template of templates.english.templates) {
        for (const wordData of templates.english.words) {
          const question = this.replacePlaceholders(template, wordData);
          const processedReasoning = this.processReasoning(reasoning, wordData);
          this.questions.push({
            question,
            expectedCategory: category,
            reasoning: processedReasoning,
            language: 'english',
          });
          this.typeStats[type].total++;
          this.typeStats[type].english++;
        }
      }
    }
  }

  private generateCustomQuestions(params: {
    category: QuestionCategory;
    questions: {
      thai?: string[];
      english?: string[];
    };
    reasoning: string;
  }): void {
    const { category, questions, reasoning } = params;

    // Generate Thai questions
    if (questions.thai) {
      for (const question of questions.thai) {
        this.questions.push({
          question,
          expectedCategory: category,
          reasoning,
          language: 'thai',
        });
      }
    }

    // Generate English questions
    if (questions.english) {
      for (const question of questions.english) {
        this.questions.push({
          question,
          expectedCategory: category,
          reasoning,
          language: 'english',
        });
      }
    }
  }

  private replacePlaceholders(
    template: string,
    wordData: string | string[],
  ): string {
    if (Array.isArray(wordData)) {
      let result = template;
      wordData.forEach((word, index) => {
        const placeholder = `{word${index + 1}}`;
        result = result.replace(new RegExp(placeholder, 'g'), word);
      });
      return result;
    } else {
      return template.replace(/{word}/g, wordData);
    }
  }

  private processReasoning(
    reasoning: string,
    wordData: string | string[],
  ): string {
    if (Array.isArray(wordData)) {
      let result = reasoning;
      wordData.forEach((word, index) => {
        const placeholder = `{word${index + 1}}`;
        result = result.replace(new RegExp(placeholder, 'g'), word);
      });
      // Also replace single {word} with joined words
      result = result.replace(/{word}/g, wordData.join(' and '));
      return result;
    } else {
      return reasoning.replace(/{word}/g, wordData);
    }
  }

  private calculateStats(): BuildStats {
    const stats: BuildStats = {
      totalQuestions: this.questions.length,
      totalThai: 0,
      totalEnglish: 0,
      byCategory: {
        relevant: { total: 0, thai: 0, english: 0 },
        irrelevant: { total: 0, thai: 0, english: 0 },
        dangerous: { total: 0, thai: 0, english: 0 },
      },
      byType: { ...this.typeStats },
    };

    for (const question of this.questions) {
      if (question.language === 'thai') {
        stats.totalThai++;
      } else if (question.language === 'english') {
        stats.totalEnglish++;
      }

      stats.byCategory[question.expectedCategory].total++;
      if (question.language === 'thai') {
        stats.byCategory[question.expectedCategory].thai++;
      } else if (question.language === 'english') {
        stats.byCategory[question.expectedCategory].english++;
      }
    }

    return stats;
  }

  build(): { questions: QuestionSetItem[]; stats: BuildStats } {
    const stats = this.calculateStats();
    const questions = [...this.questions];

    // Reset for next build
    this.questions = [];
    this.typeStats = {};

    return { questions, stats };
  }
}

// Sample usage:
const { stats } = new QuestionSetBuilderService().build();

// Log statistics
console.log('=== Question Set Statistics ===');
console.log(`Total questions: ${stats.totalQuestions}`);
console.log(`Total Thai: ${stats.totalThai}`);
console.log(`Total English: ${stats.totalEnglish}`);
console.log('\n=== By Category ===');
console.log(
  `Relevant: ${stats.byCategory.relevant.total} total (${stats.byCategory.relevant.thai} Thai, ${stats.byCategory.relevant.english} English)`,
);
console.log(
  `Irrelevant: ${stats.byCategory.irrelevant.total} total (${stats.byCategory.irrelevant.thai} Thai, ${stats.byCategory.irrelevant.english} English)`,
);
console.log(
  `Dangerous: ${stats.byCategory.dangerous.total} total (${stats.byCategory.dangerous.thai} Thai, ${stats.byCategory.dangerous.english} English)`,
);
console.log('\n=== By Type ===');
Object.entries(stats.byType).forEach(([type, typeStats]) => {
  console.log(
    `${type} (${typeStats.description}): ${typeStats.total} total (${typeStats.thai} Thai, ${typeStats.english} English)`,
  );
});

// bunx ts-node --require tsconfig-paths/register src/modules/evaluator/services/question-set-builder.service.ts
