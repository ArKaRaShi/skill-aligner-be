import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EmbedPipeline } from './pipelines/embed.pipeline';
import { EmbedPipelineV2 } from './pipelines/embed.pipeline.v2';
import { EmbedPipelineV3 } from './pipelines/embed.pipeline.v3';
import { InspectEmbeddingsPipeline } from './pipelines/inspect-embeddings.pipeline';
import { SeedCampusAndFacultyPipeline } from './pipelines/seed-campus-and-faculty.pipeline';
import { SeedCourseAndLoPipeline } from './pipelines/seed-course-and-lo.pipeline';
import { SeedCourseAndLoPipelineV2 } from './pipelines/seed-course-and-lo.pipeline.v2';
import { UpdateGenEdCodesPipeline } from './pipelines/update-gened-codes.pipeline';
import { UpdateGenEdCodesPipelineV2 } from './pipelines/update-gened-codes.pipeline.v2';

/**
 * Show help message with all available pipelines and options
 */
function showHelp(): void {
  console.log(`
Pipeline CLI

Execute data pipelines for course management, embeddings, and more.

Usage:
  bunx ts-node --require tsconfig-paths/register src/cli.ts <pipeline-type> [options...]

Pipeline types:
  embed                    Embed course learning outcomes (original)
  embed-v2                 Embed with combined faculty+course+LO text
  embed-v3                 Embed with deduplication and batch processing (1536 only)
  inspect-embeddings       Inspect 1536-dimensional embeddings and compute similarity
  seed-course-lo           Seed courses and learning outcomes
  seed-course-lo-v2        Seed courses using batch createMany (faster)
  seed-campus-faculty      Seed campuses and faculties
  update-gened-codes       Update GenEd course codes (original, slow)
  update-gened-codes-v2    Update GenEd course codes (2 queries total!)

Options:
  --batch-size <size>       Set batch size for processing (default varies by pipeline)
  --concurrent-batches <n>  Set number of concurrent batches (embed-v3 only, default: 3)
  --delete                  Delete existing embeddings/data before processing
  --no-seed                 Skip seeding (only delete)
  --no-embed                Skip embedding (only delete existing)
  --help, -h                Show this help message

Examples:
  # Show this help
  bunx ts-node --require tsconfig-paths/register src/cli.ts --help

  # Embed with dimension
  bunx ts-node --require tsconfig-paths/register src/cli.ts embed 1536

  # Embed v3 with custom batch settings
  bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v3 --batch-size 100 --concurrent-batches 5

  # Delete existing embeddings and re-embed
  bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v3 --delete

  # Delete existing embeddings only (don't re-embed)
  bunx ts-node --require tsconfig-paths/register src/cli.ts embed-v3 --delete --no-embed

  # Seed courses with batch size
  bunx ts-node --require tsconfig-paths/register src/cli.ts seed-course-lo-v2 --batch-size 50

  # Update GenEd codes (fast version)
  bunx ts-node --require tsconfig-paths/register src/cli.ts update-gened-codes-v2

  # Inspect embeddings for a query
  bunx ts-node --require tsconfig-paths/register src/cli.ts inspect-embeddings "machine learning"
`);
}

async function bootstrap() {
  const args = process.argv.slice(2);
  const pipelineType = args[0];

  // Handle --help flag
  if (!pipelineType || pipelineType === '--help' || pipelineType === '-h') {
    showHelp();
    process.exit(pipelineType ? 0 : 1);
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    if (pipelineType === 'embed') {
      const dimension = args[1] ? Number(args[1]) : 768;
      const pipeline = appContext.get(EmbedPipeline);
      await pipeline.embedCourseLearningOutcomes(dimension);
    } else if (pipelineType === 'embed-v2') {
      const dimension = args[1] ? Number(args[1]) : 768;
      const pipeline = appContext.get(EmbedPipelineV2);
      await pipeline.embedCourseLearningOutcomes(dimension);
    } else if (pipelineType === 'embed-v3') {
      const pipeline = appContext.get(EmbedPipelineV3);
      const batchSizeIndex = args.indexOf('--batch-size');
      const batchSize =
        batchSizeIndex !== -1 ? Number(args[batchSizeIndex + 1]) : undefined;
      const concurrentBatchesIndex = args.indexOf('--concurrent-batches');
      const concurrentBatches =
        concurrentBatchesIndex !== -1
          ? Number(args[concurrentBatchesIndex + 1])
          : undefined;
      await pipeline.embedCourseLearningOutcomes({
        batchSize,
        concurrentBatches,
        deleteExisting: args.includes('--delete'),
        embed: !args.includes('--no-embed'),
      });
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
    } else if (pipelineType === 'seed-course-lo-v2') {
      const pipeline = appContext.get(SeedCourseAndLoPipelineV2);
      const batchSizeIndex = args.indexOf('--batch-size');
      const batchSize =
        batchSizeIndex !== -1 ? Number(args[batchSizeIndex + 1]) : 100;
      await pipeline.execute({
        deleteExisting: args.includes('--delete'),
        seeds: !args.includes('--no-seed'),
        batchSize,
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
    } else if (pipelineType === 'update-gened-codes-v2') {
      const pipeline = appContext.get(UpdateGenEdCodesPipelineV2);
      await pipeline.execute();
    } else {
      console.error(`Unknown pipeline type: ${pipelineType}`);
      console.error('Run --help to see available pipelines.');
      await appContext.close();
      process.exit(1);
    }

    await appContext.close();
    process.exit(0);
  } catch (error) {
    console.error('CLI task failed:', error);
    await appContext.close();
    process.exit(1);
  }
}

bootstrap();
