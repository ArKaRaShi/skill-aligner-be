import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationHashUtil } from '../../shared/utils/evaluation-hash.util';
import { CourseRetrieverEvaluator } from '../evaluators/course-retriever.evaluator';
import {
  CourseRetrieverTestCase,
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
  RunTestSetInput,
  SkillDeduplicationStats,
  SkillEvaluationGroup,
} from '../types/course-retrieval.types';
import type { CourseRetrievalProgressEntry } from '../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from './course-retrieval-metrics-calculator.service';
import { CourseRetrievalResultManagerService } from './course-retrieval-result-manager.service';

/**
 * Additional context for course retriever evaluations
 */
export type CourseRetrievalEvaluationContext = {
  iterationNumber?: number;
  prefixDir?: string;
  judgeModel?: string;
  judgeProvider?: string;
};

/**
 * Service for running course retrieval evaluations.
 *
 * Handles pipeline execution, result persistence, and file organization.
 * Uses direct class injection (modern pattern) instead of contract-based tokens.
 *
 * **Skill-Level Deduplication:**
 * Progress tracking is done at SKILL level (not question level).
 * Each unique skill is evaluated once, regardless of how many questions
 * contain that skill. The question is only used to derive the skill and
 * does not affect the evaluation itself.
 *
 * @example
 * ```typescript
 * const runner = appContext.get(CourseRetrievalRunnerService);
 * await runner.runTestSet({ testSet, iterationNumber: 1 });
 * ```
 */
/**
 * Default concurrency limit for parallel group evaluation
 *
 * Number of deduplication groups to process simultaneously.
 * Higher concurrency = faster evaluation but more LLM requests in-flight.
 *
 * Trade-offs:
 * - c=1: Sequential, easiest debugging
 * - c=3: Good balance (default)
 * - c=5+: Fast, but may hit rate limits
 */
const DEFAULT_CONCURRENCY = 5;

@Injectable()
export class CourseRetrievalRunnerService {
  private readonly logger = new Logger(CourseRetrievalRunnerService.name);
  private readonly baseDir: string;
  private readonly concurrency = DEFAULT_CONCURRENCY;

  constructor(
    private readonly evaluator: CourseRetrieverEvaluator,
    private readonly resultManager: CourseRetrievalResultManagerService,
    @Optional() baseDir?: string,
  ) {
    this.baseDir = baseDir ?? 'data/evaluation/course-retriever';
  }

