import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { ArrayHelper } from 'src/shared/utils/array.helper';
import { FileHelper } from 'src/shared/utils/file';

import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

export type CampusFacultyMap = Map<
  string,
  { campusId: string; facultyId: string }
>;

// Internal type: Group all data by subjectCode (natural business key)
// After DB insert, we'll map subjectCode -> courseId
type CourseGroup = {
  campusId: string;
  facultyId: string;
  subjectCode: string;
  subjectName: string;
  // Nested arrays keep related data together
  offerings: Array<{ academicYear: number; semester: number }>;
  clos: Array<{
    cloNo: number;
    originalCloName: string;
    cleanedCloName: string;
    skipEmbedding: boolean;
  }>;
};

@Injectable()
export class SeedCourseAndLoPipelineV2 {
  private readonly logger = new Logger(SeedCourseAndLoPipelineV2.name);

  constructor(private readonly prisma: PrismaService) {}

  buildKey(campusCode: string, facultyCode: string): string {
    return `${campusCode}-${facultyCode}`;
  }

  async findAllAndBuildCampusFacultyMap(): Promise<CampusFacultyMap> {
    const map = new Map<string, { campusId: string; facultyId: string }>();
    const faculties = await this.prisma.faculty.findMany({
      include: { campus: true },
    });

    for (const faculty of faculties) {
      const key = this.buildKey(faculty.campus.code, faculty.code);
      map.set(key, { campusId: faculty.campus.id, facultyId: faculty.id });
    }

    return map;
  }

  /**
   * Phase 1: Group raw course data by subjectCode
   * Each course contains its offerings and CLOs as nested arrays
   * No ID generation needed - subjectCode is our natural key
   */
  private groupCoursesBySubjectCode(
    cleanedCourses: CleanCourseWithCLO[],
    campusFacultyMap: CampusFacultyMap,
  ): { courseGroups: Map<string, CourseGroup>; errors: string[] } {
    const courseGroups = new Map<string, CourseGroup>();
    const errors: string[] = [];

    for (const course of cleanedCourses) {
      const campusFaculty = campusFacultyMap.get(
        this.buildKey(course.campus_code, course.faculty_code),
      );

      if (!campusFaculty) {
        errors.push(
          `Missing campus/faculty mapping for ${course.campus_code}-${course.faculty_code}`,
        );
        continue;
      }

      const { campusId, facultyId } = campusFaculty;

      // Group by subjectCode - append offerings/CLOs to existing course
      if (!courseGroups.has(course.subject_code)) {
        courseGroups.set(course.subject_code, {
          campusId,
          facultyId,
          subjectCode: course.subject_code,
          subjectName: course.subject_name_th,
          offerings: [],
          clos: [],
        });
      }

      const group = courseGroups.get(course.subject_code)!;

      // Add offering (deduplication handled by skipDuplicates in DB)
      group.offerings.push({
        academicYear: course.academic_year,
        semester: course.semester,
      });

      // Add CLO
      group.clos.push({
        cloNo: course.clo_no,
        originalCloName: course.original_clo_name_th,
        cleanedCloName: course.clean_clo_name_th,
        skipEmbedding: course.skipEmbedding ?? false,
      });
    }

    return { courseGroups, errors };
  }

