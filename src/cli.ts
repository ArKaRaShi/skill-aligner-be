import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EmbedPipeline } from './pipelines/embed.pipeline';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const dimension = 768; // Change to 1536 for the other dimension
  const pipeline = appContext.get(EmbedPipeline);

  try {
    await pipeline.embedCourseLearningOutcomes(dimension);
    await appContext.close(); // Close the application context when done
    process.exit(0);
  } catch (error) {
    console.error('CLI task failed:', error);
    await appContext.close();
    process.exit(1);
  }
}

bootstrap();

// bunx ts-node --require tsconfig-paths/register src/cli.ts
