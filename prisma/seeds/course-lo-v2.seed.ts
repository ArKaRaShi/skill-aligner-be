// import { PrismaClient } from '@prisma/client';

// import { v4 as uuidv4 } from 'uuid';

// import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
// import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

// const prismaClient = new PrismaClient();

// export type CampusFacultyMap = Map<
//   string,
//   { campusId: string; facultyId: string }
// >;

// type SeedCourseAndLOParams = {
//   prisma: PrismaClient;
//   campusFacultyMap: CampusFacultyMap;
//   course: CleanCourseWithCLO;
// };

// export function buildKey(campusCode: string, facultyCode: string): string {
//   return `${campusCode}-${facultyCode}`;
// }

// export async function seedCourseAndLO({
//   prisma,
//   course,
//   campusFacultyMap,
// }: SeedCourseAndLOParams) {
//   const campusFaculty = campusFacultyMap.get(
//     buildKey(course.campus_code, course.faculty_code),
//   );

//   if (!campusFaculty) {
//     throw new Error(
//       `Missing campus/faculty mapping for ${course.campus_code}-${course.faculty_code}`,
//     );
//   }

//   const { campusId, facultyId } = campusFaculty;

//   const upsertedCourse = await prisma.course.upsert({
//     where: {
//       subjectCode: course.subject_code,
//     },
//     update: {},
//     create: {
//       id: uuidv4(),
//       campusId,
//       facultyId,
//       subjectCode: course.subject_code,
//       subjectName: course.subject_name_th,
//     },
//   });

//   // Create CourseLearningOutcome
//   await prisma.courseLearningOutcome.upsert({
//     where: {
//       unique_course_clo: {
//         courseId: upsertedCourse.id,
//         cloNo: course.clo_no,
//       },
//     },
//     update: {},
//     create: {
//       id: uuidv4(),
//       courseId: upsertedCourse.id,
//       cloNo: course.clo_no,
//       originalCloName: course.original_clo_name,
//       cleanedCloName: course.clean_clo_name_th,
//     },
//   });
// }

// export async function findAllAndBuildCampusFacultyMap(
//   prisma: PrismaClient = prismaClient,
// ): Promise<CampusFacultyMap> {
//   const map = new Map<string, { campusId: string; facultyId: string }>();
//   const campusFaculties = await prisma.campusFaculty.findMany({
//     include: { campus: true, faculty: true },
//   });
//   for (const {
//     campus: { id: campusId, code: campusCode },
//     faculty: { id: facultyId, code: facultyCode },
//   } of campusFaculties) {
//     const key = buildKey(campusCode, facultyCode);
//     map.set(key, { campusId, facultyId });
//   }
//   return map;
// }

// export function validateCampusFacultyMap(
//   cleanedCoursesWithCLO: CleanCourseWithCLO[],
//   campusFacultyMap: CampusFacultyMap,
// ) {
//   const missingCampusFacultySet = new Set<string>();
//   for (const course of cleanedCoursesWithCLO) {
//     const key = buildKey(course.campus_code, course.faculty_code);
//     if (!campusFacultyMap.has(key)) {
//       missingCampusFacultySet.add(key);
//     }
//   }

//   if (missingCampusFacultySet.size > 0) {
//     throw new Error(
//       `Missing campus-faculty combinations: ${Array.from(
//         missingCampusFacultySet,
//       ).join(', ')}`,
//     );
//   }
// }

// async function postValidation({
//   prisma,
//   cleanedCoursesWithCLO,
// }: {
//   prisma: PrismaClient;
//   cleanedCoursesWithCLO: CleanCourseWithCLO[];
// }) {
//   const courses = await prisma.course.findMany();
//   const clos = await prisma.courseLearningOutcome.findMany();
//   const vectors = await prisma.courseLearningOutcomeVector.findMany();

//   const seenCLONamesInDB = new Set<string>();
//   for (const clo of clos) {
//     if (seenCLONamesInDB.has(clo.cleanedCloName)) {
//       console.warn(
//         `Warning: Duplicate CLO name in DB: ${clo.cleanedCloName} (ID: ${clo.id})`,
//       );
//     } else {
//       seenCLONamesInDB.add(clo.cleanedCloName);
//     }
//   }

