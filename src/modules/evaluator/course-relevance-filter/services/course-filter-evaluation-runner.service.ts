import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { CourseFilterTestSetSerialized } from '../../shared/services/test-set.types';
import { CourseFilterJudgeEvaluator } from '../evaluators/course-filter-judge.evaluator';
import { CourseFilterTestSetTransformer } from '../loaders/course-filter-test-set-transformer.service';
import type {
  AggregatedCourseForEval,
  CourseFilterProgressFile,
  CourseProgressEntry,
  EvaluationConfig,
  JudgeCourseInput,
  JudgeEvaluationResult,
  QuestionEvalSample,
  SampleEvaluationRecord,
} from '../types/course-relevance-filter.types';
import { CourseHashUtil } from '../utils/course-hash.util';
import { CourseComparisonService } from './course-comparison.service';
import { CourseFilterResultManagerService } from './course-filter-result-manager.service';
import { DisagreementAnalyzerService } from './disagreement-analyzer.service';
import { CourseFilterMetricsCalculator } from './metrics-calculator.service';

// ============================================================================
// COURSE FILTER EVALUATION RUNNER SERVICE
// ============================================================================

/**
 * Main orchestrator for course relevance filter evaluation.
 *
 * This service coordinates the entire evaluation pipeline:
 * 1. Load and transform test set
 * 2. Evaluate samples with judge LLM
 * 3. Compare system vs judge results
 * 4. Calculate metrics and analyze disagreements
 * 5. Save all results to files
 * 6. Track progress for crash recovery
 *
 * Progress tracking is done at COURSE level (not sample level) for maximum
 * granularity. Each course is tracked independently with a unique hash.
 */
@Injectable()
export class CourseFilterEvaluationRunnerService {
  private readonly logger = new Logger(
    CourseFilterEvaluationRunnerService.name,
  );
  private readonly baseProgressDir = 'data/evaluation/course-relevance-filter';

  constructor(
    private readonly transformer: CourseFilterTestSetTransformer,
    private readonly judgeEvaluator: CourseFilterJudgeEvaluator,
    private readonly comparisonService: CourseComparisonService,
    private readonly metricsCalculator: CourseFilterMetricsCalculator,
    private readonly disagreementAnalyzer: DisagreementAnalyzerService,
    private readonly resultManager: CourseFilterResultManagerService,
  ) {}

  /**
   * Run a complete evaluation for a test set.
   *
   * @param testSet - Serialized test set from TestSetBuilderService
   * @param config - Evaluation configuration
   * @returns Complete evaluation results
   */
  async runEvaluation(params: {
    testSet: CourseFilterTestSetSerialized[];
    config: EvaluationConfig;
  }): Promise<{
    records: SampleEvaluationRecord[];
    metrics: SampleEvaluationRecord[];
  }> {
    const { testSet, config } = params;

    this.logger.log(
      `Starting evaluation for ${testSet.length} samples with config: ${JSON.stringify(config)}`,
    );

    // Ensure directory structure
    await this.resultManager.ensureDirectoryStructure(config.outputDirectory);

    // Transform test set to evaluation format
    const samples = this.transformer.transformTestSet(testSet);

    this.logger.log(
      `Transformed ${samples.length} samples to evaluation format`,
    );

    // For multi-iteration evaluation, run each iteration
    const iterations = config.iterations ?? 1;
    this.logger.log(`Running ${iterations} iteration(s)`);

    for (let iter = 1; iter <= iterations; iter++) {
      await this.runIteration({
        iterationNumber: iter,
        samples,
        config,
      });
    }

    // Calculate and save final metrics
    const finalMetrics = await this.resultManager.calculateFinalMetrics({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
    });

    await this.resultManager.saveFinalMetrics({
      testSetName: config.outputDirectory,
      totalIterations: iterations,
      metrics: finalMetrics,
    });

    this.logger.log('Evaluation complete');

    return {
      records: [],
      metrics: [],
    };
  }

