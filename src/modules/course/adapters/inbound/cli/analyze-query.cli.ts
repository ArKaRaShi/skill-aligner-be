import { NestFactory } from '@nestjs/core';

import Table from 'cli-table3';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { AppModule } from '../../../../../app.module';
import { CourseViewWithSimilarity } from '../../../types/course.type';
import { GetCoursesByQueryUseCase } from '../../../use-cases/get-courses-by-query.use-case';
import {
  CLI_DISPLAY_CONSTANTS,
  type CliArgs,
  getSimilarityBar,
  parseArgsArray,
} from './helpers';

const {
  MAX_COURSE_NAME_LENGTH,
  MAX_CAMPUS_FACULTY_LENGTH,
  TRUNCATED_COURSE_NAME_LENGTH,
  TRUNCATED_CAMPUS_FACULTY_LENGTH,
} = CLI_DISPLAY_CONSTANTS;

/**
 * Course Analysis CLI
 *
 * Analyze courses by a natural language query and show distribution by campus and faculty.
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/course/adapters/inbound/cli/analyze-query.cli.ts --query "your query here"
 *
 * Options:
 *   --query <text>       The query text (required)
 *   --threshold <n>       Minimum similarity threshold (default: no limit)
 *   --top-n <n>           Maximum number of LOs to retrieve per skill (default: 10)
 *   --campus-id <id>     Filter by campus ID
 *   --faculty-id <id>    Filter by faculty ID
 *   --is-gen-ed           Filter by GenEd status (true/false)
 *   --help, -h            Show this help message
 *
 * Examples:
 *   # Search for cafe-related courses
 *   bunx ts-node .../analyze-query.cli.ts --query "I want to open cafe"
 *
 *   # Search with custom threshold
 *   bunx ts-node .../analyze-query.cli.ts --query "machine learning" --threshold 0.7
 *
 *   # Search for GenEd courses only
 *   bunx ts-node .../analyze-query.cli.ts --query "data science" --is-gen-ed true
 */

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  return parseArgsArray(process.argv.slice(2));
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Course Analysis CLI

Analyze courses by a natural language query and show distribution by campus and faculty.

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/course/adapters/inbound/cli/analyze-query.cli.ts --query "<your query>"

Options:
  --query <text>       The query text (required)
  --threshold <n>       Minimum similarity threshold (default: no limit)
  --top-n <n>           Maximum number of LOs to retrieve per skill (default: 10)
  --campus-id <id>     Filter by campus ID
  --faculty-id <id>    Filter by faculty ID
  --is-gen-ed           Filter by GenEd status (true/false)
  --help, -h            Show this help message

Examples:
  # Search for cafe-related courses
  bunx ts-node .../analyze-query.cli.ts --query "I want to open cafe"

  # Search with higher threshold
  bunx ts-node .../analyze-query.cli.ts --query "machine learning" --threshold 0.7

  # Search for GenEd courses only
  bunx ts-node .../analyze-query.cli.ts --query "data science" --is-gen-ed true

  # Search in specific campus
  bunx ts-node .../analyze-query.cli.ts --query "business" --campus-id "campus-1"
