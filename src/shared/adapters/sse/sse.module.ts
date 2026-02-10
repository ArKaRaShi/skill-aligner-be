import { Module } from '@nestjs/common';

import {
  I_SSE_EMITTER_FACTORY_TOKEN,
  SseEmitterFactory,
} from './sse-emitter.factory';

/**
 * SSE Adapter Module
 *
 * Provides Server-Sent Events functionality through a contract-based abstraction.
 * This module allows for easy swapping of SSE implementations (native Express,
 * better-sse, etc.) without changing business logic.
 *
 * Usage:
 * 1. Import this module in your feature module
 * 2. Inject I_SSE_EMITTER_FACTORY_TOKEN
 * 3. Use factory.create() to create emitters for your SSE endpoints
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [SseModule],
 *   providers: [MyController],
 * })
 * export class MyModule {}
 *
 * @Controller()
 * class MyController {
 *   constructor(
 *     @Inject(I_SSE_EMITTER_FACTORY_TOKEN)
 *     private readonly sseFactory: SseEmitterFactory,
 *   ) {}
 *
 *   @Post('stream')
 *   stream(@Res() response: Response) {
 *     const emitter = this.sseFactory.create(response);
 *     emitter.emit({ data: 'hello' });
 *     emitter.complete();
 *   }
 * }
 * ```
 */
@Module({
  providers: [
    {
      provide: I_SSE_EMITTER_FACTORY_TOKEN,
      useClass: SseEmitterFactory,
    },
  ],
  exports: [I_SSE_EMITTER_FACTORY_TOKEN],
})
export class SseModule {}
