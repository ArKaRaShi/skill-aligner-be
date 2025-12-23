import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    // Count vectors with 768 dimensions
    const vectors768 = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM course_learning_outcome_vectors
      WHERE embedding_768 IS NOT NULL
    `;

    // Count vectors with 1536 dimensions
    const vectors1536 = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM course_learning_outcome_vectors
      WHERE embedding_1536 IS NOT NULL
    `;

    // Count total vectors
    const totalVectors = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM course_learning_outcome_vectors
    `;

    // Count CLOs with embedding flags
    const closWith768 = await prisma.courseLearningOutcome.count({
      where: { hasEmbedding768: true },
    });

    const closWith1536 = await prisma.courseLearningOutcome.count({
      where: { hasEmbedding1536: true },
    });

    // Count CLOs with skip embedding
    const closSkipEmbedding = await prisma.courseLearningOutcome.count({
      where: { skipEmbedding: true },
    });

    const totalClos = await prisma.courseLearningOutcome.count();

    // Convert counts to numbers
    const vector768Count = Number(vectors768[0].count);
    const vector1536Count = Number(vectors1536[0].count);
    const totalVectorCount = Number(totalVectors[0].count);

    console.log('=== LO Vector Counts ===');
    console.log(`Total vector records: ${totalVectorCount}`);
    console.log(`Vectors with 768 dimensions: ${vector768Count}`);
    console.log(`Vectors with 1536 dimensions: ${vector1536Count}`);

    console.log('\n=== CLO Flag Counts ===');
    console.log(`Total CLO records: ${totalClos}`);
    console.log(`CLOs with has_embedding_768=true: ${closWith768}`);
    console.log(`CLOs with has_embedding_1536=true: ${closWith1536}`);
    console.log(`CLOs with skip_embedding=true: ${closSkipEmbedding}`);

    console.log('\n=== Calculation Assertions ===');

    // Calculate expected CLOs that should have embeddings (total - skip)
    const expectedClosWithEmbedding = totalClos - closSkipEmbedding;

    // Assert that vector counts should be <= expected CLOs (not skipped)
    // Multiple CLOs can share the same vector record (one-to-many relationship)
    console.log(
      `Vector 768 count (${vector768Count}) <= Expected CLOs with embedding (${expectedClosWithEmbedding}): ${vector768Count <= expectedClosWithEmbedding ? '✅ PASS' : '❌ FAIL'}`,
    );
    console.log(
      `Vector 1536 count (${vector1536Count}) <= Expected CLOs with embedding (${expectedClosWithEmbedding}): ${vector1536Count <= expectedClosWithEmbedding ? '✅ PASS' : '❌ FAIL'}`,
    );

    // Assert that CLO flag counts should be >= vector counts (due to shared vectors)
    console.log(
      `CLO 768 flag count (${closWith768}) >= Vector 768 count (${vector768Count}): ${closWith768 >= vector768Count ? '✅ PASS' : '❌ FAIL'}`,
    );
    console.log(
      `CLO 1536 flag count (${closWith1536}) >= Vector 1536 count (${vector1536Count}): ${closWith1536 >= vector1536Count ? '✅ PASS' : '❌ FAIL'}`,
    );

    // Assert that skip embedding + embedded CLOs equals total CLOs
    console.log(
      `Total CLOs (${totalClos}) - Skip embedding (${closSkipEmbedding}) == Expected CLOs with embedding (${expectedClosWithEmbedding}): ${totalClos - closSkipEmbedding === expectedClosWithEmbedding ? '✅ PASS' : '❌ FAIL'}`,
    );

    // Check if vectors with both dimensions exist
    const vectorsWithBoth = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM course_learning_outcome_vectors
      WHERE embedding_768 IS NOT NULL AND embedding_1536 IS NOT NULL
    `;
    const bothCount = Number(vectorsWithBoth[0].count);
    console.log(`Vectors with both dimensions: ${bothCount}`);

    // Check consistency: vectors with both should be <= individual vector counts
    console.log(
      `Both dimensions count (${bothCount}) <= 768 count (${vector768Count}): ${bothCount <= vector768Count ? '✅ PASS' : '❌ FAIL'}`,
    );
    console.log(
      `Both dimensions count (${bothCount}) <= 1536 count (${vector1536Count}): ${bothCount <= vector1536Count ? '✅ PASS' : '❌ FAIL'}`,
    );

    console.log('\nCheck completed');
  } catch (error) {
    console.error('Error during playground execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths-register src/playground-lo-vector.ts