  /**
   * Run a complete test set with multiple test cases
   *
   * This is the main entry point for running batch evaluations.
   * Implements skill-level deduplication: groups test cases by skill only
   * (not skill + courses), evaluating each unique skill once.
   *
   * **Key insight:** The question is only used to derive the skill.
   * Once the skill is extracted, the question doesn't affect the evaluation.
   * Therefore, we evaluate each unique skill exactly once.
   *
   * Progress tracking: Loads existing progress at the start, checks for
   * completed skills (by skill hash), skips evaluations if already completed,
   * and saves progress after each skill for crash recovery.
   *
   * @param input - Test set and iteration configuration
   */
  async runTestSet(input: RunTestSetInput): Promise<void> {
    const { testSet, iterationNumber } = input;
    const startTime = Date.now();

    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Running ${testSet.name}`);
    this.logger.log(`Test cases: ${testSet.cases.length}`);
    this.logger.log(`Iteration: ${iterationNumber}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Ensure directory structure exists
    await this.resultManager.ensureDirectoryStructure(testSet.name);

    // NEW: Group test cases by SKILL ONLY (not skill + courses)
    const skillGroups = this.groupBySkill(testSet.cases);
    const totalQuestions = testSet.cases.length;
    const totalSkillsExtracted = testSet.cases.length; // One skill per test case
    const uniqueSkills = skillGroups.size;
    const duplicatesRemoved = totalSkillsExtracted - uniqueSkills;
    const deduplicationRate =
      totalSkillsExtracted > 0 ? duplicatesRemoved / totalSkillsExtracted : 0;

    // Build skill frequency map
    const skillFrequency = new Map<string, number>();
    for (const [skill, group] of skillGroups) {
      skillFrequency.set(skill, group.occurrenceCount);
    }

    const deduplicationStats: SkillDeduplicationStats = {
      totalQuestions,
      totalSkillsExtracted,
      uniqueSkillsEvaluated: uniqueSkills,
      deduplicationRate,
      skillFrequency,
    };

    this.logger.log(`Test cases: ${totalQuestions}`);
    this.logger.log(`Unique skills: ${uniqueSkills}`);
    this.logger.log(
      `Skill deduplication: ${duplicatesRemoved}/${totalSkillsExtracted} duplicates removed (${(deduplicationRate * 100).toFixed(1)}% reduction)`,
    );

    // Load existing progress (if any)
    const progress = await this.resultManager.loadProgress({
      testSetName: testSet.name,
      iterationNumber,
    });

    // Initialize progress statistics for skill deduplication
    progress.statistics.totalItems = uniqueSkills;
    progress.statistics.completedItems = progress.entries.length;
    progress.statistics.pendingItems = uniqueSkills - progress.entries.length;
    progress.statistics.completionPercentage =
      uniqueSkills > 0 ? (progress.entries.length / uniqueSkills) * 100 : 0;

    // Add skill deduplication statistics to progress file
    progress.deduplicationStats = deduplicationStats;

    // Create a map of completed skills for quick lookup (by skill hash)
    const completedSkills = new Map<string, CourseRetrievalProgressEntry>(
      progress.entries.map((entry) => [entry.hash, entry]),
    );

    this.logger.log(
      `Progress: ${progress.entries.length}/${uniqueSkills} skills completed (${progress.statistics.completionPercentage.toFixed(1)}%)`,
    );

    // Convert skillGroups Map to array for chunked processing
    const groupEntries = Array.from(skillGroups.entries());

    // Run each unique skill with chunked concurrency
    const allRecords: EvaluateRetrieverOutput[] = [];

    // Process skills in chunks for parallel execution
    for (let i = 0; i < groupEntries.length; i += this.concurrency) {
      const concurrentSkills = groupEntries.slice(i, i + this.concurrency);
      const chunkNumber = Math.floor(i / this.concurrency) + 1;
      const totalChunks = Math.ceil(groupEntries.length / this.concurrency);

      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(
        `Chunk ${chunkNumber}/${totalChunks}: Processing ${concurrentSkills.length} skill(s)`,
      );

      // Separate completed (cached) and pending skills in this chunk
      const completedInChunk: Array<{
        skill: string;
        group: SkillEvaluationGroup;
        entry: CourseRetrievalProgressEntry;
      }> = [];
      const pendingInChunk: Array<{
        skill: string;
        group: SkillEvaluationGroup;
        skillNumber: number;
        skillHash: string;
      }> = [];

      for (const [skill, group] of concurrentSkills) {
        // Generate skill hash for deduplication (hash of skill only)
        const skillHash = EvaluationHashUtil.hashString(skill);
        const skillNumber = i + concurrentSkills.indexOf([skill, group]) + 1;

        if (completedSkills.has(skillHash)) {
          const cachedEntry = completedSkills.get(
            skillHash,
          ) as CourseRetrievalProgressEntry;
          completedInChunk.push({ skill, group, entry: cachedEntry });
          this.logger.log(
            `[Skill ${skillNumber}/${skillGroups.size}] Skipping "${skill}" (already completed)`,
          );
        } else {
          pendingInChunk.push({ skill, group, skillNumber, skillHash });
        }
      }

      // Process completed skills (cached results - no LLM calls needed)
      for (const { group, entry } of completedInChunk) {
        const cachedResult = this.createCachedResult(group, entry);
        allRecords.push(cachedResult);
      }

      // Process pending skills in parallel within this chunk
      const newProgressEntries: CourseRetrievalProgressEntry[] = [];
      const batchRecords: EvaluateRetrieverOutput[] = [];

      const results = await Promise.allSettled(
        pendingInChunk.map(async ({ skill, group, skillNumber, skillHash }) => {
          const { representativeTestCase, testCaseIds, occurrenceCount } =
            group;
          const progressPrefix = `[Skill ${skillNumber}/${skillGroups.size}]`;

          this.logger.log(
            `${progressPrefix} Evaluating: "${skill}" (appears in ${occurrenceCount} question${occurrenceCount > 1 ? 's' : ''})`,
          );
          this.logger.log(
            `  Questions: ${testCaseIds.map((id) => `"${id}"`).join(', ')}`,
          );
          this.logger.log(
            `  Courses: ${representativeTestCase.retrievedCourses.length}`,
          );

          // Run evaluation once for this skill
          const evaluationResult = await this.evaluator.evaluate(
            {
              question: representativeTestCase.question, // Question doesn't affect evaluation
              skill,
              retrievedCourses: representativeTestCase.retrievedCourses,
            },
            {
              model: input.judgeModel,
              provider: input.judgeProvider,
            },
          );

          // Log evaluation metrics
          this.logger.log('=== Evaluation Results ===');
          this.logger.log(
            `Mean Relevance: ${evaluationResult.metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
          );
          this.logger.log(
            `Highly Relevant: ${evaluationResult.metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
          );
          this.logger.log(
            `Irrelevant: ${evaluationResult.metrics.perClassDistribution.score0.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
          );

          // Create ONE record for this skill (with all question IDs)
          const result: EvaluateRetrieverOutput = {
            questionIds: testCaseIds, // All questions that have this skill
            skill,
            retrievedCount: representativeTestCase.retrievedCourses.length,
            evaluations: evaluationResult.evaluations,
            metrics: evaluationResult.metrics,
            llmModel: evaluationResult.llmInfo.model,
            llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
            inputTokens: evaluationResult.llmTokenUsage.inputTokens,
            outputTokens: evaluationResult.llmTokenUsage.outputTokens,
          };

          // Save record to hash-based file (skill hash)
          await this.resultManager.saveRecord({
            testSetName: testSet.name,
            iterationNumber,
            hash: skillHash,
            record: result,
          });

          // Create progress entry (one per skill)
          const progressEntry: CourseRetrievalProgressEntry = {
            hash: skillHash,
            skill,
            questionIds: testCaseIds,
            occurrenceCount,
            completedAt: new Date().toISOString(),
            result: {
              retrievedCount: representativeTestCase.retrievedCourses.length,
              meanRelevanceScore: evaluationResult.metrics.meanRelevanceScore,
            },
          };

          return {
            progressEntry,
            record: result,
          };
        }),
      );

      // Process successful results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { progressEntry, record } = result.value as unknown as {
            progressEntry: CourseRetrievalProgressEntry;
            record: EvaluateRetrieverOutput;
          };
          newProgressEntries.push(progressEntry);
          batchRecords.push(record);
          completedSkills.set(progressEntry.hash, progressEntry);
        }
      }

      // Check for failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(
          `${failures.length} skill(s) failed in chunk ${chunkNumber}`,
        );
        for (const failure of failures) {
          this.logger.error(
            `  Error: ${failure.reason instanceof Error ? failure.reason.message : String(failure.reason)}`,
          );
        }
      }

      // Add all records from this chunk
      allRecords.push(...batchRecords);

      // Save progress once per chunk (not per skill) to avoid file corruption
      progress.entries.push(...newProgressEntries);
      progress.statistics.completedItems = progress.entries.length;
      progress.statistics.pendingItems = uniqueSkills - progress.entries.length;
      progress.statistics.completionPercentage =
        uniqueSkills > 0 ? (progress.entries.length / uniqueSkills) * 100 : 0;

      await this.resultManager.saveProgress(progress);

      this.logger.log(
        `Chunk ${chunkNumber}/${totalChunks} complete: ${newProgressEntries.length} skill(s) evaluated, ${completedInChunk.length} cached`,
      );
      this.logger.log(
        `Progress: ${progress.entries.length}/${uniqueSkills} skills (${progress.statistics.completionPercentage.toFixed(1)}%)`,
      );
    }

    // Save records (final save - redundant but ensures consistency)
    await this.resultManager.saveIterationRecords({
      testSetName: testSet.name,
      iterationNumber,
      records: allRecords,
    });

    // Update deduplication stats to reflect actual completed evaluations
    // This ensures consistency when some evaluations fail or produce no results
    deduplicationStats.uniqueSkillsEvaluated = progress.entries.length;

    // Update progress file with final deduplication stats
    progress.deduplicationStats = deduplicationStats;
    await this.resultManager.saveProgress(progress);

    // Save iteration metrics (for cross-iteration aggregation)
    await this.resultManager.saveIterationMetrics({
      testSetName: testSet.name,
      iterationNumber,
      records: allRecords,
      skillDeduplicationStats: deduplicationStats,
    });

    // Save iteration cost
    await this.resultManager.saveIterationCost({
      testSetName: testSet.name,
      iterationNumber,
      judgeModel: input.judgeModel ?? 'gpt-4o',
      judgeProvider: input.judgeProvider ?? 'openai',
      records: allRecords,
    });

    // Calculate aggregated metrics using TREC-standard mean averaging
    const metrics =
      CourseRetrievalMetricsCalculator.calculateMeanMetrics(allRecords);

    const duration = Date.now() - startTime;
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Completed ${testSet.name} iteration ${iterationNumber}`);
    this.logger.log(
      `Total duration: ${DecimalHelper.formatTime(duration / 1000)}s`,
    );
    this.logger.log(
      `Mean relevance: ${metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly relevant: ${metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Run complete course retrieval evaluation workflow
   *
   * @param context - Evaluation context (iteration number, prefix directory)
   * @param input - Pipeline input parameters
   * @returns Pipeline execution output with evaluation results
   */
  async runEvaluator(
    context: CourseRetrievalEvaluationContext,
    input: EvaluateRetrieverInput,
  ): Promise<EvaluateRetrieverOutput> {
    const startTime = Date.now();

    this.logger.log(`Starting evaluation for: "${input.question}"`);
    this.logger.log(`Skill: "${input.skill}"`);
    this.logger.log(`Retrieved courses: ${input.retrievedCourses.length}`);

    if (context?.iterationNumber !== undefined) {
      this.logger.log(`Iteration: ${context.iterationNumber}`);
    }
    if (context?.prefixDir) {
      this.logger.log(`Prefix directory: ${context.prefixDir}`);
    }

    // Execute evaluator
    const evaluationResult = await this.evaluator.evaluate(
      {
        question: input.question,
        skill: input.skill,
        retrievedCourses: input.retrievedCourses,
      },
      {
        model: context.judgeModel,
        provider: context.judgeProvider,
      },
    );

    // Log evaluation metrics
    this.logger.log('=== Evaluation Results ===');
    this.logger.log(
      `Mean Relevance: ${evaluationResult.metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly Relevant: ${evaluationResult.metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(
      `Irrelevant: ${evaluationResult.metrics.perClassDistribution.score0.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );

    const result: EvaluateRetrieverOutput = {
      questionIds: [input.testCaseId ?? 'single-evaluation'], // Wrap in array for consistency
      skill: evaluationResult.skill,
      retrievedCount: input.retrievedCourses.length,
      evaluations: evaluationResult.evaluations,
      metrics: evaluationResult.metrics,
      llmModel: evaluationResult.llmInfo.model,
      llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
      inputTokens: evaluationResult.llmTokenUsage.inputTokens,
      outputTokens: evaluationResult.llmTokenUsage.outputTokens,
    };

    // Save results
    const duration = Date.now() - startTime;
    await this.saveResults(result, duration, context);

    this.logger.log(`Evaluation completed in ${duration}ms`);

    return result;
  }

  /**
   * Save evaluation results to JSON files
   *
   * Creates two types of files:
   * 1. Timestamped evaluation file (e.g., evaluation-1234567890.json)
   * 2. Latest evaluation file (latest.json)
   *
   * @param result - The evaluation result to save
   * @param duration - Duration of evaluation in milliseconds
   * @param context - Additional evaluation context
   */
  async saveResults(
    result: EvaluateRetrieverOutput,
    duration: number,
    context: CourseRetrievalEvaluationContext,
  ): Promise<void> {
    const timestamp = Date.now();

    // Build output path
    let outputPath = this.baseDir;
    if (context?.prefixDir) {
      outputPath = path.join(outputPath, context.prefixDir);
    }
    if (context?.iterationNumber !== undefined) {
      outputPath = path.join(
        outputPath,
        `iteration-${context.iterationNumber}`,
      );
    }

    // Prepare output with metadata
    const output = {
      ...result,
      evaluationMetadata: {
        duration,
        timestamp: new Date(timestamp).toISOString(),
        iterationNumber: context?.iterationNumber,
        prefixDir: context?.prefixDir,
      },
    };

    // Save main evaluation file
    const evaluationFilePath = path.join(
      outputPath,
      `evaluation-${timestamp}.json`,
    );
    await FileHelper.saveJson(evaluationFilePath, output);

    // Save latest evaluation file
    const latestFilePath = path.join(outputPath, 'latest.json');
    await FileHelper.saveLatestJson(latestFilePath, output);

    this.logger.log(`Results saved to: ${outputPath}`);
  }

  /**
   * Get the base directory path for course retrieval evaluations
   *
   * @returns Base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Run evaluation with default test data
   *
   * @deprecated Use runTestSet() with TestSetFactory instead.
   * Convenience method for CLI/testing with hardcoded test scenarios.
   *
   * @param context - Evaluation context (iteration number, prefix directory)
   * @returns Pipeline execution output with evaluation results
   */
  async runWithDefaultTestData(
    context: CourseRetrievalEvaluationContext = {},
  ): Promise<EvaluateRetrieverOutput> {
    return this.runEvaluator(
      context,
      this.getDefaultTestData(context.iterationNumber),
    );
  }

  /**
   * Get default test data for evaluation
   *
   * @param _iterationNumber - Optional iteration number for variation (unused, reserved for future)
   * @returns Default test input for evaluation
   */
  private getDefaultTestData(
    _iterationNumber?: number,
  ): EvaluateRetrieverInput {
    return {
      question: 'How to learn Python programming?',
      skill: 'Python programming',
      retrievedCourses: [
        {
          subjectCode: 'CS101',
          subjectName: 'Introduction to Programming',
          cleanedLearningOutcomes: [
            'Understand basic programming concepts',
            'Learn Python syntax and semantics',
            'Write simple programs using loops and conditionals',
          ],
        },
        {
          subjectCode: 'CS201',
          subjectName: 'Advanced Python',
          cleanedLearningOutcomes: [
            'Master object-oriented programming in Python',
            'Work with files and databases',
            'Build web applications using Flask',
          ],
        },
        {
          subjectCode: 'CS301',
          subjectName: 'Data Structures',
          cleanedLearningOutcomes: [
            'Understand arrays, linked lists, and trees',
            'Implement sorting and searching algorithms',
            'Analyze algorithm complexity',
          ],
        },
        {
          subjectCode: 'MATH101',
          subjectName: 'Calculus I',
          cleanedLearningOutcomes: [
            'Understand limits and derivatives',
            'Learn integration techniques',
            'Apply calculus to real-world problems',
          ],
        },
        {
          subjectCode: 'CS401',
          subjectName: 'Machine Learning',
          cleanedLearningOutcomes: [
            'Introduction to supervised and unsupervised learning',
            'Implement neural networks using Python',
            'Work with pandas and scikit-learn',
          ],
        },
      ],
    };
  }

  /**
   * Group test cases by skill for skill-level deduplication
   *
   * Creates skill evaluation groups where multiple questions that
   * share the same skill are grouped together. Each unique skill
   * is evaluated once, regardless of how many questions contain it.
   *
   * @param testCases - All test cases to group
   * @returns Map of skill -> skill evaluation group
   */
  private groupBySkill(
    testCases: CourseRetrieverTestCase[],
  ): Map<string, SkillEvaluationGroup> {
    const groups = new Map<string, SkillEvaluationGroup>();

    for (const testCase of testCases) {
      const skill = testCase.skill;

      if (!groups.has(skill)) {
        groups.set(skill, {
          skill,
          testCaseIds: [],
          representativeTestCase: testCase,
          occurrenceCount: 0,
        });
      }

      const group = groups.get(skill)!;
      group.testCaseIds.push(testCase.id);
      group.occurrenceCount++;
    }

    this.logger.debug(
      `Created ${groups.size} skill groups from ${testCases.length} test cases`,
    );

    return groups;
  }

  /**
   * Create a cached result for a skill group from a progress entry
   *
   * Used when a skill was already evaluated in a previous run.
   *
   * @param group - The skill evaluation group
   * @param cachedEntry - The cached progress entry
   * @returns Cached evaluation result
   */
  private createCachedResult(
    group: SkillEvaluationGroup,
    cachedEntry: CourseRetrievalProgressEntry,
  ): EvaluateRetrieverOutput {
    return {
      questionIds: group.testCaseIds, // All questions that have this skill
      skill: cachedEntry.skill,
      retrievedCount: cachedEntry.result.retrievedCount,
      evaluations: [], // Empty for cached results
      metrics: {
        totalCourses: cachedEntry.result.retrievedCount,
        meanRelevanceScore: cachedEntry.result.meanRelevanceScore,
        totalRelevanceSum: 0, // Not available in cached results
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: {
          at5: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at10: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at15: { threshold1: 0, threshold2: 0, threshold3: 0 },
          atAll: { threshold1: 0, threshold2: 0, threshold3: 0 },
        },
      },
      llmModel: 'cached',
      llmProvider: 'cached',
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
