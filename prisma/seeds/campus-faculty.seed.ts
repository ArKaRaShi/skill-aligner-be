import { PrismaClient } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

const prismaClient = new PrismaClient();

type SeedCampusAndFacultyParams = {
  prisma: PrismaClient;
  campusCode: string;
  facultyCode: string;
};

async function seedCampusAndFaculty({
  prisma,
  campusCode,
  facultyCode,
}: SeedCampusAndFacultyParams) {
  const existingCampusFaculty = await prisma.campusFaculty.findFirst({
    where: {
      campus: {
        code: campusCode,
      },
      faculty: {
        code: facultyCode,
      },
    },
  });
  if (!existingCampusFaculty) {
    const { id: campusId } = await prisma.campus.upsert({
      where: {
        code: campusCode,
      },
      update: {},
      create: {
        id: uuidv4(),
        code: campusCode,
      },
    });

    const { id: facultyId } = await prisma.faculty.upsert({
      where: {
        code: facultyCode,
      },
      update: {},
      create: {
        id: uuidv4(),
        code: facultyCode,
      },
    });

    await prisma.campusFaculty.create({
      data: {
        id: uuidv4(),
        campusId,
        facultyId,
      },
    });
  }
}

async function main() {
  const cleanedCoursesWithCLO: CleanCourseWithCLO[] =
    await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/valid_courses_with_clo',
    );

  // Create maps to track unique campus-faculty pairs
  const uniquePairs = new Map<string, Set<string>>();

  // Collect unique campus-faculty pairs
  for (const course of cleanedCoursesWithCLO) {
    if (!uniquePairs.has(course.campus_code)) {
      uniquePairs.set(course.campus_code, new Set());
    }
    uniquePairs.get(course.campus_code)!.add(course.faculty_code);
  }

  console.log(`Seeding campus-faculty pairs...`);
  for (const [campusCode, faculties] of uniquePairs.entries()) {
    for (const facultyCode of faculties) {
      console.log(`- Seeding campus: ${campusCode}, faculty: ${facultyCode}`);
      await seedCampusAndFaculty({
        prisma: prismaClient,
        campusCode,
        facultyCode,
      });
    }
  }
  console.log(`✅ Seeding campus-faculty pairs completed.`);
}

main()
  .then(async () => {
    await prismaClient.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prismaClient.$disconnect();
    process.exit(1);
  });

// bunx ts-node --require tsconfig-paths/register prisma/seeds/campus-faculty.seed.ts
