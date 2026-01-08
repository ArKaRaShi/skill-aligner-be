/**
 * Generic contract for running complete evaluation workflows.
 *
 * This contract defines the standard interface for executing evaluations,
 * saving results, and managing evaluation artifacts across different
 * evaluator types (course retriever, answer quality, skill expansion, etc.).
 *
 * @template TPipelineInput - Input type for the pipeline execution
 * @template TPipelineOutput - Output type from pipeline execution
 * @template TEvaluationContext - Additional context for the evaluation (e.g., iteration number, test set info)
 *
 * @example
 * // Usage for Course Retriever Evaluation
 * const runner: IRunEvaluator<EvaluateRetrieverInput, EvaluateRetrieverOutput, CourseRetrieverEvaluationContext> = ...
 * await runner.runEvaluator({ iterationNumber: 1 }, { question, skill, retrievedCourses });
 *
 * @example
 * // Usage for Answer Quality Evaluation (future)
 * const runner: IRunEvaluator<AnswerQualityInput, AnswerQualityOutput, void> = ...
 * await runner.runEvaluator(undefined, { answer, expectedQuality });
 */
export interface IRunEvaluator<
  TPipelineInput,
  TPipelineOutput,
  TEvaluationContext = void,
> {
  /**
   * Run complete evaluation workflow.
   *
   * Workflow:
   * 1. Log evaluation start
   * 2. Execute pipeline
   * 3. Log results
   * 4. Save results (via saveResults method)
   * 5. Track and log duration
   *
   * @param context - Additional evaluation context (e.g., iteration number, test set info)
   * @param input - Pipeline input parameters
   * @returns Pipeline execution output
   */
  runEvaluator(
    context: TEvaluationContext,
    input: TPipelineInput,
  ): Promise<TPipelineOutput>;

  /**
   * Save evaluation results to persistent storage.
   *
   * Implementations must define their own persistence strategy:
   * - File system (JSON, CSV)
   * - Database
   * - Remote storage
   *
   * @param result - The evaluation result to save
   * @param duration - Duration of evaluation in milliseconds
   * @param context - Additional evaluation context
   */
  saveResults(
    result: TPipelineOutput,
    duration: number,
    context: TEvaluationContext,
  ): Promise<void>;

  /**
   * Get the base directory path for evaluation results.
   *
   * Each evaluator type should have its own directory:
   * - Course Retriever: data/evaluation/course-retriever/
   * - Answer Quality: data/evaluation/answer-quality/
   * - Skill Expansion: data/evaluation/skill-expansion/
   *
   * @returns Base directory path
   */
  getBaseDir(): string;
}
