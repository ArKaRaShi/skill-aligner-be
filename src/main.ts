import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { CampusModule } from './modules/campus/campus.module';
import { QueryProcessorModule } from './modules/query-processor/query-processor.module';
import { UserHttpModule } from './modules/user/adapters/primary/http/user-http.module';

function logEnvironmentVariables(appConfigService: AppConfigService) {
  console.log('Environment Variables:');
  console.log(`NODE_ENV: ${appConfigService.nodeEnv}`);
  console.log(`PORT: ${appConfigService.port}`);
  console.log(`DATABASE_URL: ${appConfigService.databaseUrl}`);
  console.log(
    `OPENAI_API_KEY: ${appConfigService.openAIApiKey ? '****' : 'Not Set'}`,
  );
  console.log(
    `OPENROUTER_API_KEY: ${appConfigService.openRouterApiKey ? '****' : 'Not Set'}`,
  );
  console.log(`OPENROUTER_BASE_URL: ${appConfigService.openRouterBaseUrl}`);
  console.log(
    `QUESTION_CLASSIFIER_LLM_PROVIDER: ${appConfigService.questionClassifierLlmProvider}`,
  );
  console.log(
    `QUESTION_CLASSIFIER_LLM_MODEL: ${appConfigService.questionClassifierLlmModel}`,
  );
  console.log(
    `SKILL_EXPANDER_LLM_PROVIDER: ${appConfigService.skillExpanderLlmProvider}`,
  );
  console.log(
    `SKILL_EXPANDER_LLM_MODEL: ${appConfigService.skillExpanderLlmModel}`,
  );
  console.log(
    `ANSWER_GENERATOR_LLM_PROVIDER: ${appConfigService.answerGeneratorLlmProvider}`,
  );
  console.log(
    `ANSWER_GENERATOR_LLM_MODEL: ${appConfigService.answerGeneratorLlmModel}`,
  );
  console.log(`EMBEDDING_PROVIDER: ${appConfigService.embeddingProvider}`);
  console.log(
    `SEMANTICS_API_BASE_URL: ${appConfigService.semanticsApiBaseUrl}`,
  );
  console.log(
    `USE_MOCK_QUESTION_CLASSIFIER_SERVICE: ${appConfigService.useMockQuestionClassifierService}`,
  );
  console.log(
    `USE_MOCK_SKILL_EXPANDER_SERVICE: ${appConfigService.useMockSkillExpanderService}`,
  );
  console.log(
    `USE_MOCK_ANSWER_GENERATOR_SERVICE: ${appConfigService.useMockAnswerGeneratorService}`,
  );
}

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
      include: [AppModule, UserHttpModule, QueryProcessorModule, CampusModule],
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

  app.enableCors({
    // THis should be replaced with actual frontend URL in production
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  await app.listen(appConfigService.port);
  logEnvironmentVariables(appConfigService);

  console.log(`App running in ${appConfigService.nodeEnv} mode`);
  console.log(`App listening on port ${appConfigService.port}`);
}
void bootstrap();
