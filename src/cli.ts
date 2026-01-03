import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EmbedPipeline } from './pipelines/embed.pipeline';
import { EmbedPipelineV2 } from './pipelines/embed.pipeline.v2';
import { InspectEmbeddingsPipeline } from './pipelines/inspect-embeddings.pipeline';
import { SeedCampusAndFacultyPipeline } from './pipelines/seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './pipelines/seed-course-and-lo.pipeline';
import { UpdateGenEdCodesPipeline } from './pipelines/update-gened-codes.pipeline';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  // Get command line arguments
  const args = process.argv.slice(2);
  const pipelineType = args[0];
  const dimension = args[1] ? Number(args[1]) : 768;

  if (!pipelineType) {
    console.error(
      'Please specify a pipeline type: embed, embed-v2, inspect-embeddings, seed-course-lo, seed-campus-faculty, or update-gened-codes',
    );
    console.log(
      'Usage: bunx ts-node --require tsconfig-paths/register src/cli.ts <pipeline-type> [dimension] [options...]',
    );
    console.log('Pipeline types:');
    console.log('  embed - Embed course learning outcomes (original)');
    console.log(
      '  embed-v2 - Embed course learning outcomes with combined faculty+course+LO text',
    );
    console.log(
      '  inspect-embeddings - Inspect 1536-dimensional embeddings and compute similarity',
    );
    console.log('  seed-course-lo - Seed courses and learning outcomes');
    console.log('  seed-campus-faculty - Seed campuses and faculties');
    console.log(
      '  update-gened-codes - Update GenEd course codes based on processed data',
    );
    console.log('Examples:');
    console.log(
      '  bunx ts-node --require tsconfig-paths/register src/cli.ts embed 1536',
    );
    console.log(
      '  bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v2 768',
    );
    console.log(
      '  bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v2 1536',
    );
    console.log(
      '  bunx ts-node --require tsconfig-paths/register src/cli.ts inspect-embeddings "machine learning"',
    );
    await appContext.close();
    process.exit(1);
  }

  try {
    if (pipelineType === 'embed') {
      const pipeline = appContext.get(EmbedPipeline);
      await pipeline.embedCourseLearningOutcomes(dimension);
    } else if (pipelineType === 'embed-v2') {
      const pipeline = appContext.get(EmbedPipelineV2);
      await pipeline.embedCourseLearningOutcomes(dimension);
    } else if (pipelineType === 'inspect-embeddings') {
      const pipeline = appContext.get(InspectEmbeddingsPipeline);
      const queryText = args[1] || 'machine learning algorithms';
      await pipeline.queryAndLogTop5(queryText);
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
    } else if (pipelineType === 'update-gened-codes') {
      const pipeline = appContext.get(UpdateGenEdCodesPipeline);
      await pipeline.execute();
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
// bunx ts-node --require tsconfig-paths/register src/cli.ts embed 1536
// bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v2 768
// bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v2 1536
// bunx ts-node --require tsconfig-paths/register src/cli.ts inspect-embeddings "data analysis"
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-course-lo
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-course-lo --delete --no-seed
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-campus-faculty
// bunx ts-node --require tsconfig-paths/register src/cli.ts seed-campus-faculty --delete --no-seed
// bunx ts-node --require tsconfig-paths/register src/cli.ts update-gened-codes