  /**
   * Run a single iteration of evaluation.
   *
   * @param iterationNumber - Current iteration number
   * @param samples - Transformed samples
   * @param config - Evaluation configuration
   */
  async runIteration(params: {
    iterationNumber: number;
    samples: QuestionEvalSample[];
    config: EvaluationConfig;
  }): Promise<SampleEvaluationRecord[]> {
    const { iterationNumber, samples, config } = params;

    this.logger.log(
      `Starting iteration ${iterationNumber} with ${samples.length} samples`,
    );

    // Load existing progress (if any)
    const progress = await this.loadProgress({
      testSetName: config.outputDirectory,
      iterationNumber,
    });

    // Create a map of completed courses for quick lookup
    const completedCourseHashes = new Map<string, CourseProgressEntry>(
      progress.entries.map((entry) => [entry.hash, entry]),
    );

    // Process each sample
    const allRecords: SampleEvaluationRecord[] = [];

    for (const sample of samples) {
      const sampleRecords = await this.evaluateSample({
        sample,
        _config: config,
        completedCourseHashes,
        progress,
      });
      allRecords.push(sampleRecords);
    }

    // Save iteration records
    await this.resultManager.saveIterationRecords({
      testSetName: config.outputDirectory,
      iterationNumber,
      records: allRecords,
    });

    // Calculate and save iteration metrics
    const metrics = this.resultManager.calculateIterationMetrics({
      iterationNumber,
      records: allRecords,
    });

    await this.resultManager.saveIterationMetrics({
      testSetName: config.outputDirectory,
      iterationNumber,
      metrics,
    });

    // Calculate and save disagreements
    const disagreements = this.resultManager.calculateDisagreements({
      records: allRecords,
    });

    await this.resultManager.saveDisagreements({
      testSetName: config.outputDirectory,
      iterationNumber,
      disagreements,
    });

    // Calculate and save exploratory delta
    const exploratoryDelta = this.resultManager.calculateExploratoryDelta({
      records: allRecords,
    });

    await this.resultManager.saveExploratoryDelta({
      testSetName: config.outputDirectory,
      iterationNumber,
      exploratoryDelta,
    });

    this.logger.log(
      `Iteration ${iterationNumber} complete: ${allRecords.length} samples, ${metrics.totalCoursesEvaluated} courses`,
    );

    return allRecords;
  }

