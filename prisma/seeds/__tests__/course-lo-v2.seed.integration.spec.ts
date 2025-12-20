// import { Test, TestingModule } from '@nestjs/testing';

// import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

// import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

// import {
//   buildKey,
//   CampusFacultyMap,
//   seedCourseAndLO,
// } from '../course-lo-v2.seed';

// const TEST_UUID_1 = '11111111-1111-1111-1111-111111111111';
// const TEST_UUID_2 = '22222222-2222-2222-2222-222222222222';
// const TEST_UUID_3 = '33333333-3333-3333-3333-333333333333';

// const CAMPUS1_ID = '11111111-1111-1111-1111-111111111111';
// const CAMPUS2_ID = '22222222-2222-2222-2222-222222222222';
// const FACULTY1_ID = '33333333-3333-3333-3333-333333333333';
// const FACULTY2_ID = '44444444-4444-4444-4444-444444444444';

// describe('course-lo-v2.seed (Integration) - seedCourseAndLO', () => {
//   let moduleRef: TestingModule;
//   let prisma: PrismaService;

//   let campusFacultyMap: CampusFacultyMap;

//   beforeAll(async () => {
//     moduleRef = await Test.createTestingModule({
//       providers: [PrismaService],
//     }).compile();

//     prisma = moduleRef.get(PrismaService);
//   });

//   beforeEach(async () => {
//     await prisma.$executeRaw`TRUNCATE TABLE course_learning_outcomes, course_learning_outcome_vectors, course_offerings, courses, campuses, faculties, campus_faculties RESTART IDENTITY CASCADE;`;
//     await setupCampusFacultyMap();
//   });

//   afterAll(async () => {
//     await moduleRef.close();
//   });

//   async function setupCampusFacultyMap() {
//     const campus1 = await prisma.campus.create({
//       data: {
//         id: CAMPUS1_ID,
//         code: 'CMP1',
//         nameTh: 'วิทยาเขต 1',
//         nameEn: 'Campus 1',
//       },
//     });

//     const campus2 = await prisma.campus.create({
//       data: {
//         id: CAMPUS2_ID,
//         code: 'CMP2',
//         nameTh: 'วิทยาเขต 2',
//         nameEn: 'Campus 2',
//       },
//     });

//     const faculty1 = await prisma.faculty.create({
//       data: {
//         id: FACULTY1_ID,
//         code: 'FAC1',
//         nameTh: 'คณะ 1',
//         nameEn: 'Faculty 1',
//       },
//     });

//     const faculty2 = await prisma.faculty.create({
//       data: {
//         id: FACULTY2_ID,
//         code: 'FAC2',
//         nameTh: 'คณะ 2',
//         nameEn: 'Faculty 2',
//       },
//     });

//     await prisma.campusFaculty.createMany({
//       data: [
//         {
//           id: TEST_UUID_1,
//           campusId: campus1.id,
//           facultyId: faculty1.id,
//         },
//         {
//           id: TEST_UUID_2,
//           campusId: campus2.id,
//           facultyId: faculty2.id,
//         },
//       ],
//     });

//     campusFacultyMap = new Map<
//       string,
//       { campusId: string; facultyId: string }
//     >();
//     campusFacultyMap.set(buildKey('CMP1', 'FAC1'), {
//       campusId: campus1.id,
//       facultyId: faculty1.id,
//     });
//     campusFacultyMap.set(buildKey('CMP2', 'FAC2'), {
//       campusId: campus2.id,
//       facultyId: faculty2.id,
//     });
//   }

//   describe('successful seeding scenarios', () => {
//     it('should create a new course, course offering, and learning outcome with vector', async () => {
//       const courseData: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'CMP1',
//         faculty_code: 'FAC1',
//         subject_code: 'TEST101',
//         subject_name_th: 'วิชาทดสอบ',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้',
//         skipEmbedding: false,
//         keywords: ['keyword1', 'keyword2'],
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData,
//         campusFacultyMap,
//       });

//       const course = await prisma.course.findUnique({
//         where: { subjectCode: courseData.subject_code },
//       });

//       expect(course).toBeDefined();
//       expect(course?.subjectCode).toBe(courseData.subject_code);
//       expect(course?.subjectName).toBe(courseData.subject_name_th);
//       expect(course?.campusId).toBe(CAMPUS1_ID);
//       expect(course?.facultyId).toBe(FACULTY1_ID);

