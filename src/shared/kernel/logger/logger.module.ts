import { Module } from '@nestjs/common';

import { LoggerModule as NestPinoLoggerModule } from 'nestjs-pino';
import { AppConfigModule } from 'src/shared/kernel/config/app-config.module';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

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
              // Customize request logging to exclude body
              serializers: {
                req: (req: any) => ({
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  method: req.method,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  url: req.url,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  headers: req.headers,
                }),
              },
            },
          }),
        }),
      ],
      exports: [NestPinoLoggerModule],
    };
  }
}
