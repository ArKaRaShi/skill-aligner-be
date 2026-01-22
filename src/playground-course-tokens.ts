/**
 * Playground: Load all courses and learning outcomes, compare token counts across strategies AND models
 *
 * Strategies:
 *   1. Toon encode - Token-Oriented Object Notation for LLMs
 *   2. JSON direct - Direct JSON stringification
 *   3. CSV flat - Flat CSV format (most token-efficient)
 *
 * Model Encodings Tested:
 *   - cl100k_base (GPT-4, GPT-4o, GPT-3.5-Turbo)
 *   - o200k_base (GPT-5, GPT-4.1)
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/playground-course-tokens.ts
 */
import { PrismaClient } from '@prisma/client';

import {
  encoding_for_model,
  get_encoding,
  Tiktoken,
  TiktokenEncoding,
  TiktokenModel,
} from '@dqbd/tiktoken';
import { encode } from '@toon-format/toon';
import { LLM_MODEL_REGISTRATIONS } from 'src/shared/adapters/llm/constants/model-registry.constant';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

interface CourseWithLOs {
  subjectCode: string;
  subjectName: string;
  learningOutcomes: {
    cleanedCloName: string;
  }[];
}

interface FlatLO {
  subjectCode: string;
  subjectName: string;
  cleanedCloName: string;
}

interface EncodingResult {
  encodingName: string;
  models: string[];
  toonTokens: number;
  jsonTokens: number;
  csvTokens: number;
  costEstimates: {
    baseModel: string;
    modelId: string;
    toonCost: number;
    jsonCost: number;
    csvCost: number;
  }[];
}

function countTokensWithEncoding(text: string, encoder: Tiktoken): number {
  return encoder.encode(text).length;
}

function flattenToCSV(courseWithLOs: CourseWithLOs[]): FlatLO[] {
  const flat: FlatLO[] = [];
  for (const course of courseWithLOs) {
    for (const lo of course.learningOutcomes) {
      flat.push({
        subjectCode: course.subjectCode,
        subjectName: course.subjectName,
        cleanedCloName: lo.cleanedCloName,
      });
    }
  }
  return flat;
}

function generateCSV(flatLos: FlatLO[]): string {
  const header = 'subjectCode,subjectName,cleanedCloName\n';
  const rows = flatLos
    .map((lo) => `${lo.subjectCode},${lo.subjectName},${lo.cleanedCloName}`)
    .join('\n');
  return header + rows;
}

function testEncoding(
  courseWithLOs: CourseWithLOs[],
  flatLos: FlatLO[],
  encodingName: TiktokenEncoding,
  models: string[],
): EncodingResult {
  const encoder = get_encoding(encodingName);

  // Strategy 1: Toon encode (nested structure)
  const toonEncoded = encode(courseWithLOs);
  const toonTokens = countTokensWithEncoding(toonEncoded, encoder);

  // Strategy 2: JSON direct (nested structure)
  const jsonStr = JSON.stringify(courseWithLOs);
  const jsonTokens = countTokensWithEncoding(jsonStr, encoder);

  // Strategy 3: CSV flat (flat structure)
  const csvStr = generateCSV(flatLos);
  const csvTokens = countTokensWithEncoding(csvStr, encoder);

  // Calculate costs for each model
  const costEstimates = models.map((modelId) => {
    const modelRegistration = LLM_MODEL_REGISTRATIONS.find(
      (m) => m.modelId === modelId,
    );
    const baseModel = modelRegistration?.baseModel || modelId;

    const toonCost = TokenCostCalculator.estimateCost({
      inputTokens: toonTokens,
      outputTokens: 0,
      model: modelId,
    }).estimatedCost;
    const jsonCost = TokenCostCalculator.estimateCost({
      inputTokens: jsonTokens,
      outputTokens: 0,
      model: modelId,
    }).estimatedCost;
    const csvCost = TokenCostCalculator.estimateCost({
      inputTokens: csvTokens,
      outputTokens: 0,
      model: modelId,
    }).estimatedCost;

    return {
      baseModel,
      modelId,
      toonCost,
      jsonCost,
      csvCost,
    };
  });

  encoder.free();

  return {
    encodingName,
    models,
    toonTokens,
    jsonTokens,
    csvTokens,
    costEstimates,
  };
}

