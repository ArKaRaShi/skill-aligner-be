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
      subjectCode: course.subject_code,
    },
    update: {},
    create: {
      id: uuidv4(),
      campusId,
      facultyId,
      subjectCode: course.subject_code,
      subjectName: course.subject_name_th,
    },
  });

  // Find or create course offering
  const upsertedCourseOffering = await prisma.courseOffering.upsert({
    where: {
      unique_course_offering: {
        courseId: upsertedCourse.id,
        semester: course.semester,
        academicYear: course.academic_year,
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      courseId: upsertedCourse.id,
      semester: course.semester,
      academicYear: course.academic_year,
    },
  });

  const existingVector = await prisma.courseLearningOutcomeVector.findUnique({
    where: {
      cleanedCloName: course.clean_clo_name_th,
    },
  });

  const skipEmbedding = course.skipEmbedding ?? false;
  const metadata = { keywords: course.keywords ?? [] };

  let vectorId: string | null = null;

  // Create vector if it doesn't exist and not skipping embedding
  if (!existingVector && !skipEmbedding) {
    const newVector = await prisma.courseLearningOutcomeVector.create({
      data: {
        id: uuidv4(),
        cleanedCloName: course.clean_clo_name_th,
      },
    });
    vectorId = newVector.id;
  } else if (existingVector) {
    vectorId = existingVector.id;
  }

  // Create CourseLearningOutcome
  await prisma.courseLearningOutcome.create({
    data: {
      id: uuidv4(),
      cloNo: course.clo_no,
      originalCloName: course.original_clo_name_th,
      cleanedCloName: course.clean_clo_name_th,
      courseOfferingId: upsertedCourseOffering.id,
      vectorId: vectorId,
      metadata,
      skipEmbedding,
      hasEmbedding768: false,
      hasEmbedding1536: false,
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
  const courseOfferings = await prisma.courseOffering.findMany();
  const clos = await prisma.courseLearningOutcome.findMany();
  const seenCLONamesInDB = new Set<string>();
  for (const clo of clos) {
    if (seenCLONamesInDB.has(clo.cleanedCloName)) {
      console.warn(
        `Warning: Duplicate CLO name in DB: ${clo.cleanedCloName} (ID: ${clo.id})`,
      );
    } else {
      seenCLONamesInDB.add(clo.cleanedCloName);
    }
  }

  const courseCount = courses.length;
  const courseOfferingCount = courseOfferings.length;
  const cloCount = clos.length;

  console.log(`Total courses in DB: ${courseCount}`);
  console.log(`Total course offerings in DB: ${courseOfferingCount}`);
  console.log(`Total CLOs in DB: ${cloCount}`);

  const uniqueCourses = new Set<string>();
  const uniqueCourseOfferings = new Set<string>();
  const uniqueCLOSet = new Set<string>();
  const uniqueCLOWithNameSet = new Set<string>();

  // Track CLOs by name to find duplicates with different numbers
  const closByName = new Map<string, Set<number>>();

  for (const course of cleanedCoursesWithCLO) {
    const courseKey = `${course.subject_code}`;
    uniqueCourses.add(courseKey);

    const courseOfferingKey = `${course.academic_year}-${course.subject_code}-${course.semester}`;
    uniqueCourseOfferings.add(courseOfferingKey);

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
  console.log(
    `Expected unique course offerings: ${uniqueCourseOfferings.size}`,
  );
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

  if (courseOfferingCount !== uniqueCourseOfferings.size) {
    throw new Error(
      `Post-validation failed: Expected at ${uniqueCourseOfferings.size} course offerings, but found ${courseOfferingCount}.`,
    );
  }

  if (cloCount !== uniqueCLOSet.size) {
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
      'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
    );

  if (deleteExisting) {
    console.log(`Deleting existing courses and learning outcomes...`);
    await prismaClient.courseLearningOutcome.deleteMany({});
    await prismaClient.courseLearningOutcomeVector.deleteMany({});
    await prismaClient.courseOffering.deleteMany({});
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
  main({ deleteExisting: true, seeds: true })
    .then(async () => {
      await prismaClient.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prismaClient.$disconnect();
      process.exit(1);
    });
}

// bunx ts-node --require tsconfig-paths/register prisma/seeds/course-lo-v2.seed.ts
