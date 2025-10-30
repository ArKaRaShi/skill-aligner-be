import { PrismaClient } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

const prismaClient = new PrismaClient();

export type CampusFacultyMap = Map<
  string,
  { campusId: string; facultyId: string }
>;

type SeedCourseAndLOParams = {
  prisma: PrismaClient;
  campusFacultyMap: CampusFacultyMap;
  course: CleanCourseWithCLO;
};

export function buildKey(campusCode: string, facultyCode: string): string {
  return `${campusCode}-${facultyCode}`;
}

export async function seedCourseAndLO({
  prisma,
  course,
  campusFacultyMap,
}: SeedCourseAndLOParams) {
  const campusFaculty = campusFacultyMap.get(
    buildKey(course.campus_code, course.faculty_code),
  );

  if (!campusFaculty) {
    throw new Error(
      `Missing campus/faculty mapping for ${course.campus_code}-${course.faculty_code}`,
    );
  }

  const { campusId, facultyId } = campusFaculty;

  const upsertedCourse = await prisma.course.upsert({
    where: {
      unique_course: {
        academicYear: course.academic_year,
        subjectCode: course.subject_code,
        semester: course.semester,
      },
    },
    update: {
      campusId,
      facultyId,
      subjectNameTh: course.subject_name_th,
    },
    create: {
      id: uuidv4(),
      campusId,
      facultyId,
      academicYear: course.academic_year,
      semester: course.semester,
      subjectCode: course.subject_code,
      subjectNameTh: course.subject_name_th,
    },
  });

  const existingCLO = await prisma.courseLearningOutcome.findFirst({
    where: {
      cleanedCLONameTh: course.clean_clo_name_th,
    },
  });

  const skipEmbedding = course.skipEmbedding ?? false;
  const metadata = { keywords: course.keywords ?? [] };

  if (!existingCLO) {
    const loId = uuidv4();
    await prisma.$executeRaw`
    INSERT INTO course_learning_outcomes (
      id,
      original_clo_name,
      cleaned_clo_name_th,
      skip_embedding,
      metadata,
      embedding,
      created_at,
      updated_at
    )
    VALUES (
      ${loId}::uuid,
      ${course.original_clo_name_th},
      ${course.clean_clo_name_th},
      ${skipEmbedding},
      ${JSON.stringify(metadata)}::jsonb,
      array_fill(0::float4, ARRAY[768])::vector(768),
      NOW(),
      NOW()
    )
  `;
    await prisma.courseCLO.create({
      data: {
        id: uuidv4(),
        courseId: upsertedCourse.id,
        cloId: loId,
        cloNo: course.clo_no,
      },
    });
    return;
  }
  await prisma.courseCLO.upsert({
    where: {
      unique_course_clo: {
        courseId: upsertedCourse.id,
        cloId: existingCLO.id,
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      courseId: upsertedCourse.id,
      cloId: existingCLO.id,
      cloNo: course.clo_no,
    },
  });
}

export async function findAllAndBuildCampusFacultyMap(
  prisma: PrismaClient = prismaClient,
): Promise<CampusFacultyMap> {
  const map = new Map<string, { campusId: string; facultyId: string }>();
  const campusFaculties = await prisma.campusFaculty.findMany({
    include: { campus: true, faculty: true },
  });
  for (const {
    campus: { id: campusId, code: campusCode },
    faculty: { id: facultyId, code: facultyCode },
  } of campusFaculties) {
    const key = buildKey(campusCode, facultyCode);
    map.set(key, { campusId, facultyId });
  }
  return map;
}

export function validateCampusFacultyMap(
  cleanedCoursesWithCLO: CleanCourseWithCLO[],
  campusFacultyMap: CampusFacultyMap,
) {
  const missingCampusFacultySet = new Set<string>();
  for (const course of cleanedCoursesWithCLO) {
    const key = buildKey(course.campus_code, course.faculty_code);
    if (!campusFacultyMap.has(key)) {
      missingCampusFacultySet.add(key);
    }
  }

  if (missingCampusFacultySet.size > 0) {
    throw new Error(
      `Missing campus-faculty combinations: ${Array.from(
        missingCampusFacultySet,
      ).join(', ')}`,
    );
  }
}

async function postValidation({
  prisma,
  cleanedCoursesWithCLO,
}: {
  prisma: PrismaClient;
  cleanedCoursesWithCLO: CleanCourseWithCLO[];
}) {
  const courses = await prisma.course.findMany();
  const clos = await prisma.courseLearningOutcome.findMany();
  const seenCLONamesInDB = new Set<string>();
  for (const clo of clos) {
    if (seenCLONamesInDB.has(clo.cleanedCLONameTh)) {
      console.warn(
        `Warning: Duplicate CLO name in DB: ${clo.cleanedCLONameTh} (ID: ${clo.id})`,
      );
    } else {
      seenCLONamesInDB.add(clo.cleanedCLONameTh);
    }
  }

  const courseCount = courses.length;
  const cloCount = clos.length;

  console.log(`Total courses in DB: ${courseCount}`);
  console.log(`Total CLOs in DB: ${cloCount}`);

  const uniqueCourses = new Set<string>();
  const uniqueCLOSet = new Set<string>();
  const uniqueCLOWithNameSet = new Set<string>();

  // Track CLOs by name to find duplicates with different numbers
  const closByName = new Map<string, Set<number>>();

  for (const course of cleanedCoursesWithCLO) {
    const courseKey = `${course.academic_year}-${course.subject_code}-${course.semester}`;
    uniqueCourses.add(courseKey);

    const cloKey = `${course.clo_no}-${course.clean_clo_name_th}`;
    uniqueCLOSet.add(cloKey);

    const cloWithNameKey = `${course.clean_clo_name_th}`;
    uniqueCLOWithNameSet.add(cloWithNameKey);

    // Track CLO numbers for each name
    if (!closByName.has(course.clean_clo_name_th)) {
      closByName.set(course.clean_clo_name_th, new Set());
    }
    closByName.get(course.clean_clo_name_th)?.add(course.clo_no);
  }

  console.log(`Expected unique courses: ${uniqueCourses.size}`);
  console.log(`Expected unique CLOs: ${uniqueCLOSet.size}`);
  console.log(
    `Expected unique CLOs (by name only): ${uniqueCLOWithNameSet.size}`,
  );

  // Find CLOs with same name but different numbers
  // const duplicateNameCLOs = Array.from(closByName.entries())
  //   .filter(([_, numbers]) => numbers.size > 1)
  //   .sort((a, b) => b[1].size - a[1].size);

  // if (duplicateNameCLOs.length > 0) {
  //   console.log('\nCLOs with same name but different numbers:');
  //   duplicateNameCLOs.forEach(([name, numbers]) => {
  //     const courses = cleanedCoursesWithCLO
  //       .filter((c) => c.clean_clo_name_th === name)
  //       .map((c) => ({
  //         course: `${c.academic_year}-${c.subject_code}-${c.semester}`,
  //         cloNo: c.clo_no,
  //       }));

  //     console.log(
  //       `\n"${name}" appears with ${numbers.size} different CLO numbers:`,
  //     );
  //     const groupedByCLONo = courses.reduce(
  //       (acc, curr) => {
  //         if (!acc[curr.cloNo]) acc[curr.cloNo] = [];
  //         acc[curr.cloNo].push(curr.course);
  //         return acc;
  //       },
  //       {} as Record<number, string[]>,
  //     );

  //     Object.entries(groupedByCLONo)
  //       .sort(([a], [b]) => Number(a) - Number(b))
  //       .forEach(([cloNo, courseList]) => {
  //         console.log(`  CLO ${cloNo} in ${courseList.length} courses:`);
  //         console.log(`    ${courseList.join(', ')}`);
  //       });
  //   });
  // }

  if (courseCount !== uniqueCourses.size) {
    throw new Error(
      `Post-validation failed: Expected at ${uniqueCourses.size} courses, but found ${courseCount}.`,
    );
  }

  if (cloCount !== uniqueCLOWithNameSet.size) {
    throw new Error(
      `Post-validation failed: Expected at ${uniqueCLOSet.size} CLOs, but found ${cloCount}.`,
    );
  }
}

async function main({
  deleteExisting = false,
  seeds = false,
}: {
  deleteExisting?: boolean;
  seeds?: boolean;
}) {
  const cleanedCoursesWithCLO: CleanCourseWithCLO[] =
    await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/valid_courses_with_clo',
    );

  if (deleteExisting) {
    console.log(`Deleting existing courses and learning outcomes...`);
    await prismaClient.courseCLO.deleteMany({});
    await prismaClient.courseLearningOutcome.deleteMany({});
    await prismaClient.course.deleteMany({});
  }

  console.log(`Checking campus-faculty combinations in DB...`);
  const campusFacultyMap = await findAllAndBuildCampusFacultyMap();
  console.log(`Campus-Faculty combinations in DB: ${campusFacultyMap.size}`);
  validateCampusFacultyMap(cleanedCoursesWithCLO, campusFacultyMap);
  console.log(`✅ All campus-faculty combinations are valid.`);

  if (seeds) {
    console.log(`Seeding courses and learning outcomes...`);
    for (const course of cleanedCoursesWithCLO) {
      console.log(`- Seeding course: ${course.subject_code}`);
      await seedCourseAndLO({
        prisma: prismaClient,
        campusFacultyMap,
        course,
      });
    }
  }

  console.log(`✅ Seeding courses and learning outcomes completed.`);
  console.log(`Running post-validation...`);
  await postValidation({ prisma: prismaClient, cleanedCoursesWithCLO });
  console.log(`✅ Post-validation completed successfully.`);
}

if (require.main === module) {
  main({ deleteExisting: false, seeds: false })
    .then(async () => {
      await prismaClient.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prismaClient.$disconnect();
      process.exit(1);
    });
}

// bunx ts-node --require tsconfig-paths/register prisma/seeds/course-lo.seed.ts