function printOverallStats(
  results: EncodingResult[],
  totalCourses: number,
  totalLos: number,
): void {
  console.log('═════════════════════════════════════════');
  console.log('OVERALL STATISTICS - MULTIPLE ENCODINGS');
  console.log('═════════════════════════════════════════');
  console.log(`Total Courses:  ${totalCourses}`);
  console.log(`Total LOs:      ${totalLos}`);
  console.log('');

  for (const result of results) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Encoding: ${result.encodingName}`);
    console.log(`Models:  ${result.models.join(', ')}`);
    console.log('');

    console.log(`TOKEN COUNTS (same for all models):`);
    console.log(`Strategy 1 (Toon Encode - Nested):`);
    console.log(`  Tokens:    ${result.toonTokens.toLocaleString()}`);
    console.log(`  Avg per LO: ${(result.toonTokens / totalLos).toFixed(2)}`);
    console.log('');

    console.log(`Strategy 2 (JSON Direct - Nested):`);
    console.log(`  Tokens:    ${result.jsonTokens.toLocaleString()}`);
    console.log(`  Avg per LO: ${(result.jsonTokens / totalLos).toFixed(2)}`);
    console.log('');

    console.log(`Strategy 3 (CSV Flat):`);
    console.log(`  Tokens:    ${result.csvTokens.toLocaleString()}`);
    console.log(`  Avg per LO: ${(result.csvTokens / totalLos).toFixed(2)}`);
    console.log('');

    console.log(`COST ESTIMATES BY MODEL:`);
    for (const costEst of result.costEstimates) {
      console.log(`  ${costEst.baseModel}:`);
      console.log(`    Toon: $${costEst.toonCost.toFixed(4)}`);
      console.log(`    JSON: $${costEst.jsonCost.toFixed(4)}`);
      console.log(`    CSV:  $${costEst.csvCost.toFixed(4)}`);
    }
    console.log('');

    console.log(`TOKEN COMPARISON:`);
    console.log(
      `  Toon vs JSON: ${((result.toonTokens / result.jsonTokens) * 100).toFixed(1)}%`,
    );
    console.log(
      `  Toon vs CSV:  ${((result.toonTokens / result.csvTokens) * 100).toFixed(1)}%`,
    );
    console.log(
      `  CSV vs JSON:  ${((result.csvTokens / result.jsonTokens) * 100).toFixed(1)}%`,
    );

    const min = Math.min(
      result.toonTokens,
      result.jsonTokens,
      result.csvTokens,
    );
    let winner = '';
    if (result.csvTokens === min) winner = '🏆 CSV (most token-efficient)';
    else if (result.jsonTokens === min) winner = '🏆 JSON (cheapest)';
    else winner = '🏆 TOON';

    console.log(`  Winner: ${winner}`);
  }

  console.log('\n═════════════════════════════════════════');
}

function printEncodingComparison(results: EncodingResult[]): void {
  console.log('\n═════════════════════════════════════════');
  console.log('ENCODING COMPARISON (Toon tokens)');
  console.log('═════════════════════════════════════════');
  console.log(
    `Encoding`.padEnd(20) +
      `Toon`.padEnd(15) +
      `JSON`.padEnd(15) +
      `CSV`.padEnd(15) +
      `Winner`,
  );
  console.log('─'.repeat(75));

  for (const result of results) {
    const toonPct = ((result.toonTokens / results[0].toonTokens) * 100).toFixed(
      1,
    );
    const jsonPct = ((result.jsonTokens / results[0].toonTokens) * 100).toFixed(
      1,
    );
    const csvPct = ((result.csvTokens / results[0].toonTokens) * 100).toFixed(
      1,
    );

    const min = Math.min(
      result.toonTokens,
      result.jsonTokens,
      result.csvTokens,
    );
    let winner = '';
    if (result.toonTokens === min) winner = 'TOON';
    else if (result.jsonTokens === min) winner = 'JSON';
    else winner = 'CSV';

    console.log(
      `${result.encodingName.padEnd(20)}${result.toonTokens.toLocaleString().padStart(12)} (${toonPct.padStart(5)}%)${result.jsonTokens.toLocaleString().padStart(12)} (${jsonPct.padStart(5)}%)${result.csvTokens.toLocaleString().padStart(12)} (${csvPct.padStart(5)}%)  ${winner.padStart(6)}`,
    );
  }

  console.log('═════════════════════════════════════════');
}

function printSampleComparison(courseWithLOs: CourseWithLOs[]): void {
  if (courseWithLOs.length === 0) {
    console.log('\nNo courses to display samples from.');
    return;
  }

  const sampleCourse = courseWithLOs[0];
  const flatLos = flattenToCSV(courseWithLOs.slice(0, 3));

  console.log('\nSAMPLE COMPARISON (First Course + Flat LOs)');
  console.log('═════════════════════════════════════════');
  console.log(
    `Course: ${sampleCourse.subjectCode} - ${sampleCourse.subjectName}`,
  );
  console.log(`LOs: ${sampleCourse.learningOutcomes.length}`);
  console.log('');

  console.log('Strategy 1 - Toon (Nested):');
  const toonEncoded = encode(sampleCourse);
  console.log(toonEncoded.slice(0, 300));
  console.log('...\n');

  console.log('Strategy 2 - JSON (Nested):');
  const jsonStr = JSON.stringify(sampleCourse);
  console.log(jsonStr.slice(0, 300));
  console.log('...\n');

  console.log('Strategy 3 - CSV (Flat - first 5 LOs from first 3 courses):');
  const csvRows = flatLos.slice(0, 5);
  if (csvRows.length > 0) {
    const csvSample =
      'subjectCode,subjectName,cleanedCloName\n' +
      csvRows
        .map((lo) => `${lo.subjectCode},${lo.subjectName},${lo.cleanedCloName}`)
        .join('\n');
    console.log(csvSample);
  }
  console.log('...\n');

  console.log('═════════════════════════════════════════');
}

async function loadCourses(prisma: PrismaClient): Promise<CourseWithLOs[]> {
  const courses = await prisma.course.findMany({
    include: {
      courseLearningOutcomes: {
        orderBy: { cloNo: 'asc' },
      },
    },
    orderBy: { subjectCode: 'asc' },
  });

  return courses.map((course) => ({
    subjectCode: course.subjectCode,
    subjectName: course.subjectName,
    learningOutcomes: course.courseLearningOutcomes.map((clo) => ({
      cleanedCloName: clo.cleanedCloName,
    })),
  }));
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const courseWithLOs = await loadCourses(prisma);

    // Flatten for CSV
    const flatLos = flattenToCSV(courseWithLOs);

    // Show sample comparison
    printSampleComparison(courseWithLOs);

    // Group models by their encoding using encoding_for_model
    // This automatically determines which encoding each model uses
    const modelsGroupedByEncoding = new Map<TiktokenEncoding, string[]>();

    for (const modelRegistration of LLM_MODEL_REGISTRATIONS) {
      try {
        const encoder = encoding_for_model(
          modelRegistration.baseModel as TiktokenModel,
        );
        const encodingName = encoder.name as TiktokenEncoding;

        if (!modelsGroupedByEncoding.has(encodingName)) {
          modelsGroupedByEncoding.set(encodingName, []);
        }
        modelsGroupedByEncoding
          .get(encodingName)!
          .push(modelRegistration.modelId);

        encoder.free();
      } catch {
        // Skip models that don't have a known encoding
        continue;
      }
    }

    // Convert to array for processing
    const encodings = Array.from(modelsGroupedByEncoding.entries()).map(
      ([encodingName, models]) => ({
        name: encodingName,
        models,
      }),
    );

    const results = encodings.map((enc) =>
      testEncoding(courseWithLOs, flatLos, enc.name, enc.models),
    );

    // Print overall stats for each encoding
    printOverallStats(results, courseWithLOs.length, flatLos.length);

    // Print encoding comparison
    printEncodingComparison(results);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);

// bunx ts-node --require tsconfig-paths/register src/playground-course-tokens.ts
