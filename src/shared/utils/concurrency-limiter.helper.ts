/**
 * Concurrency Limiter Helper
 *
 * Limits the number of concurrent async operations.
 * Tasks are queued and executed up to the concurrency limit.
 * When a task completes, the next task in the queue starts.
 *
 * @example
 * ```ts
 * const limiter = new ConcurrencyLimiter(2);
 * const results = await Promise.all([
 *   limiter.add(() => operation1()),
 *   limiter.add(() => operation2()),
 *   limiter.add(() => operation3()),
 * ]);
 * // operation1 and operation2 run concurrently
 * // operation3 waits for one to complete before starting
 * ```
 */

/**
 * Internal type for queued tasks
 */
interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class ConcurrencyLimiter {
  private running: number = 0;
  private queue: Array<QueuedTask<unknown>> = [];

  constructor(private readonly limit: number) {
    if (limit <= 0) {
      throw new Error('Concurrency limit must be greater than 0');
    }
  }

  /**
   * Add a task to the limiter queue
   * Returns a promise that resolves when the task completes
   *
   * @param task - Async function to execute
   * @returns Promise that resolves with the task's result
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Process the queue, running tasks up to the concurrency limit
   */
  private processQueue(): void {
    while (this.running < this.limit && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.running++;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.executeTask(item);
    }
  }

  /**
   * Execute a single task and handle completion/error
   */
  private async executeTask(item: QueuedTask<unknown>): Promise<void> {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  /**
   * Get current number of running tasks
   */
  getRunningCount(): number {
    return this.running;
  }

  /**
   * Get current queue length (pending tasks)
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
