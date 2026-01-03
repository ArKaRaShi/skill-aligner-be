import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { Logger, PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { CampusModule } from './modules/campus/campus.module';
import { EvaluatorModule } from './modules/evaluator/evaluator.module';
import { QueryProcessorModule } from './modules/query-processor/query-processor.module';

function logEnvironmentVariables(
  appConfigService: AppConfigService,
  logger: PinoLogger,
) {
  logger.info({
    type: 'environment_variables',
    application: {
      nodeEnv: appConfigService.nodeEnv,
      port: appConfigService.port,
      database: appConfigService.databaseUrl,
    },
    llmProvider: {
      default: appConfigService.defaultLlmProvider,
      openaiApiKey: appConfigService.openAIApiKey ? '****' : 'Not Set',
      openrouterApiKey: appConfigService.openRouterApiKey ? '****' : 'Not Set',
      openrouterBaseUrl: appConfigService.openRouterBaseUrl,
    },
    llmModels: {
      questionClassifier: appConfigService.questionClassifierLlmModel,
      queryProfileBuilder: appConfigService.queryProfileBuilderLlmModel,
      skillExpander: appConfigService.skillExpanderLlmModel,
      answerSynthesis: appConfigService.answerSynthesisLlmModel,
      filterLo: appConfigService.filterLoLlmModel,
      courseRelevanceFilter: appConfigService.courseRelevanceFilterLlmModel,
    },
    embedding: {
      provider: appConfigService.embeddingProvider,
      semanticsApiUrl: appConfigService.semanticsApiBaseUrl,
    },
    mockServices: {
      questionClassifier: appConfigService.useMockQuestionClassifierService,
      skillExpander: appConfigService.useMockSkillExpanderService,
      queryProfileBuilder: appConfigService.useMockQueryProfileBuilderService,
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const appConfigService = app.get(AppConfigService);

  // Use resolve() for scoped providers like PinoLogger
  const pinoLogger = await app.resolve(PinoLogger);
  pinoLogger.setContext('Bootstrap');

  // Use Logger (NestJS wrapper) for global logging
  app.useLogger(new Logger(pinoLogger, {}));

  // Global setup
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
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
      include: [AppModule, QueryProcessorModule, CampusModule, EvaluatorModule],
    });
  SwaggerModule.setup('/swagger', app, documentFactory, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    jsonDocumentUrl: '/swagger/swagger.json',
    useGlobalPrefix: true,
  });

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  await app.listen(appConfigService.port);
  logEnvironmentVariables(appConfigService, pinoLogger);

  pinoLogger.info(
    `Application running in ${appConfigService.nodeEnv} mode on port ${appConfigService.port}`,
  );
}
void bootstrap();