  /**
   * Evaluate a single sample (question + courses).
   *
   * @param sample - Question evaluation sample
   * @param config - Evaluation configuration
   * @param completedCourseHashes - Map of already evaluated courses
   * @param progress - Progress file to update
   * @returns Evaluation record for this sample
   */
  async evaluateSample(params: {
    sample: QuestionEvalSample;
    _config: EvaluationConfig;
    completedCourseHashes: Map<string, CourseProgressEntry>;
    progress: CourseFilterProgressFile;
  }): Promise<SampleEvaluationRecord> {
    const { sample, completedCourseHashes, progress } = params;

    const { queryLogId, question, courses } = sample;

    this.logger.debug(
      `Evaluating sample ${queryLogId}: ${courses.length} courses`,
    );

    // Separate courses into pending (need evaluation) and completed (reuse progress)
    const pendingCourses: AggregatedCourseForEval[] = [];
    const completedVerdicts: Array<{
      code: string;
      verdict: 'PASS' | 'FAIL';
      reason: string;
    }> = [];

    for (const course of courses) {
      const hash = CourseHashUtil.generate({
        queryLogId,
        question,
        subjectCode: course.subjectCode,
      });

      if (completedCourseHashes.has(hash)) {
        // Reuse existing verdict
        const entry = completedCourseHashes.get(hash)!;
        completedVerdicts.push({
          code: course.subjectCode,
          verdict: entry.judgeVerdict,
          reason: entry.judgeReason,
        });
      } else {
        // Need to evaluate
        pendingCourses.push(course);
      }
    }

    this.logger.debug(
      `Sample ${queryLogId}: ${pendingCourses.length} pending, ${completedVerdicts.length} completed`,
    );

    // Evaluate pending courses with judge LLM
    let newVerdicts: Array<{
      code: string;
      verdict: 'PASS' | 'FAIL';
      reason: string;
    }> = [];

    if (pendingCourses.length > 0) {
      const judgeInput = this.buildJudgeInput(question, pendingCourses);
      const judgeResult = await this.judgeEvaluator.evaluate(judgeInput);
      newVerdicts = judgeResult.courses;

      // Save new verdicts to progress
      for (let i = 0; i < newVerdicts.length; i++) {
        const verdict = newVerdicts[i];
        const course = pendingCourses[i];

        const hash = CourseHashUtil.generate({
          queryLogId,
          question,
          subjectCode: course.subjectCode,
        });

        const entry: CourseProgressEntry = {
          hash,
          queryLogId,
          question,
          subjectCode: course.subjectCode,
          subjectName: course.subjectName,
          completedAt: new Date().toISOString(),
          judgeVerdict: verdict.verdict,
          judgeReason: verdict.reason,
        };

        progress.entries.push(entry);
      }

      // Save updated progress file
      await this.saveProgress(progress);
    }

    // Combine completed and new verdicts
    const allVerdicts = [...completedVerdicts, ...newVerdicts];

    // Build judge result for comparison
    const judgeResult: JudgeEvaluationResult = {
      courses: allVerdicts,
    };

    // Compare system vs judge
    const comparisonRecord = this.comparisonService.compareSample(
      sample,
      judgeResult,
    );

    return comparisonRecord;
  }

  /**
   * Build judge input from question and courses.
   *
   * @param question - User's question
   * @param courses - Courses to evaluate
   * @returns Judge evaluation input
   */
  private buildJudgeInput(
    question: string,
    courses: AggregatedCourseForEval[],
  ): { question: string; courses: JudgeCourseInput[] } {
    return {
      question,
      courses: courses.map((course) => ({
        code: course.subjectCode,
        name: course.subjectName,
        outcomes: course.allLearningOutcomes.map((lo) => lo.name),
      })),
    };
  }

  /**
   * Load progress file for a test set iteration.
   *
   * @param testSetName - Test set name
   * @param iterationNumber - Iteration number
   * @returns Progress file (empty if not exists)
   */
  private async loadProgress(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<CourseFilterProgressFile> {
    const { testSetName, iterationNumber } = params;

    const filePath = path.join(
      this.baseProgressDir,
      testSetName,
      `progress-iteration-${iterationNumber}.json`,
    );

    try {
      const progress =
        await FileHelper.loadJson<CourseFilterProgressFile>(filePath);
      this.logger.log(
        `Loaded progress: ${progress.statistics.completedCourses}/${progress.statistics.totalCourses} courses completed`,
      );
      return progress;
    } catch {
      // No progress file exists - create new
      this.logger.log('No existing progress found, starting fresh');
      return {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalCourses: 0,
          completedCourses: 0,
          pendingCourses: 0,
          completionPercentage: 0,
        },
      };
    }
  }

  /**
   * Save progress file for a test set iteration.
   *
   * @param progress - Progress file to save
   */
  private async saveProgress(
    progress: CourseFilterProgressFile,
  ): Promise<void> {
    const filePath = path.join(
      this.baseProgressDir,
      progress.testSetName,
      `progress-iteration-${progress.iterationNumber}.json`,
    );

    // Update statistics
    progress.lastUpdated = new Date().toISOString();
    progress.statistics.totalCourses = progress.entries.length;
    progress.statistics.completedCourses = progress.entries.length;
    progress.statistics.pendingCourses = 0;
    progress.statistics.completionPercentage = 100;

    await FileHelper.saveJson(filePath, progress);
  }
}
