import { Injectable } from '@nestjs/common';

import type { Response } from 'express';
import { ISseEmitter } from 'src/shared/contracts/sse/i-sse-emitter.contract';

import { ExpressSseEmitter } from './impl/express-sse-emitter.impl';

/**
 * Dependency injection token for SseEmitterFactory.
 */
export const I_SSE_EMITTER_FACTORY_TOKEN = Symbol('ISseEmitterFactory');

/**
 * Factory for creating ISseEmitter instances.
 *
 * This factory allows for easy swapping of SSE implementations
 * (e.g., from native Express to better-sse) without changing
 * the controller or use case code.
 *
 * Future: Can be enhanced with AppConfigService to switch implementations
 * based on environment variables or feature flags.
 */
@Injectable()
export class SseEmitterFactory {
  /**
   * Create a new SSE emitter instance.
   *
   * @template TEvent - The type of events the emitter will handle
   * @param response - The Express Response object
   * @returns An ISseEmitter implementation
   */
  create<TEvent = unknown>(response: Response): ISseEmitter<TEvent> {
    // Currently using native Express implementation
    // Future enhancement: can switch to better-sse based on config:
    //
    // if (config.useBetterSse) {
    //   const session = await createSession(req, response);
    //   return new BetterSseEmitter<TEvent>(session);
    // }
    //
    return new ExpressSseEmitter<TEvent>(response);
  }
}