//       const courseOffering = await prisma.courseOffering.findUnique({
//         where: {
//           unique_course_offering: {
//             courseId: course!.id,
//             semester: courseData.semester,
//             academicYear: courseData.academic_year,
//           },
//         },
//       });

//       expect(courseOffering).toBeDefined();
//       expect(courseOffering?.courseId).toBe(course!.id);
//       expect(courseOffering?.semester).toBe(courseData.semester);
//       expect(courseOffering?.academicYear).toBe(courseData.academic_year);

//       const vector = await prisma.courseLearningOutcomeVector.findUnique({
//         where: { cleanedCloName: courseData.clean_clo_name_th },
//       });

//       expect(vector).toBeDefined();
//       expect(vector?.cleanedCloName).toBe(courseData.clean_clo_name_th);

//       const clo = await prisma.courseLearningOutcome.findFirst({
//         where: {
//           courseOfferingId: courseOffering!.id,
//           cloNo: courseData.clo_no,
//         },
//       });

//       expect(clo).toBeDefined();
//       expect(clo?.cloNo).toBe(courseData.clo_no);
//       expect(clo?.originalCloName).toBe(courseData.original_clo_name_th);
//       expect(clo?.cleanedCloName).toBe(courseData.clean_clo_name_th);
//       expect(clo?.vectorId).toBe(vector!.id);
//       expect(clo?.skipEmbedding).toBe(false);
//       expect(clo?.metadata).toEqual({ keywords: courseData.keywords });
//     });

//     it('should create a new course, course offering, and learning outcome without vector when skipEmbedding is true', async () => {
//       const courseData: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 2,
//         campus_code: 'CMP2',
//         faculty_code: 'FAC2',
//         subject_code: 'TEST202',
//         subject_name_th: 'วิชาทดสอบ 2',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 2',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ 2',
//         skipEmbedding: true,
//         keywords: [],
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData,
//         campusFacultyMap,
//       });

//       const course = await prisma.course.findUnique({
//         where: { subjectCode: courseData.subject_code },
//       });

//       expect(course).toBeDefined();

//       const courseOffering = await prisma.courseOffering.findUnique({
//         where: {
//           unique_course_offering: {
//             courseId: course!.id,
//             semester: courseData.semester,
//             academicYear: courseData.academic_year,
//           },
//         },
//       });

//       expect(courseOffering).toBeDefined();

//       const vector = await prisma.courseLearningOutcomeVector.findUnique({
//         where: { cleanedCloName: courseData.clean_clo_name_th },
//       });

//       expect(vector).toBeNull();

//       const clo = await prisma.courseLearningOutcome.findFirst({
//         where: {
//           courseOfferingId: courseOffering!.id,
//           cloNo: courseData.clo_no,
//         },
//       });

//       expect(clo).toBeDefined();
//       expect(clo?.vectorId).toBeNull();
//       expect(clo?.skipEmbedding).toBe(true);
//     });

//     it('should reuse existing vector when clean_clo_name_th already exists', async () => {
//       const existingVector = await prisma.courseLearningOutcomeVector.create({
//         data: {
//           id: TEST_UUID_3,
//           cleanedCloName: 'ทดสอบผลลัพธ์การเรียนรู้',
//         },
//       });

//       const courseData: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'CMP1',
//         faculty_code: 'FAC1',
//         subject_code: 'TEST303',
//         subject_name_th: 'วิชาทดสอบ 3',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 3',
//         clean_clo_name_th: 'ทดสอบผลลัพธ์การเรียนรู้',
//         skipEmbedding: false,
//         keywords: [],
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData,
//         campusFacultyMap,
//       });

//       const clo = await prisma.courseLearningOutcome.findFirst({
//         where: {
//           courseOfferingId: (await prisma.courseOffering.findFirst({
//             where: {
//               courseId: (await prisma.course.findUnique({
//                 where: { subjectCode: courseData.subject_code },
//               }))!.id,
//             },
//           }))!.id,
//           cloNo: courseData.clo_no,
//         },
//       });

//       expect(clo).toBeDefined();
//       expect(clo?.vectorId).toBe(existingVector.id);

//       const vectorCount = await prisma.courseLearningOutcomeVector.count({
//         where: { cleanedCloName: courseData.clean_clo_name_th },
//       });

//       expect(vectorCount).toBe(1);
//     });

