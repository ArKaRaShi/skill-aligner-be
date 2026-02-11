import type { INestApplication } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppConfigService } from '../config/app-config.service';

type SwaggerSetupOptions = {
  include: Array<Type<unknown>>;
  title?: string;
  description?: string;
  version?: string;
  path?: string;
  jsonDocumentUrl?: string;
};

export class SwaggerSetup {
  static setup(
    app: INestApplication,
    appConfigService: AppConfigService,
    options: SwaggerSetupOptions,
  ) {
    if (appConfigService.isProduction) {
      return;
    }

    const config = new DocumentBuilder()
      .setTitle(options.title ?? 'Carreer Skill Aligner API')
      .setDescription(
        options.description ??
          'API documentation for Career Skill Aligner application',
      )
      .setVersion(options.version ?? '1.0')
      .build();

    const documentFactory = () =>
      SwaggerModule.createDocument(app, config, {
        include: options.include,
      });

    SwaggerModule.setup(options.path ?? '/swagger', app, documentFactory, {
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
      jsonDocumentUrl: options.jsonDocumentUrl ?? '/swagger/swagger.json',
      useGlobalPrefix: true,
    });
  }
}
