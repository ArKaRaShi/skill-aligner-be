import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { ProcessedGenEdRow } from 'src/modules/course/pipelines/types/raw-gened-row.type';

@Injectable()
export class UpdateGenEdCodesPipeline {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    console.log('Starting GenEd course update pipeline...');

    // Load the processed GenEd data
    const genEdData: ProcessedGenEdRow[] = await FileHelper.loadLatestJson<
      ProcessedGenEdRow[]
    >('src/modules/course/pipelines/data/raw/gened_courses');

    console.log(`Loaded ${genEdData.length} GenEd courses from JSON`);

    // Generate all possible suffixes from -64 to current year (using BE years)
    const currentYearBE = new Date().getFullYear() + 543; // Convert to Buddhist Era
    const startYear = 64;
    const endYear = currentYearBE % 100; // Get last two digits of current BE year

    const suffixes: string[] = [];

    // Handle year rollover (e.g., from 64 to 68 means 64-68)
    if (endYear >= startYear) {
      // No rollover needed (e.g., 64 to 68)
      for (let year = startYear; year <= endYear; year++) {
        suffixes.push(`-${year}`);
      }
    } else {
      // Handle rollover (e.g., 64 to 25 means 64-99, then 00-25)
      for (let year = startYear; year <= 99; year++) {
        suffixes.push(`-${year}`);
      }
      for (let year = 0; year <= endYear; year++) {
        suffixes.push(`-${year.toString().padStart(2, '0')}`);
      }
    }

    console.log(`Checking for courses with suffixes: ${suffixes.join(', ')}`);

    // Process each GenEd course
    for (const genEdCourse of genEdData) {
      const { subject_code, is_course_closed } = genEdCourse;

      if (is_course_closed) {
        console.log(
          `Skipping closed course with subject code: ${subject_code}`,
        );
        continue;
      }

      // Check for course with each possible suffix
      for (const suffix of suffixes) {
        const subjectCodeWithSuffix = `${subject_code}${suffix}`;

        const course = await this.prisma.course.findUnique({
          where: { subjectCode: subjectCodeWithSuffix },
        });

        if (course) {
          console.log(
            `Setting isGenEd=true for course ${subjectCodeWithSuffix}`,
          );
          await this.prisma.course.update({
            where: { id: course.id },
            data: {
              isGenEd: true,
            },
          });
        }
      }
    }

    console.log('✅ GenEd course update completed.');
  }
}
