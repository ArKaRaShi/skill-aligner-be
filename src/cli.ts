import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EmbedPipeline } from './pipelines/embed.pipeline';
import { SeedCampusAndFacultyPipeline } from './pipelines/seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './pipelines/seed-course-and-lo.pipeline';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  // Get command line arguments
  const args = process.argv.slice(2);
  const pipelineType = args[0];
  const dimension = args[1] ? parseInt(args[1]) : 768;

  if (!pipelineType) {
    console.error(
      'Please specify a pipeline type: embed, seed-course-lo, or seed-campus-faculty',
    );
    console.log(
      'Usage: bunx ts-node --require tsconfig-paths/register src/cli.ts <pipeline-type> [dimension]',
    );
    console.log('Pipeline types:');
    console.log('  embed - Embed course learning outcomes');
    console.log('  seed-course-lo - Seed courses and learning outcomes');
    console.log('  seed-campus-faculty - Seed campuses and faculties');
    await appContext.close();
    process.exit(1);
  }

  try {
    if (pipelineType === 'embed') {
      const pipeline = appContext.get(EmbedPipeline);
      await pipeline.embedCourseLearningOutcomes(dimension);
    } else if (pipelineType === 'seed-course-lo') {
      const pipeline = appContext.get(SeedCourseAndLoPipeline);
      await pipeline.execute({
        deleteExisting: args.includes('--delete'),
        seeds: !args.includes('--no-seed'),
      });
    } else if (pipelineType === 'seed-campus-faculty') {
      const pipeline = appContext.get(SeedCampusAndFacultyPipeline);
      await pipeline.execute({
        deleteExisting: args.includes('--delete'),
        seeds: !args.includes('--no-seed'),
      });
    } else {
      console.error(`Unknown pipeline type: ${pipelineType}`);
      await appContext.close();
      process.exit(1);
    }

    await appContext.close(); // Close application context when done
    process.exit(0);
  } catch (error) {
    console.error('CLI task failed:', error);
    await appContext.close();
    process.exit(1);
  }
}

bootstrap();

// bunx ts-node --require tsconfig-paths/register src/cli.ts embed 768
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-course-lo
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-course-lo --delete --no-seed
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-campus-faculty
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-campus-faculty --delete --no-seed
