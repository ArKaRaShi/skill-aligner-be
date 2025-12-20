import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

export type CampusFacultyMap = Map<
  string,
  { campusId: string; facultyId: string }
>;

@Injectable()
export class SeedCampusAndFacultyPipeline {
  constructor(private readonly prisma: PrismaService) {}

  async seedCampusAndFaculty({
    campusCode,
    facultyCode,
  }: {
    campusCode: string;
    facultyCode: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      // First, get or create the campus
      const { id: campusId } = await tx.campus.upsert({
        where: {
          code: campusCode,
        },
        update: {},
        create: {
          id: uuidv4(),
          code: campusCode,
        },
      });

      // Then, create faculty that belongs to this specific campus
      await tx.faculty.upsert({
        where: {
          unique_campus_faculty_code: {
            campusId,
            code: facultyCode,
          },
        },
        update: {},
        create: {
          id: uuidv4(),
          code: facultyCode,
          campusId,
        },
      });
    });
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
        'src/modules/course/pipelines/data/cleaned/valid_courses_with_clo',
      );

    if (deleteExisting) {
      console.log(`Deleting existing faculties...`);
      await this.prisma.faculty.deleteMany({});
      console.log(`Deleting existing campuses...`);
      await this.prisma.campus.deleteMany({});
    }

    console.log(`Building unique campus-faculty pairs...`);
    const uniquePairs = new Map<string, Set<string>>();

    // Collect unique campus-faculty pairs
    for (const course of cleanedCoursesWithCLO) {
      if (!uniquePairs.has(course.campus_code)) {
        uniquePairs.set(course.campus_code, new Set());
      }
      uniquePairs.get(course.campus_code)!.add(course.faculty_code);
    }

    if (seeds) {
      console.log(`Seeding campus-faculty pairs...`);
      for (const [campusCode, faculties] of uniquePairs.entries()) {
        for (const facultyCode of faculties) {
          console.log(
            `- Seeding campus: ${campusCode}, faculty: ${facultyCode}`,
          );
          await this.seedCampusAndFaculty({
            campusCode,
            facultyCode,
          });
        }
      }
    }

    console.log(`✅ Seeding campus-faculty pairs completed.`);
  }
}
