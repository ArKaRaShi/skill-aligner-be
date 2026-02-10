import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { FileHelper } from 'src/shared/utils/file';

import { ProcessedGenEdRow } from 'src/modules/course/pipelines/types/raw-gened-row.type';

// ============================================================================
// Pipeline V2: Single bulk query + Single updateMany (2 queries total!)
// ============================================================================

@Injectable()
export class UpdateGenEdCodesPipelineV2 {
  private readonly logger = new Logger(UpdateGenEdCodesPipelineV2.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    this.logger.log('Starting GenEd course update pipeline v2...');

    // Load the processed GenEd data
    const genEdData: ProcessedGenEdRow[] = await FileHelper.loadLatestJson<
      ProcessedGenEdRow[]
    >('src/modules/course/pipelines/data/raw/gened_courses');

    this.logger.log(`Loaded ${genEdData.length} GenEd courses from JSON`);

    // Generate all possible suffixes from -64 to current year (using BE years)
    const currentYearBE = new Date().getFullYear() + 543; // Convert to Buddhist Era
    const startYear = 64;
    const endYear = currentYearBE % 100; // Get last two digits of current BE year

    const suffixes: string[] = [];

    // Handle year rollover (e.g., from 64 to current year)
    if (endYear >= startYear) {
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

    this.logger.log(
      `Generated ${suffixes.length} year suffixes from ${startYear} to ${endYear}`,
    );

    // Build set of all subject codes to check (with suffixes)
    const subjectCodesToCheck = new Set<string>();

    for (const genEdCourse of genEdData) {
      const { subject_code, is_course_closed } = genEdCourse;

      if (is_course_closed) {
        this.logger.log(`Skipping closed course: ${subject_code}`);
        continue;
      }

      // Add all suffixes for this subject code
      for (const suffix of suffixes) {
        subjectCodesToCheck.add(`${subject_code}${suffix}`);
      }
    }

    this.logger.log(
      `Checking ${subjectCodesToCheck.size} course codes in database...`,
    );

    // SINGLE bulk query to find all matching courses
    const courses = await this.prisma.course.findMany({
      where: {
        subjectCode: { in: Array.from(subjectCodesToCheck) },
      },
      select: {
        id: true,
        subjectCode: true,
      },
    });

    this.logger.log(`Found ${courses.length} matching courses in database`);

    if (courses.length === 0) {
      this.logger.log('No matching courses found. Exiting.');
      return;
    }

    // SINGLE updateMany to update all found courses at once!
    const result = await this.prisma.course.updateMany({
      where: {
        id: { in: courses.map((c) => c.id) },
      },
      data: {
        isGenEd: true,
      },
    });

    this.logger.log(
      `✅ Set isGenEd=true for ${result.count} courses in 2 database queries total!`,
    );
  }
}
