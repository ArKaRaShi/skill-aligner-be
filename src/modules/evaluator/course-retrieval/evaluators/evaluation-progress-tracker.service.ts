import { Injectable, Logger } from '@nestjs/common';

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { EvaluateRetrieverInput } from '../types/course-retrieval.types';

/**
 * Progress entry for a single evaluation
 */
interface EvaluationProgressEntry {
  /** Unique hash for this evaluation (question + skill) */
  hash: string;
  /** Question text */
  question: string;
  /** Skill being evaluated */
  skill: string;
  /** Test case ID */
  testCaseId: string;
  /** Timestamp when evaluation was completed */
  completedAt: string;
  /** Evaluation file path */
  resultFile: string;
}

/**
 * Progress file structure
 */
interface EvaluationProgressFile {
  /** Test set name */
  testSetName: string;
  /** Iteration number */
  iterationNumber: number;
  /** Progress entries */
  entries: EvaluationProgressEntry[];
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Service for tracking evaluation progress to enable resumable evaluations
 *
 * Maintains a progress file that tracks completed evaluations, allowing
 * the CLI to skip already-evaluated items on re-run after failures.
 *
 * Progress file location:
 * data/evaluation/course-retriever/{testSetName}/iteration-{n}/.progress.json
 */
@Injectable()
export class EvaluationProgressTrackerService {
  private readonly logger = new Logger(EvaluationProgressTrackerService.name);
  private readonly baseDir = 'data/evaluation/course-retriever';
  private readonly progressFileName = '.progress.json';

  /**
   * Generate a unique hash for an evaluation input
   * Used to identify duplicate evaluations across runs
   */
  generateHash(input: EvaluateRetrieverInput): string {
    const hashContent = `${input.question}|${input.skill}|${input.testCaseId ?? ''}`;
    return crypto.createHash('sha256').update(hashContent).digest('hex');
  }

  /**
   * Get the progress file path for a test set and iteration
   */
  getProgressFilePath(params: {
    testSetName: string;
    iterationNumber: number;
  }): string {
    const { testSetName, iterationNumber } = params;
    return path.join(
      this.baseDir,
      testSetName,
      `iteration-${iterationNumber}`,
      this.progressFileName,
    );
  }

  /**
   * Load or create progress file for a test set iteration
   */
  async loadProgress(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<EvaluationProgressFile> {
    const { testSetName, iterationNumber } = params;
    const filePath = this.getProgressFilePath({ testSetName, iterationNumber });

    try {
      const progress =
        await FileHelper.loadJson<EvaluationProgressFile>(filePath);
      this.logger.log(
        `Loaded progress with ${progress.entries.length} entries`,
      );
      return progress;
    } catch {
      // Create new progress file
      const newProgress: EvaluationProgressFile = {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
      };
      await this.saveProgress(newProgress);
      this.logger.log('Created new progress file');
      return newProgress;
    }
  }

  /**
   * Save progress file
   */
  async saveProgress(progress: EvaluationProgressFile): Promise<void> {
    const filePath = this.getProgressFilePath({
      testSetName: progress.testSetName,
      iterationNumber: progress.iterationNumber,
    });
    progress.lastUpdated = new Date().toISOString();
    await FileHelper.saveJson(filePath, progress);
  }

  /**
   * Check if an evaluation has already been completed
   */
  isCompleted(params: {
    progress: EvaluationProgressFile;
    input: EvaluateRetrieverInput;
  }): boolean {
    const { progress, input } = params;
    const hash = this.generateHash(input);
    return progress.entries.some((entry) => entry.hash === hash);
  }

  /**
   * Mark an evaluation as completed
   */
  async markCompleted(params: {
    progress: EvaluationProgressFile;
    input: EvaluateRetrieverInput;
    resultFile: string;
  }): Promise<void> {
    const { progress, input, resultFile } = params;
    const hash = this.generateHash(input);

    // Check if already exists
    if (this.isCompleted({ progress, input })) {
      this.logger.debug(`Evaluation ${hash} already marked as completed`);
      return;
    }

    const entry: EvaluationProgressEntry = {
      hash,
      question: input.question,
      skill: input.skill,
      testCaseId: input.testCaseId ?? 'unknown',
      completedAt: new Date().toISOString(),
      resultFile,
    };

    progress.entries.push(entry);
    await this.saveProgress(progress);
    this.logger.debug(
      `Marked evaluation as completed: ${input.skill} for "${input.question}"`,
    );
  }

  /**
   * Filter out already-completed evaluations from input list
   * Returns [pending inputs, completed inputs, progress file]
   */
  async filterCompleted(params: {
    inputs: EvaluateRetrieverInput[];
    testSetName: string;
    iterationNumber: number;
  }): Promise<{
    pending: EvaluateRetrieverInput[];
    completed: EvaluateRetrieverInput[];
    progress: EvaluationProgressFile;
  }> {
    const { inputs, testSetName, iterationNumber } = params;

    const progress = await this.loadProgress({ testSetName, iterationNumber });
    const pending: EvaluateRetrieverInput[] = [];
    const completed: EvaluateRetrieverInput[] = [];

    for (const input of inputs) {
      if (this.isCompleted({ progress, input })) {
        completed.push(input);
      } else {
        pending.push(input);
      }
    }

    this.logger.log(
      `Progress: ${completed.length} completed, ${pending.length} pending`,
    );

    return { pending, completed, progress };
  }

  /**
   * Get all completed hashes from progress file
   */
  getCompletedHashes(progress: EvaluationProgressFile): Set<string> {
    return new Set(progress.entries.map((e) => e.hash));
  }

  /**
   * Load existing evaluation results for completed items
   * Useful for aggregation when resuming
   */
  async loadCompletedResults(params: {
    progress: EvaluationProgressFile;
  }): Promise<unknown[]> {
    const { progress } = params;
    const results: unknown[] = [];

    for (const entry of progress.entries) {
      try {
        const result = await FileHelper.loadJson(entry.resultFile);
        results.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to load result file ${entry.resultFile}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * Reset progress for a test set iteration
   * Useful when starting fresh evaluation
   */
  async resetProgress(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<void> {
    const filePath = this.getProgressFilePath(params);
    try {
      await FileHelper.saveJson(filePath, {
        testSetName: params.testSetName,
        iterationNumber: params.iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
      } satisfies EvaluationProgressFile);
      this.logger.log(
        `Reset progress for ${params.testSetName} iteration ${params.iterationNumber}`,
      );
    } catch (error) {
      this.logger.error(`Failed to reset progress: ${error}`);
      throw error;
    }
  }
}