//   const courseCount = courses.length;
//   const cloCount = clos.length;
//   const vectorCount = vectors.length;

//   console.log(`Total courses in DB: ${courseCount}`);
//   console.log(`Total CLOs in DB: ${cloCount}`);
//   console.log(`Total vectors in DB: ${vectorCount}`);

//   const uniqueCourses = new Set<string>();
//   const uniqueCLOSet = new Set<string>();
//   const uniqueCLOWithNameSet = new Set<string>();

//   // Track CLOs by name to find duplicates with different numbers
//   const closByName = new Map<string, Set<number>>();

//   for (const course of cleanedCoursesWithCLO) {
//     const courseKey = `${course.subject_code}`;
//     uniqueCourses.add(courseKey);

//     const cloKey = `${course.clo_no}-${course.clean_clo_name_th}`;
//     uniqueCLOSet.add(cloKey);

//     const cloWithNameKey = `${course.clean_clo_name_th}`;
//     uniqueCLOWithNameSet.add(cloWithNameKey);

//     // Track CLO numbers for each name
//     if (!closByName.has(course.clean_clo_name_th)) {
//       closByName.set(course.clean_clo_name_th, new Set());
//     }
//     closByName.get(course.clean_clo_name_th)?.add(course.clo_no);
//   }

//   console.log(`Expected unique courses: ${uniqueCourses.size}`);
//   console.log(`Expected unique CLOs: ${uniqueCLOSet.size}`);
//   console.log(
//     `Expected unique CLOs (by name only): ${uniqueCLOWithNameSet.size}`,
//   );

//   if (courseCount !== uniqueCourses.size) {
//     throw new Error(
//       `Post-validation failed: Expected at ${uniqueCourses.size} courses, but found ${courseCount}.`,
//     );
//   }

//   if (cloCount !== uniqueCLOSet.size) {
//     throw new Error(
//       `Post-validation failed: Expected at ${uniqueCLOSet.size} CLOs, but found ${cloCount}.`,
//     );
//   }
// }

// async function main({
//   deleteExisting = false,
//   seeds = false,
// }: {
//   deleteExisting?: boolean;
//   seeds?: boolean;
// }) {
//   const cleanedCoursesWithCLO: CleanCourseWithCLO[] =
//     await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
//       'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
//     );

//   if (deleteExisting) {
//     console.log(`Deleting existing courses and learning outcomes...`);
//     await prismaClient.courseLearningOutcome.deleteMany({});
//     await prismaClient.courseLearningOutcomeVector.deleteMany({});
//     await prismaClient.courseOffering.deleteMany({});
//     await prismaClient.course.deleteMany({});
//   }

//   console.log(`Checking campus-faculty combinations in DB...`);
//   const campusFacultyMap = await findAllAndBuildCampusFacultyMap();
//   console.log(`Campus-Faculty combinations in DB: ${campusFacultyMap.size}`);
//   validateCampusFacultyMap(cleanedCoursesWithCLO, campusFacultyMap);
//   console.log(`✅ All campus-faculty combinations are valid.`);

//   if (seeds) {
//     console.log(`Seeding courses and learning outcomes...`);
//     for (const course of cleanedCoursesWithCLO) {
//       console.log(`- Seeding course: ${course.subject_code}`);
//       await seedCourseAndLO({
//         prisma: prismaClient,
//         campusFacultyMap,
//         course,
//       });
//     }
//   }

//   console.log(`✅ Seeding courses and learning outcomes completed.`);
//   console.log(`Running post-validation...`);
//   await postValidation({ prisma: prismaClient, cleanedCoursesWithCLO });
//   console.log(`✅ Post-validation completed successfully.`);
// }

// if (require.main === module) {
//   main({ deleteExisting: true, seeds: true })
//     .then(async () => {
//       await prismaClient.$disconnect();
//     })
//     .catch(async (e) => {
//       console.error(e);
//       await prismaClient.$disconnect();
//       process.exit(1);
//     });
// }

// // bunx ts-node --require tsconfig-paths/register prisma/seeds/course-lo-v2.seed.ts
