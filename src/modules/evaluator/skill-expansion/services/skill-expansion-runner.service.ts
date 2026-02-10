import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationHashUtil } from '../../shared/utils/evaluation-hash.util';
import { SkillExpansionJudgeEvaluator } from '../evaluators/skill-expansion-judge.evaluator';
import { SkillExpansionComparisonService } from '../services/skill-expansion-comparison.service';
import { SkillExpansionMetricsCalculator } from '../services/skill-expansion-metrics-calculator.service';
import { SkillExpansionResultManagerService } from '../services/skill-expansion-result-manager.service';
import type {
  QuestionEvalSample,
  SampleEvaluationRecord,
  SkillExpansionEvaluationConfig,
  SkillExpansionJudgeResult,
  SkillExpansionProgressEntry,
  SkillExpansionProgressFile,
  SkillExpansionTestSet,
} from '../types/skill-expansion.types';
import { SkillExpansionHashUtil } from '../utils/skill-expansion-hash.util';

// ============================================================================
// SKILL EXPANSION EVALUATION RUNNER SERVICE
// ============================================================================

/**
 * Main orchestrator for skill expansion evaluation.
 *
 * This service coordinates the entire evaluation pipeline:
 * 1. Load test set
 * 2. Evaluate samples with judge LLM
 * 3. Compare system vs judge results
 * 4. Calculate metrics
 * 5. Save all results to files
 * 6. Track progress for crash recovery
 *
 * Progress tracking is done at SKILL level for maximum granularity.
 * Each skill is tracked independently with a unique hash.
 */
@Injectable()
export class SkillExpansionEvaluationRunnerService {
  private readonly logger = new Logger(
    SkillExpansionEvaluationRunnerService.name,
  );
  private readonly baseProgressDir = 'data/evaluation/skill-expansion';

  constructor(
    private readonly judgeEvaluator: SkillExpansionJudgeEvaluator,
    private readonly comparisonService: SkillExpansionComparisonService,
    private readonly metricsCalculator: SkillExpansionMetricsCalculator,
    private readonly resultManager: SkillExpansionResultManagerService,
  ) {}

  /**
   * Run a complete evaluation for a test set.
   *
   * @param testSet - Test set data
   * @param config - Evaluation configuration
   * @returns Complete evaluation results
   */
  async runEvaluation(params: {
    testSet: SkillExpansionTestSet;
    config: SkillExpansionEvaluationConfig;
  }): Promise<{
    records: SampleEvaluationRecord[];
  }> {
    const { testSet, config } = params;

    const testSetName = config.outputDirectory ?? testSet.name;

    this.logger.log(
      `'${testSetName}': Starting evaluation for ${testSet.cases.length} samples`,
    );
    this.logger.debug(`Config: ${JSON.stringify(config)}`);

    // Ensure directory structure
    await this.resultManager.ensureDirectoryStructure(testSetName);

    // Transform test set to evaluation samples
    const samples: QuestionEvalSample[] = testSet.cases.map((testCase) => ({
      queryLogId: testCase.queryLogId,
      question: testCase.question,
      systemSkills: testCase.rawOutput.skillItems,
    }));

    this.logger.log(
      `'${testSetName}': Transformed ${samples.length} samples to evaluation format`,
    );

    // For multi-iteration evaluation, run each iteration
    const iterations = config.iterations ?? 1;
    this.logger.log(`'${testSetName}': Running ${iterations} iteration(s)`);

    for (let iter = 1; iter <= iterations; iter++) {
      this.logger.log(
        `'${testSetName}': Starting iteration ${iter}/${iterations}`,
      );
      await this.runIteration({
        iterationNumber: iter,
        samples,
        config: {
          ...config,
          outputDirectory: testSetName,
        },
      });
    }

    // Calculate and save final metrics
    const totalSamples = samples.length;
    const totalSkills = samples.reduce(
      (sum, s) => sum + s.systemSkills.length,
      0,
    );

    await this.resultManager.calculateFinalMetrics({
      testSetName,
      totalIterations: iterations,
      totalSamples,
      totalSkills,
    });

    // Calculate and save final cost
    await this.resultManager.calculateFinalCost({
      testSetName,
      totalIterations: iterations,
    });

    this.logger.log(
      `'${testSetName}': Evaluation complete (${iterations} iteration(s))`,
    );

    return {
      records: [],
    };
  }