//     it('should merge multiple CLOs with the same clean_clo_name_th to use the same vector', async () => {
//       const courseData1: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'CMP1',
//         faculty_code: 'FAC1',
//         subject_code: 'TEST505',
//         subject_name_th: 'วิชาทดสอบ 5',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 5',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ร่วม',
//         skipEmbedding: false,
//         keywords: ['keyword1'],
//       };

//       const courseData2: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'CMP1',
//         faculty_code: 'FAC1',
//         subject_code: 'TEST506',
//         subject_name_th: 'วิชาทดสอบ 6',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 6',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ร่วม',
//         skipEmbedding: false,
//         keywords: ['keyword2'],
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData1,
//         campusFacultyMap,
//       });

//       await seedCourseAndLO({
//         prisma,
//         course: courseData2,
//         campusFacultyMap,
//       });

//       const vectors = await prisma.courseLearningOutcomeVector.findMany({
//         where: { cleanedCloName: 'ผลลัพธ์การเรียนรู้ร่วม' },
//       });

//       expect(vectors).toHaveLength(1);

//       const clos = await prisma.courseLearningOutcome.findMany({
//         where: { cleanedCloName: 'ผลลัพธ์การเรียนรู้ร่วม' },
//         include: { courseOffering: { include: { course: true } } },
//       });

//       expect(clos).toHaveLength(2);
//       expect(clos[0].vectorId).toBe(vectors[0].id);
//       expect(clos[1].vectorId).toBe(vectors[0].id);
//       expect(clos[0].metadata).toEqual({ keywords: ['keyword1'] });
//       expect(clos[1].metadata).toEqual({ keywords: ['keyword2'] });

//       const courseCodes = clos.map(
//         (clo) => clo.courseOffering.course.subjectCode,
//       );
//       expect(courseCodes).toContain('TEST505');
//       expect(courseCodes).toContain('TEST506');
//     });

//     it('should reuse existing course and create new course offering', async () => {
//       const courseData1: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'CMP1',
//         faculty_code: 'FAC1',
//         subject_code: 'TEST404',
//         subject_name_th: 'วิชาทดสอบ 4',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 4',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ 4',
//         skipEmbedding: false,
//         keywords: [],
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData1,
//         campusFacultyMap,
//       });

//       const courseData2: CleanCourseWithCLO = {
//         ...courseData1,
//         academic_year: 2024,
//         semester: 2,
//         clo_no: 2,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 5',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ 5',
//       };

//       await seedCourseAndLO({
//         prisma,
//         course: courseData2,
//         campusFacultyMap,
//       });

//       const courses = await prisma.course.findMany({
//         where: { subjectCode: courseData1.subject_code },
//       });

//       expect(courses).toHaveLength(1);

//       const courseOfferings = await prisma.courseOffering.findMany({
//         where: { courseId: courses[0].id },
//       });

//       expect(courseOfferings).toHaveLength(2);
//       expect(
//         courseOfferings.some(
//           (co) => co.semester === 1 && co.academicYear === 2024,
//         ),
//       ).toBe(true);
//       expect(
//         courseOfferings.some(
//           (co) => co.semester === 2 && co.academicYear === 2024,
//         ),
//       ).toBe(true);
//     });
//   });

//   describe('error scenarios', () => {
//     it('should throw error when campus/faculty combination does not exist', async () => {
//       const courseData: CleanCourseWithCLO = {
//         academic_year: 2024,
//         semester: 1,
//         campus_code: 'INVALID',
//         faculty_code: 'INVALID',
//         subject_code: 'TEST505',
//         subject_name_th: 'วิชาทดสอบ 5',
//         clo_no: 1,
//         original_clo_name_th: 'ผลลัพธ์การเรียนรู้เดิม 5',
//         clean_clo_name_th: 'ผลลัพธ์การเรียนรู้ 5',
//         skipEmbedding: false,
//         keywords: [],
//       };

//       await expect(
//         seedCourseAndLO({
//           prisma,
//           course: courseData,
//           campusFacultyMap,
//         }),
//       ).rejects.toThrow('Missing campus/faculty mapping for INVALID-INVALID');
//     });
//   });
// });

describe.skip('course-lo-v2.seed (Integration) - seedCourseAndLO placeholder', () => {
  test.todo(
    'Add integration coverage once seedCourseAndLO is updated for the new schema',
  );
});
