import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { FileHelper } from 'src/shared/utils/file';
import { v4 as uuidv4 } from 'uuid';

import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

export type CampusFacultyMap = Map<
  string,
  { campusId: string; facultyId: string }
>;

type SeedCourseAndLOParams = {
  campusFacultyMap: CampusFacultyMap;
  course: CleanCourseWithCLO;
};

@Injectable()
export class SeedCourseAndLoPipeline {
  constructor(private readonly prisma: PrismaService) {}

  buildKey(campusCode: string, facultyCode: string): string {
    return `${campusCode}-${facultyCode}`;
  }

  async seedCourseAndLO({ course, campusFacultyMap }: SeedCourseAndLOParams) {
    const campusFaculty = campusFacultyMap.get(
      this.buildKey(course.campus_code, course.faculty_code),
    );

    if (!campusFaculty) {
      throw new Error(
        `Missing campus/faculty mapping for ${course.campus_code}-${course.faculty_code}`,
      );
    }

    const { campusId, facultyId } = campusFaculty;

    await this.prisma.$transaction(async (tx) => {
      const upsertedCourse = await tx.course.upsert({
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

      // Create CourseOffering
      await tx.courseOffering.upsert({
        where: {
          unique_course_offering: {
            courseId: upsertedCourse.id,
            academicYear: course.academic_year,
            semester: course.semester,
          },
        },
        update: {},
        create: {
          id: uuidv4(),
          courseId: upsertedCourse.id,
          academicYear: course.academic_year,
          semester: course.semester,
        },
      });

      // Create CourseLearningOutcome
      await tx.courseLearningOutcome.upsert({
        where: {
          unique_course_clo: {
            courseId: upsertedCourse.id,
            cloNo: course.clo_no,
          },
        },
        update: {},
        create: {
          id: uuidv4(),
          courseId: upsertedCourse.id,
          cloNo: course.clo_no,
          originalCloName: course.original_clo_name_th,
          cleanedCloName: course.clean_clo_name_th,
          skipEmbedding: course.skipEmbedding ?? false,
          hasEmbedding768: false,
          hasEmbedding1536: false,
        },
      });
    });
  }

  async findAllAndBuildCampusFacultyMap(): Promise<CampusFacultyMap> {
    const map = new Map<string, { campusId: string; facultyId: string }>();

    // With the new one-to-many relationship, we query faculties directly
    const faculties = await this.prisma.faculty.findMany({
      include: { campus: true },
    });

    for (const faculty of faculties) {
      const facultyId = faculty.id;
      const facultyCode = faculty.code;
      const campusId = faculty.campus.id;
      const campusCode = faculty.campus.code;

      const key = this.buildKey(campusCode, facultyCode);
      map.set(key, { campusId, facultyId });
    }

    return map;
  }

  async execute({
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
      await this.prisma.courseLearningOutcome.deleteMany({});
      await this.prisma.courseLearningOutcomeVector.deleteMany({});
      await this.prisma.courseOffering.deleteMany({});
      await this.prisma.course.deleteMany({});
    }

    console.log(`Checking campus-faculty combinations in DB...`);
    const campusFacultyMap = await this.findAllAndBuildCampusFacultyMap();
    console.log(`Campus-Faculty combinations in DB: ${campusFacultyMap.size}`);

    if (seeds) {
      console.log(`Seeding courses and learning outcomes...`);
      for (const course of cleanedCoursesWithCLO) {
        console.log(`- Seeding course: ${course.subject_code}`);
        await this.seedCourseAndLO({
          campusFacultyMap,
          course,
        });
      }
    }

    console.log(`✅ Seeding courses and learning outcomes completed.`);
  }
}
