/**
 * Unit Tests for ConcurrencyLimiter
 *
 * Tests the concurrency limiting behavior including:
 * - Queue management and task execution
 * - Concurrency limits are respected
 * - Error handling and rejection propagation
 * - Edge cases (limit=1, empty queue, etc.)
 */
import { ConcurrencyLimiter } from '../concurrency-limiter.helper';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a delay promise for testing timing
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock async task that completes after a delay
 */
const createTask =
  (id: string, ms: number = 10) =>
  async (): Promise<{ id: string; result: string }> => {
    await delay(ms);
    return { id, result: `result-${id}` };
  };

/**
 * Create a task that will fail
 */
const createFailingTask =
  (id: string, error: string = 'Task failed') =>
  async (): Promise<never> => {
    await delay(5);
    throw new Error(error);
  };

// ============================================================================
// TEST SUITE
// ============================================================================

describe('ConcurrencyLimiter', () => {
  describe('Constructor validation', () => {
    it('should create limiter with valid limit', () => {
      expect(() => new ConcurrencyLimiter(1)).not.toThrow();
      expect(() => new ConcurrencyLimiter(2)).not.toThrow();
      expect(() => new ConcurrencyLimiter(10)).not.toThrow();
      expect(() => new ConcurrencyLimiter(100)).not.toThrow();
    });

    it('should throw error for limit of 0', () => {
      expect(() => new ConcurrencyLimiter(0)).toThrow(
        'Concurrency limit must be greater than 0',
      );
    });

    it('should throw error for negative limit', () => {
      expect(() => new ConcurrencyLimiter(-1)).toThrow(
        'Concurrency limit must be greater than 0',
      );
      expect(() => new ConcurrencyLimiter(-10)).toThrow(
        'Concurrency limit must be greater than 0',
      );
    });
  });

  describe('Basic concurrency behavior', () => {
    it('should execute tasks sequentially when limit is 1', async () => {
      const limiter = new ConcurrencyLimiter(1);
      const executionOrder: string[] = [];

      const task1 = async () => {
        executionOrder.push('start-1');
        await delay(20);
        executionOrder.push('end-1');
        return 'task1';
      };

      const task2 = async () => {
        executionOrder.push('start-2');
        await delay(10);
        executionOrder.push('end-2');
        return 'task2';
      };

      const results = await Promise.all([
        limiter.add(task1),
        limiter.add(task2),
      ]);

      // Verify sequential execution
      expect(executionOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
      expect(results).toEqual(['task1', 'task2']);
    });

    it('should execute 2 tasks concurrently when limit is 2', async () => {
      const limiter = new ConcurrencyLimiter(2);
      const executionOrder: string[] = [];

      const task1 = async () => {
        executionOrder.push('start-1');
        await delay(30);
        executionOrder.push('end-1');
        return 'task1';
      };

      const task2 = async () => {
        executionOrder.push('start-2');
        await delay(20);
        executionOrder.push('end-2');
        return 'task2';
      };

      const task3 = async () => {
        executionOrder.push('start-3');
        await delay(10);
        executionOrder.push('end-3');
        return 'task3';
      };

      const results = await Promise.all([
        limiter.add(task1),
        limiter.add(task2),
        limiter.add(task3),
      ]);

      // Verify: task1 and task2 start first, task3 starts after one completes
      expect(executionOrder[0]).toBe('start-1');
      expect(executionOrder[1]).toBe('start-2');
      // task3 should start after task2 ends (20ms)
      expect(executionOrder.indexOf('start-3')).toBeGreaterThan(
        executionOrder.indexOf('end-2'),
      );
      expect(results).toEqual(['task1', 'task2', 'task3']);
    });

    it('should handle more tasks than the limit', async () => {
      const limiter = new ConcurrencyLimiter(2);
      const runningCount: number[] = [];
      let currentRunning = 0;

      // Tasks that track concurrent execution
      const createTrackingTask = (id: number) => async () => {
        currentRunning++;
        runningCount.push(currentRunning);
        await delay(10);
        currentRunning--;
        return id;
      };

      const results = await Promise.all([
        limiter.add(createTrackingTask(1)),
        limiter.add(createTrackingTask(2)),
        limiter.add(createTrackingTask(3)),
        limiter.add(createTrackingTask(4)),
        limiter.add(createTrackingTask(5)),
      ]);

      // Verify no more than 2 tasks ran concurrently
      const maxRunning = Math.max(...runningCount);
      expect(maxRunning).toBeLessThanOrEqual(2);
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Queue management', () => {
    it('should maintain running count correctly', async () => {
      const limiter = new ConcurrencyLimiter(3);

      // Start 5 tasks but don't await them
      const promises = [
        limiter.add(createTask('1', 50)),
        limiter.add(createTask('2', 50)),
        limiter.add(createTask('3', 50)),
        limiter.add(createTask('4', 50)),
        limiter.add(createTask('5', 50)),
      ];

      // After queueing all 5 tasks:
      // - 3 tasks should be running (at the limit)
      // - 2 tasks should be queued (waiting)
      // Note: processQueue() runs synchronously, so by the time we check,
      // the first 3 have already been shifted from queue to running state
      await delay(5); // Let first batch start
      expect(limiter.getRunningCount()).toBe(3); // At limit

      await Promise.all(promises);

      // After completion, no tasks running
      expect(limiter.getRunningCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });

    it('should process all tasks in order of completion', async () => {
      const limiter = new ConcurrencyLimiter(2);

      const results = await Promise.all([
        limiter.add(createTask('slow', 50)),
        limiter.add(createTask('fast', 10)),
        limiter.add(createTask('medium', 30)),
        limiter.add(createTask('very-fast', 5)),
      ]);

      // Results should be in submission order, not completion order
      expect(results[0].id).toBe('slow');
      expect(results[1].id).toBe('fast');
      expect(results[2].id).toBe('medium');
      expect(results[3].id).toBe('very-fast');
    });

    it('should handle empty queue gracefully', () => {
      const limiter = new ConcurrencyLimiter(2);

      expect(limiter.getRunningCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should reject with task error', async () => {
      const limiter = new ConcurrencyLimiter(2);

      const successTask = async () => {
        await delay(5);
        return 'success';
      };

      const failingTask = async () => {
        await delay(5);
        throw new Error('Task failed');
      };

      await expect(limiter.add(successTask)).resolves.toBe('success');
      await expect(limiter.add(failingTask)).rejects.toThrow('Task failed');
    });

    it('should continue processing after a task fails', async () => {
      const limiter = new ConcurrencyLimiter(2);
      const executionOrder: string[] = [];

      const task1 = async () => {
        executionOrder.push('task1-start');
        await delay(10);
        executionOrder.push('task1-end');
        return 'task1';
      };

      const failingTask = async () => {
        executionOrder.push('fail-start');
        await delay(5);
        executionOrder.push('fail-end');
        throw new Error('Intentional failure');
      };

      const task2 = async () => {
        executionOrder.push('task2-start');
        await delay(10);
        executionOrder.push('task2-end');
        return 'task2';
      };

      // All tasks should execute, even though one fails
      const results = await Promise.allSettled([
        limiter.add(task1),
        limiter.add(failingTask),
        limiter.add(task2),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      // Verify task2 ran after the failure
      expect(executionOrder).toContain('task2-start');
      expect(executionOrder).toContain('task2-end');
    });

    it('should handle multiple failures', async () => {
      const limiter = new ConcurrencyLimiter(2);

      const results = await Promise.allSettled([
        limiter.add(createFailingTask('fail1', 'Error 1')),
        limiter.add(createFailingTask('fail2', 'Error 2')),
        limiter.add(createFailingTask('fail3', 'Error 3')),
      ]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('rejected');

      if (results[0].status === 'rejected') {
        expect(results[0].reason.message).toBe('Error 1');
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('Error 2');
      }
      if (results[2].status === 'rejected') {
        expect(results[2].reason.message).toBe('Error 3');
      }
    });
  });

  describe('Type safety and generics', () => {
    it('should preserve return types correctly', async () => {
      const limiter = new ConcurrencyLimiter(2);

      const stringTask = (): Promise<string> => {
        return Promise.resolve('string result');
      };

      const numberTask = (): Promise<number> => {
        return Promise.resolve(42);
      };

      const objectTask = (): Promise<{ id: number; name: string }> => {
        return Promise.resolve({ id: 1, name: 'test' });
      };

      const [stringResult, numberResult, objectResult] = await Promise.all([
        limiter.add(stringTask),
        limiter.add(numberTask),
        limiter.add(objectTask),
      ]);

      // TypeScript should infer correct types
      expect(typeof stringResult).toBe('string');
      expect(typeof numberResult).toBe('number');
      expect(typeof objectResult).toBe('object');
      expect(stringResult).toBe('string result');
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('Real-world scenarios', () => {
    it('should simulate concurrent API calls with limit', async () => {
      const limiter = new ConcurrencyLimiter(3); // Max 3 concurrent API calls
      const apiCallCount: number[] = [];
      let currentCalls = 0;

      const simulateApiCall =
        (endpoint: string, latency: number) => async () => {
          currentCalls++;
          apiCallCount.push(currentCalls);
          await delay(latency);
          currentCalls--;
          return `Response from ${endpoint}`;
        };

      const endpoints = [
        ['users', 50],
        ['posts', 30],
        ['comments', 40],
        ['albums', 20],
        ['todos', 10],
        ['photos', 25],
      ] as const;

      const results = await Promise.all(
        endpoints.map(([ep, latency]) =>
          limiter.add(simulateApiCall(ep, latency)),
        ),
      );

      // Verify results
      expect(results).toHaveLength(6);
      expect(results[0]).toBe('Response from users');
      expect(results[5]).toBe('Response from photos');

      // Verify no more than 3 concurrent "API calls"
      const maxConcurrent = Math.max(...apiCallCount);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle burst of tasks with varying durations', async () => {
      const limiter = new ConcurrencyLimiter(2);

      // Simulate 10 tasks with varying durations
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTask(`task-${i}`, Math.random() * 50 + 10),
      );

      const startTime = Date.now();
      const results = await Promise.all(tasks.map((task) => limiter.add(task)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);

      // With limit of 2 and ~30ms avg duration, should take at least 150ms
      // (10 tasks / 2 concurrent * 30ms = 150ms minimum)
      expect(duration).toBeGreaterThan(100);
    });
  });
});