  /**
   * Run a single iteration of evaluation.
   *
   * @param iterationNumber - Current iteration number
   * @param samples - Evaluation samples
   * @param config - Evaluation configuration
   * @returns Array of evaluation records
   */
  async runIteration(params: {
    iterationNumber: number;
    samples: QuestionEvalSample[];
    config: SkillExpansionEvaluationConfig & { outputDirectory: string };
  }): Promise<SampleEvaluationRecord[]> {
    const { iterationNumber, samples, config } = params;

    this.logger.log(
      `'${config.outputDirectory}': Iteration ${iterationNumber} - ${samples.length} samples`,
    );

    // Calculate total skills for accurate progress tracking
    const totalSkills = samples.reduce(
      (sum, s) => sum + s.systemSkills.length,
      0,
    );

    // Load existing progress (if any)
    const progress = await this.loadProgress({
      testSetName: config.outputDirectory,
      iterationNumber,
      totalSkills,
    });

    // Load existing records (for resume capability)
    const existingRecords = await this.resultManager.loadIterationRecords({
      testSetName: config.outputDirectory,
      iterationNumber,
    });

    // Create a map of completed skills for quick lookup
    const completedSkillHashes = new Map<string, SkillExpansionProgressEntry>(
      progress.entries.map((entry) => [entry.hash, entry]),
    );

    // Create a set of completed queryLogIds for quick lookup
    const completedQueryLogIds = new Set(
      existingRecords.map((r) => r.queryLogId),
    );

    this.logger.log(
      `Found ${existingRecords.length} existing records, ${completedQueryLogIds.size} samples already completed`,
    );

    // Process each sample
    const allRecords: SampleEvaluationRecord[] = [...existingRecords];

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const sampleNumber = i + 1;

      // Skip if this sample was already evaluated
      if (completedQueryLogIds.has(sample.queryLogId)) {
        this.logger.log(
          `'${config.outputDirectory}': [${sampleNumber}/${samples.length}] Skipping ${sample.queryLogId} (already evaluated)`,
        );
        continue;
      }

      // Log sample progress
      this.logger.log(
        `'${config.outputDirectory}': [${sampleNumber}/${samples.length}] Evaluating: "${sample.question.substring(0, 60)}${sample.question.length > 60 ? '...' : ''}"`,
      );

      const sampleRecord = await this.evaluateSample({
        sample,
        config,
        completedSkillHashes,
        progress,
      });

      // Generate question-level hash for record saving
      const recordHash = EvaluationHashUtil.generateSkillExpansionRecordHash({
        queryLogId: sample.queryLogId,
        question: sample.question,
      });

      // Save record to hash-based file for crash recovery and parallel evaluation support
      await this.resultManager.saveRecord({
        testSetName: config.outputDirectory,
        iterationNumber,
        hash: recordHash,
        record: sampleRecord,
      });

      allRecords.push(sampleRecord);

      // Log sample completion
      const totalSkills = sampleRecord.comparison.skills.length;
      this.logger.log(
        `'${config.outputDirectory}': [${sampleNumber}/${samples.length}] Complete: ${totalSkills} skills evaluated`,
      );
    }

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

    // Save iteration cost
    await this.resultManager.saveIterationCost({
      testSetName: config.outputDirectory,
      iterationNumber,
      config: {
        judgeModel: config.judgeModel,
        judgeProvider: config.judgeProvider,
      },
      records: allRecords,
    });

    this.logger.log(
      `'${config.outputDirectory}': Iteration ${iterationNumber} complete: ${allRecords.length} samples, ${metrics.totalSkills} skills`,
    );