`);
}

/**
 * Display the header banner
 */
function displayHeader(
  query: string,
  totalCourses: number,
  campusCount: number,
  facultyCount: number,
): void {
  console.log(
    '╔══════════════════════════════════════════════════════════════════════════════╗',
  );
  console.log(
    '║  COURSE RETRIEVAL ANALYSIS                                                      ║',
  );
  console.log(
    `║  Query: "${query}"                                                           ║`,
  );
  console.log(
    `║  Found: ${totalCourses} courses across ${campusCount} campuses, ${facultyCount} campus-faculty combinations              ║`,
  );
  console.log(
    '╚══════════════════════════════════════════════════════════════════════════════╝',
  );
}

/**
 * Display top 5 courses
 */
function displayTopCourses(courses: CourseViewWithSimilarity[]): void {
  console.log('TOP 5 COURSES:');
  for (let i = 0; i < Math.min(5, courses.length); i++) {
    const course = courses[i];
    const campus = course.campus;
    const faculty = course.faculty;
    console.log(
      `  ${i + 1}. ${course.subjectName} (${campus.nameTh || campus.code}, ${faculty.nameTh || faculty.code}) - ${course.score.toFixed(1)}%`,
    );
  }
  console.log('');
}

/**
 * Display all courses table
 */
function displayCoursesTable(courses: CourseViewWithSimilarity[]): void {
  const table = new Table({
    head: [
      'Rank',
      'Course',
      'Campus-Faculty',
      'Code',
      'Similarity',
      'Matched',
      'Total',
    ],
    colAligns: ['right', 'left', 'left', 'left', 'left', 'right', 'right'],
    chars: {
      top: '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      bottom: '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      left: '║',
      'left-mid': '╟',
      mid: '─',
      'mid-mid': '┼',
      right: '║',
      'right-mid': '╢',
      middle: '│',
    },
    style: { 'padding-left': 1, 'padding-right': 1 },
    wordWrap: false,
  });

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const campus = course.campus;
    const faculty = course.faculty;
    const campusFaculty = `${campus.nameTh || campus.code}-${faculty.nameTh || faculty.code}`;
    const similarityBar = getSimilarityBar(course.score);

    table.push([
      String(i + 1),
      course.subjectName.length > MAX_COURSE_NAME_LENGTH
        ? `${course.subjectName.substring(0, TRUNCATED_COURSE_NAME_LENGTH)}...`
        : course.subjectName,
      campusFaculty.length > MAX_CAMPUS_FACULTY_LENGTH
        ? `${campusFaculty.substring(0, TRUNCATED_CAMPUS_FACULTY_LENGTH)}...`
        : campusFaculty,
      course.subjectCode,
      similarityBar,
      String(course.matchedLearningOutcomes.length),
      String(course.courseLearningOutcomes.length),
    ]);
  }

  console.log(table.toString());
  console.log('');
}

/**
 * Display distribution by campus
 */
function displayCampusDistribution(courses: CourseViewWithSimilarity[]): void {
  // Group by campus
  const campusMap = new Map<
    string,
    {
      courses: CourseViewWithSimilarity[];
      facultyMap: Map<string, CourseViewWithSimilarity[]>;
    }
  >();

  for (const course of courses) {
    const campusId = course.campus.campusId;
    const _campusName = course.campus.nameTh || course.campus.code;

    if (!campusMap.has(campusId)) {
      campusMap.set(campusId, { courses: [], facultyMap: new Map() });
    }

    campusMap.get(campusId)!.courses.push(course);

    const facultyId = course.faculty.facultyId;
    const _facultyName = course.faculty.nameTh || course.faculty.code;
    const facultyMap = campusMap.get(campusId)!.facultyMap;

    if (!facultyMap.has(facultyId)) {
      facultyMap.set(facultyId, []);
    }
    facultyMap.get(facultyId)!.push(course);
  }

  // Calculate totals
  const totalCount = courses.length;

  // Display each campus
  console.log('DISTRIBUTION BY CAMPUS:');
  console.log('');

  for (const [_campusId, data] of campusMap) {
    const campus = data.courses[0].campus;
    const campusName = campus.nameTh || campus.code;
    const courseCount = data.courses.length;
    const percentage = (courseCount / totalCount) * 100;

    // Build faculty breakdown
    const facultyBreakdown: string[] = [];
    for (const [_facultyId, facultyCourses] of data.facultyMap) {
      const faculty = facultyCourses[0].faculty;
      const facultyName = faculty.nameTh || faculty.code;
      const facultyCount = facultyCourses.length;
      const facultyAvgSim =
        facultyCourses.reduce((sum, c) => sum + c.score, 0) /
        facultyCourses.length;
      const facultyPercentage = (facultyCount / courseCount) * 100;
      const facultyBar = '█'.repeat(Math.round(facultyAvgSim / 10));

      facultyBreakdown.push(
        `  ${facultyName}: ${facultyCount} courses (${facultyPercentage.toFixed(0)}%) - Avg similarity: ${facultyAvgSim.toFixed(1)}% ${facultyBar}`,
      );
    }

    console.log(
      `${campusName} (${courseCount} courses, ${percentage.toFixed(0)}% of total)`,
    );
    for (const line of facultyBreakdown) {
      console.log(line);
    }
    console.log('');
  }
}

/**
 * Display key insights
 */
function displayInsights(courses: CourseViewWithSimilarity[]): void {
  // Find best campus by availability
  const campusCounts = new Map<string, number>();
  for (const course of courses) {
    const campusName = course.campus.nameTh || course.campus.code;
    campusCounts.set(campusName, (campusCounts.get(campusName) || 0) + 1);
  }

  const bestCampus = [...campusCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Find best campus-faculty combination by quality
  const campusFacultyMap = new Map<string, number[]>();
  const campusFacultyAvgSim = new Map<string, number>();

  for (const course of courses) {
    const campusFaculty = `${course.campus.nameTh || course.campus.code}-${course.faculty.nameTh || course.faculty.code}`;
    if (!campusFacultyMap.has(campusFaculty)) {
      campusFacultyMap.set(campusFaculty, []);
    }
    campusFacultyMap.get(campusFaculty)!.push(course.score);
  }

  for (const [campusFaculty, scores] of campusFacultyMap) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    campusFacultyAvgSim.set(campusFaculty, avg);
  }

  const bestCampusFaculty = [...campusFacultyAvgSim.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  // Find most focused campus (100% one faculty)
  // Group by campus first
  const campusToFacultiesMap = new Map<string, Set<string>>();
  for (const course of courses) {
    const campusName = course.campus.nameTh || course.campus.code;
    const facultyName = course.faculty.nameTh || course.faculty.code;
    if (!campusToFacultiesMap.has(campusName)) {
      campusToFacultiesMap.set(campusName, new Set());
    }
    campusToFacultiesMap.get(campusName)!.add(facultyName);
  }

  const mostFocusedCampus = [...campusToFacultiesMap.entries()].find(
    ([, faculties]) => faculties.size === 1,
  );

  console.log('KEY INSIGHTS:');
  if (mostFocusedCampus) {
    const campusName = mostFocusedCampus[0];
    const facultyName = [...mostFocusedCampus[1]][0];
    const campusFacultyCourses = courses.filter(
      (c) =>
        (c.campus.nameTh || c.campus.code) === campusName &&
        (c.faculty.nameTh || c.faculty.code) === facultyName,
    );
    const avgSim =
      campusFacultyCourses.reduce((sum, c) => sum + c.score, 0) /
      campusFacultyCourses.length;

    console.log(
      `  • Most focused: ${campusName} (${facultyName} has ${campusFacultyCourses.length} courses, ${avgSim.toFixed(1)}% avg)`,
    );
  }

  console.log(
    `  • Best campus overall: ${bestCampus[0]} (${bestCampus[1]} courses, highest availability)`,
  );
  console.log(
    `  • Best quality: ${bestCampusFaculty[0]} (${bestCampusFaculty[1].toFixed(1)}% avg similarity)`,
  );
  console.log('');
}

/**
 * Main execution function
 */
async function analyzeQuery(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.query) {
    console.error('Error: --query parameter is required.');
    console.log('Use --help to see usage information.');
    process.exit(1);
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const useCase = appContext.get(GetCoursesByQueryUseCase);

    const { courses } = await useCase.execute({
      query: args.query,
      loThreshold: args.threshold,
      topNLos: args.topN ?? 10,
      campusId: args.campusId as Identifier | undefined,
      facultyId: args.facultyId as Identifier | undefined,
      isGenEd: args.isGenEd,
    });

    if (courses.length === 0) {
      console.log('No courses found for the given query.');
      return;
    }

    // Count unique campuses and faculty combinations
    const campusSet = new Set<string>();
    const campusFacultySet = new Set<string>();

    for (const course of courses) {
      campusSet.add(course.campus.campusId);
      campusFacultySet.add(
        `${course.campus.campusId}-${course.faculty.facultyId}`,
      );
    }

    // Display results
    displayHeader(
      args.query,
      courses.length,
      campusSet.size,
      campusFacultySet.size,
    );
    displayTopCourses(courses);
    displayCoursesTable(courses);
    displayCampusDistribution(courses);
    displayInsights(courses);
  } finally {
    await appContext.close();
  }
}

/**
 * Bootstrap function
 */
async function bootstrap(): Promise<void> {
  await analyzeQuery();
  process.exit(0);
}

void bootstrap();
