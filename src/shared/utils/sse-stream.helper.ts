import { MessageEvent } from '@nestjs/common';

import { Observable } from 'rxjs';

/**
 * Creates an SSE (Server-Sent Events) stream from an async executor function.
 *
 * This helper reduces boilerplate when creating Observable streams that emit
 * SSE events. It handles try-catch error handling and proper Observable completion.
 *
 * @template TEvent - The type of events to emit (must be an object)
 * @param executor - Async function that receives an `emit` callback
 * @returns Observable that emits MessageEvent objects
 *
 * @example
 * ```ts
 * // Define your event types
 * type MyEvent =
 *   | { type: 'step'; step: number; status: 'started' }
 *   | { type: 'done'; result: string }
 *   | { type: 'error'; message: string };
 *
 * // Use in a use case
 * execute(input: MyInput): Observable<MessageEvent> {
 *   return createSseStream<MyEvent>(async (emit) => {
 *     emit({ type: 'step', step: 1, status: 'started' });
 *     await someService.doWork();
 *     emit({ type: 'step', step: 1, status: 'completed' });
 *     emit({ type: 'done', result: 'Success' });
 *   });
 * }
 * ```
 */
export function createSseStream<TEvent extends object>(
  executor: (emit: (event: TEvent) => void) => Promise<void>,
): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    void (async () => {
      try {
        await executor((data) => {
          subscriber.next({ data } as MessageEvent);
        });
        subscriber.complete();
      } catch (error) {
        subscriber.error(error);
      }
    })();
  });
}
