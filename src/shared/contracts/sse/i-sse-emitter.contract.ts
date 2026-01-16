/**
 * Dependency injection token for ISseEmitter.
 */
export const I_SSE_EMITTER_TOKEN = Symbol('ISseEmitter');

/**
 * Contract for Server-Sent Events emission.
 *
 * This interface abstracts the SSE transport layer, allowing implementations
 * to be swapped (native Express, better-sse, etc.) without changing business logic.
 *
 * @template TEvent - The type of events to emit
 */
export interface ISseEmitter<TEvent = unknown> {
  /**
   * Emit an event to the client.
   *
   * @param event - The event object to emit (will be JSON serialized)
   * @param eventName - SSE event name for the `event:` field.
   *                    Frontend can use `addEventListener(eventName)` to listen
   *                    to specific event types.
   *
   * @example
   * emitter.emit({ status: 'started' }, 'step');
   * // Outputs:
   * // event: step
   * // data: {"status":"started"}
   */
  emit(event: TEvent, eventName: string): void;

  /**
   * Complete the SSE stream and close the connection.
   */
  complete(): void;

  /**
   * Signal an error to the client.
   * @param error - The error that occurred
   */
  error(error: Error): void;
}
