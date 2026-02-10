/**
 * Generic evaluator contract for assessing a single input and producing an evaluation output.
 *
 * @template TInput - The type of input to evaluate (e.g., query results, LLM responses)
 * @template TOutput - The type of evaluation output (e.g., scores, metrics, quality assessment)
 *
 * @example
 * // Usage: Quality assessment of LLM responses
 * const evaluator: IEvaluator<QueryResult, QualityScore> = ...
 * const score = await evaluator.evaluate(queryResult);
 */
export interface IEvaluator<TInput, TOutput> {
  /**
   * Evaluates the provided input and returns an assessment result.
   *
   * @param input - The data to evaluate (type depends on TInput generic parameter)
   * @returns Promise resolving to the evaluation output (type depends on TOutput generic parameter)
   *
   * @example
   * // Evaluate a query's relevance score
   * const score = await evaluator.evaluate({
   *   question: "What courses for Python?",
   *   retrievedCourses: [...]
   * });
   * // Returns: { relevance: 0.85, coverage: 0.92 }
   */
  evaluate(input: TInput): Promise<TOutput>;
}

/**
 * Generic batch evaluator contract for assessing multiple inputs efficiently.
 *
 * Typically used when evaluation can be optimized by processing multiple items together
 * (e.g., bulk database queries, parallel processing, vectorized operations).
 *
 * @template TInput - The type of input to evaluate (e.g., query results, LLM responses)
 * @template TOutput - The type of evaluation output (e.g., scores, metrics, quality assessment)
 *
 * @example
 * // Usage: Bulk quality assessment of multiple LLM responses
 * const batchEvaluator: IBatchEvaluator<QueryResult, QualityScore> = ...
 * const scores = await batchEvaluator.batchEvaluate([queryResult1, queryResult2, queryResult3]);
 */
export interface IBatchEvaluator<TInput, TOutput> {
  /**
   * Evaluates multiple inputs and returns assessment results.
   *
   * Implementations may optimize for batch processing (e.g., parallel execution,
   * bulk database queries, vectorized operations) compared to calling evaluate() repeatedly.
   *
   * @param inputs - Array of data to evaluate (type depends on TInput generic parameter)
   * @returns Promise resolving to array of evaluation outputs (type depends on TOutput generic parameter)
   *
   * @example
   * // Evaluate multiple queries' relevance scores in batch
   * const scores = await batchEvaluator.batchEvaluate([
   *   { question: "What courses for Python?", retrievedCourses: [...] },
   *   { question: "Web dev courses?", retrievedCourses: [...] }
   * ]);
   * // Returns: [
   * //   { relevance: 0.85, coverage: 0.92 },
   * //   { relevance: 0.78, coverage: 0.88 }
   * // ]
   */
  batchEvaluate(inputs: TInput[]): Promise<TOutput[]>;
}