  /**
   * Phase 2: Batch insert in 3 steps
   * 1. Insert courses -> 2. Query back by subjectCode -> 3. Insert children with real IDs
   */
  private async batchInsertEntities(
    courseGroups: Map<string, CourseGroup>,
    batchSize = 100,
  ): Promise<void> {
    // Step 1: Prepare and insert Courses
    const coursesToInsert = Array.from(courseGroups.values()).map(
      ({ campusId, facultyId, subjectCode, subjectName }) => ({
        campusId,
        facultyId,
        subjectCode,
        subjectName,
      }),
    );

    const courseBatches = ArrayHelper.chunk(coursesToInsert, batchSize);
    this.logger.log(
      `Inserting ${coursesToInsert.length} courses in ${courseBatches.length} batches...`,
    );

    for (const { batchNumber, totalBatches, items: batch } of courseBatches) {
      this.logger.log(
        `Course batch ${batchNumber}/${totalBatches} (${batch.length} items)`,
      );
      await this.prisma.course.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    // Step 2: Query back courses to build subjectCode -> courseId map
    const createdCourses = await this.prisma.course.findMany({
      where: {
        subjectCode: {
          in: coursesToInsert.map((c) => c.subjectCode),
        },
      },
      select: {
        id: true,
        subjectCode: true,
      },
    });

    const subjectCodeToIdMap = new Map(
      createdCourses.map((c) => [c.subjectCode, c.id]),
    );

    this.logger.log(
      `Mapped ${subjectCodeToIdMap.size} courses: subjectCode -> courseId`,
    );

    // Step 3: Prepare and insert CourseOfferings using real course IDs
    const allOfferings: Array<{
      courseId: string;
      academicYear: number;
      semester: number;
    }> = [];

    for (const [subjectCode, group] of courseGroups) {
      const courseId = subjectCodeToIdMap.get(subjectCode);
      if (!courseId) {
        this.logger.warn(`Course ID not found for ${subjectCode}`);
        continue;
      }

      for (const offering of group.offerings) {
        allOfferings.push({
          courseId,
          academicYear: offering.academicYear,
          semester: offering.semester,
        });
      }
    }

    const offeringBatches = ArrayHelper.chunk(allOfferings, batchSize);
    this.logger.log(
      `Inserting ${allOfferings.length} course offerings in ${offeringBatches.length} batches...`,
    );

    for (const { batchNumber, totalBatches, items: batch } of offeringBatches) {
      this.logger.log(
        `Offering batch ${batchNumber}/${totalBatches} (${batch.length} items)`,
      );
      await this.prisma.courseOffering.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    // Step 4: Prepare and insert CLOs using real course IDs
    const allClos: Array<{
      courseId: string;
      cloNo: number;
      originalCloName: string;
      cleanedCloName: string;
      skipEmbedding: boolean;
    }> = [];

    for (const [subjectCode, group] of courseGroups) {
      const courseId = subjectCodeToIdMap.get(subjectCode);
      if (!courseId) {
        this.logger.warn(`Course ID not found for ${subjectCode}`);
        continue;
      }

      for (const clo of group.clos) {
        allClos.push({
          courseId,
          cloNo: clo.cloNo,
          originalCloName: clo.originalCloName,
          cleanedCloName: clo.cleanedCloName,
          skipEmbedding: clo.skipEmbedding,
        });
      }
    }

    const cloBatches = ArrayHelper.chunk(allClos, batchSize);
    this.logger.log(
      `Inserting ${allClos.length} CLOs in ${cloBatches.length} batches...`,
    );

    for (const { batchNumber, totalBatches, items: batch } of cloBatches) {
      this.logger.log(
        `CLO batch ${batchNumber}/${totalBatches} (${batch.length} items)`,
      );
      await this.prisma.courseLearningOutcome.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    this.logger.log('✅ All batch inserts completed.');
  }

  async execute({
    deleteExisting = false,
    seeds = false,
    batchSize = 100,
  }: {
    deleteExisting?: boolean;
    seeds?: boolean;
    batchSize?: number;
  } = {}) {
    const cleanedCoursesWithCLO: CleanCourseWithCLO[] =
      await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
        'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
      );

    if (deleteExisting) {
      this.logger.log(`Deleting existing courses and learning outcomes...`);
      await this.prisma.$transaction([
        this.prisma.courseLearningOutcome.deleteMany({}),
        this.prisma.courseLearningOutcomeVector.deleteMany({}),
        this.prisma.courseOffering.deleteMany({}),
        this.prisma.course.deleteMany({}),
      ]);
    }

    this.logger.log(`Checking campus-faculty combinations in DB...`);
    const campusFacultyMap = await this.findAllAndBuildCampusFacultyMap();
    this.logger.log(
      `Campus-Faculty combinations in DB: ${campusFacultyMap.size}`,
    );

    if (seeds) {
      this.logger.log(
        `Grouping ${cleanedCoursesWithCLO.length} course records by subjectCode...`,
      );
      const { courseGroups, errors } = this.groupCoursesBySubjectCode(
        cleanedCoursesWithCLO,
        campusFacultyMap,
      );

      if (errors.length > 0) {
        this.logger.warn(`Found ${errors.length} errors during grouping:`);
        errors.forEach((err) => this.logger.warn(`  - ${err}`));
      }

      const totalOfferings = Array.from(courseGroups.values()).reduce(
        (sum, g) => sum + g.offerings.length,
        0,
      );
      const totalClos = Array.from(courseGroups.values()).reduce(
        (sum, g) => sum + g.clos.length,
        0,
      );

      this.logger.log(
        `Prepared: ${courseGroups.size} courses, ${totalOfferings} offerings, ${totalClos} CLOs`,
      );

      await this.batchInsertEntities(courseGroups, batchSize);
    }

    this.logger.log(`✅ Batch seeding completed.`);
  }
}
