import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { UserHttpModule } from './modules/user/adapters/primary/http/user-http.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfigService = app.get(AppConfigService);

  // Global setup
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that do not have any decorators
      transform: true, // automatically transform payloads to be objects typed according to their DTO classes
      forbidNonWhitelisted: true, // throw an error if non-whitelisted values are present
    }),
  );

  // TODO: move swagger setup to its own module
  const config = new DocumentBuilder()
    .setTitle('Carreer Skill Aligner API')
    .setDescription('API documentation for Career Skill Aligner application')
    .setVersion('1.0')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      include: [AppModule, UserHttpModule],
    });
  SwaggerModule.setup('/swagger', app, documentFactory, {
    // explorer: true,
    // swaggerOptions: {
    //   urls: this.getSwaggerUrls(),
    // },
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    jsonDocumentUrl: '/swagger/swagger.json',
    useGlobalPrefix: true,
  });

  await app.listen(appConfigService.port);

  console.log(`App running in ${appConfigService.nodeEnv} mode`);
  console.log(`App listening on port ${appConfigService.port}`);
}
void bootstrap();
