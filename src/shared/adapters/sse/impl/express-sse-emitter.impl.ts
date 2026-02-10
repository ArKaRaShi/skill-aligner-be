import { Logger } from '@nestjs/common';

import type { Response } from 'express';
import { ISseEmitter } from 'src/shared/contracts/sse/i-sse-emitter.contract';

/**
 * Native Express implementation of ISseEmitter.
 *
 * Uses response.write() for SSE protocol compliance with the format:
 * data: <json-event>\n\n
 *
 * This implementation has zero external dependencies and follows the
 * WHATWG Server-Sent Events specification.
 *
 * @template TEvent - The type of events to emit
 */
export class ExpressSseEmitter<TEvent = unknown>
  implements ISseEmitter<TEvent>
{
  private readonly logger = new Logger(ExpressSseEmitter.name);
  private isClosed = false;

  constructor(private readonly response: Response) {
    this.setupSseHeaders();
  }

  emit(event: TEvent, eventName: string): void {
    if (this.isClosed) {
      this.logger.warn('Attempted to emit on closed SSE connection');
      return;
    }

    const eventData = JSON.stringify(event);

    // SSE-native format: event name + data
    this.response.write(`event: ${eventName}\n`);
    this.response.write(`data: ${eventData}\n\n`);
  }

  complete(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.response.end();
  }

  error(error: Error): void {
    if (this.isClosed) return;
    this.emit({ message: error.message } as TEvent, 'error');
    this.complete();
  }

  private setupSseHeaders(): void {
    this.response.set({
      'Cache-Control':
        'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    this.response.flushHeaders();
  }
}