    return allRecords;
  }

  /**
   * Evaluate a single sample (question + skills).
   *
   * @param sample - Question evaluation sample
   * @param config - Evaluation configuration
   * @param completedSkillHashes - Map of already evaluated skills
   * @param progress - Progress file to update
   * @returns Evaluation record for this sample
   */
  async evaluateSample(params: {
    sample: QuestionEvalSample;
    config: SkillExpansionEvaluationConfig & { outputDirectory: string };
    completedSkillHashes: Map<string, SkillExpansionProgressEntry>;
    progress: SkillExpansionProgressFile;
  }): Promise<SampleEvaluationRecord> {
    const { sample, config, completedSkillHashes, progress } = params;

    const { queryLogId, question, systemSkills } = sample;

    this.logger.debug(
      `Evaluating sample ${queryLogId}: ${systemSkills.length} skills`,
    );

    // Check if all skills are already evaluated
    const allSkillHashes = systemSkills.map((skillItem) =>
      SkillExpansionHashUtil.generate({
        queryLogId,
        question,
        skill: skillItem.skill,
      }),
    );

    const allSkillsCompleted = allSkillHashes.every((hash) =>
      completedSkillHashes.has(hash),
    );

    let judgeResult: SkillExpansionJudgeResult;

    if (allSkillsCompleted) {
      // Reuse existing verdicts from progress
      this.logger.debug(
        `Sample ${queryLogId}: All ${systemSkills.length} skills already evaluated, reusing verdicts`,
      );

      const existingVerdicts = allSkillHashes.map((hash) => {
        const entry = completedSkillHashes.get(hash)!;
        return {
          skill: entry.skill,
          verdict: entry.result.verdict,
          note: entry.result.note,
        };
      });

      judgeResult = {
        result: {
          skills: existingVerdicts,
          overall: {
            conceptPreserved: true, // Assume preserved if all skills were evaluated
            summary: 'Reused from previous evaluation',
          },
        },
        tokenUsage: [], // No new LLM calls, so no token usage
      };
    } else {
      // Evaluate with judge LLM
      const judgeInput = {
        question,
        systemSkills,
      };

      judgeResult = await this.judgeEvaluator.evaluate(judgeInput, {
        model: config.judgeModel,
        provider: config.judgeProvider,
      });

      // Save new verdicts to progress
      for (const skillVerdict of judgeResult.result.skills) {
        const hash = SkillExpansionHashUtil.generate({
          queryLogId,
          question,
          skill: skillVerdict.skill,
        });

        // Check if already completed
        if (!completedSkillHashes.has(hash)) {
          const entry: SkillExpansionProgressEntry = {
            hash,
            queryLogId,
            question,
            skill: skillVerdict.skill,
            completedAt: new Date().toISOString(),
            result: {
              verdict: skillVerdict.verdict,
              note: skillVerdict.note,
            },
          };

          progress.entries.push(entry);
          completedSkillHashes.set(hash, entry);
        }
      }

      // Save updated progress file
      await this.saveProgress(progress);
    }

    // Compare system vs judge
    const comparisonRecord = this.comparisonService.compareSample(
      sample,
      judgeResult,
    );

    return {
      ...comparisonRecord,
      judgeResult,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Load progress file for a test set iteration.
   *
   * @param testSetName - Test set name
   * @param iterationNumber - Iteration number
   * @param totalSkills - Total number of skills to evaluate (for accurate statistics)
   * @returns Progress file (empty if not exists)
   */
  private async loadProgress(params: {
    testSetName: string;
    iterationNumber: number;
    totalSkills: number;
  }): Promise<SkillExpansionProgressFile> {
    const { testSetName, iterationNumber, totalSkills } = params;

    const filePath = path.join(
      this.baseProgressDir,
      testSetName,
      `progress-iteration-${iterationNumber}.json`,
    );

    try {
      const progress =
        await FileHelper.loadJson<SkillExpansionProgressFile>(filePath);

      // Update statistics with current total (in case test set changed)
      progress.statistics.totalItems = totalSkills;
      progress.statistics.completedItems = progress.entries.length;
      progress.statistics.pendingItems = totalSkills - progress.entries.length;
      progress.statistics.completionPercentage =
        (progress.entries.length / totalSkills) * 100;

      this.logger.log(
        `Loaded progress: ${progress.statistics.completedItems}/${totalSkills} skills completed (${progress.statistics.completionPercentage.toFixed(1)}%)`,
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
          totalItems: totalSkills,
          completedItems: 0,
          pendingItems: totalSkills,
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
    progress: SkillExpansionProgressFile,
  ): Promise<void> {
    const filePath = path.join(
      this.baseProgressDir,
      progress.testSetName,
      `progress-iteration-${progress.iterationNumber}.json`,
    );

    // Update statistics (totalItems should already be set from loadProgress)
    progress.lastUpdated = new Date().toISOString();
    progress.statistics.completedItems = progress.entries.length;
    progress.statistics.pendingItems =
      progress.statistics.totalItems - progress.entries.length;
    progress.statistics.completionPercentage =
      (progress.entries.length / progress.statistics.totalItems) * 100;

    await FileHelper.saveJson(filePath, progress);
  }
}
