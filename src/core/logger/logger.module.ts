import { Module } from '@nestjs/common';

import { LoggerModule as NestPinoLoggerModule } from 'nestjs-pino';

import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

@Module({})
export class LoggerModule {
  static register() {
    return {
      module: LoggerModule,
      imports: [
        NestPinoLoggerModule.forRootAsync({
          imports: [AppConfigModule],
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => ({
            pinoHttp: {
              level: config.appDebug ? 'debug' : 'info',
              transport:
                config.nodeEnv === 'production'
                  ? undefined
                  : {
                      target: 'pino-pretty',
                      options: {
                        colorize: true,
                        translateTime: 'SYS:HH:MM:ss.l',
                        ignore: 'pid,hostname',
                        messageFormat: '[{context}] {msg}',
                      },
                    },
            },
          }),
        }),
      ],
      exports: [NestPinoLoggerModule],
    };
  }
}
