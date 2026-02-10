import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const courses = await prisma.course.findMany({
      where: {
        courseOfferings: { none: {} },
      },
    });
    if (courses.length > 0) {
      console.log(`Courses with no offerings (${courses.length}):`);
    } else {
      console.log('No courses without offerings found.');
    }

    console.log('Check completed');
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

// bunx ts-node --require tsconfig-paths/register src/playground2.ts
