import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';

import { Identifier } from './common/domain/types/identifier';
import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from './modules/course/contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from './modules/course/contracts/i-course-retriever-service.contract';
import {
  EmbeddingMetadata,
  EmbeddingModels,
  EmbeddingProviders,
} from './modules/embedding/constants/model.constant';
import { EmbeddingHelper } from './modules/embedding/helpers/embedding.helper';

@Controller()
export class AppController {
  constructor(
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,
  ) {}

  private resolveEmbeddingConfiguration({
    model,
    provider,
    dimension,
  }: {
    model?: string;
    provider?: string;
    dimension?: string;
  }): EmbeddingMetadata {
    const fallback: EmbeddingMetadata = {
      model: EmbeddingModels.E5_BASE,
      provider: EmbeddingProviders.E5,
      dimension: 768,
    };

    const config: EmbeddingMetadata = {
      model: (model as EmbeddingMetadata['model']) ?? fallback.model,
      provider: (provider as EmbeddingMetadata['provider']) ?? fallback.provider,
      dimension: dimension ? Number(dimension) : fallback.dimension,
    };

    if (!EmbeddingHelper.isRegistered(config)) {
      throw new BadRequestException(
        `Unsupported embedding configuration: ${JSON.stringify(config)}`,
      );
    }

    return config;
  }

  @Get('/course-learning-outcomes')
  @ApiQuery({
    name: 'skills',
    required: false,
    description:
      'Comma-separated list of skills to search for (default: predefined set)',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Similarity threshold between 0 and 1 (default: 0.75)',
    example: '0.75',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    description: 'Number of top matches to return per skill (default: 10)',
    example: '10',
  })
  @ApiQuery({
    name: 'campusId',
    required: false,
    description: 'Filter learning outcomes by campus ID',
  })
  @ApiQuery({
    name: 'facultyId',
    required: false,
    description: 'Filter learning outcomes by faculty ID',
  })
  @ApiQuery({
    name: 'isGenEd',
    required: false,
    description:
      'Filter by general education flag (true, false, or omit for no filter)',
    example: 'true',
  })
  @ApiQuery({
    name: 'academicYearSemesters',
    required: false,
    description:
      'JSON array specifying academic year and optional semesters, e.g. [{"academicYear":2023,"semesters":[1]}]',
  })
  @ApiQuery({
    name: 'embeddingModel',
    required: false,
    description: 'Embedding model identifier (default: e5-base)',
    example: EmbeddingModels.E5_BASE,
  })
  @ApiQuery({
    name: 'embeddingProvider',
    required: false,
    description: 'Embedding provider identifier (default: e5)',
    example: EmbeddingProviders.E5,
  })
  @ApiQuery({
    name: 'embeddingDimension',
    required: false,
    description: 'Embedding vector dimension (default: 768)',
    example: '768',
  })
  async testCloRepository(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('campusId') campusIdQuery?: string,
    @Query('facultyId') facultyIdQuery?: string,
    @Query('isGenEd') isGenEdQuery?: string,
    @Query('academicYearSemesters') academicYearSemestersQuery?: string,
    @Query('embeddingModel') embeddingModelQuery?: string,
    @Query('embeddingProvider') embeddingProviderQuery?: string,
    @Query('embeddingDimension') embeddingDimensionQuery?: string,
  ): Promise<any> {
    console.time('CloRepositoryTest');

    // Parse skills from comma-separated query string or use defaults
    const skills = skillsQuery
      ? skillsQuery
          .split(',')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      : [
          'machine learning basics',
          'data analysis',
          'programming fundamentals',
          'mathematics for ai',
        ];

    const threshold = thresholdQuery ? parseFloat(thresholdQuery) : 0.75;
    const topN = topNQuery ? parseInt(topNQuery, 10) : 10;
    const campusId = campusIdQuery
      ? (campusIdQuery as Identifier)
      : undefined;
    const facultyId = facultyIdQuery
      ? (facultyIdQuery as Identifier)
      : undefined;
    let isGenEd: boolean | undefined;
    if (isGenEdQuery === 'true') {
      isGenEd = true;
    } else if (isGenEdQuery === 'false') {
      isGenEd = false;
    }
    let academicYearSemesters:
      | { academicYear: number; semesters?: number[] }[]
      | undefined;
    if (academicYearSemestersQuery) {
      try {
        const parsed = JSON.parse(academicYearSemestersQuery);
        if (Array.isArray(parsed)) {
          academicYearSemesters = parsed;
        } else {
          throw new Error('Academic year filter must be an array');
        }
      } catch {
        return {
          error:
            'Invalid academicYearSemesters format. Provide a JSON array such as [{"academicYear":2023,"semesters":[1]}].',
        };
      }
    }

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseLearningOutcomeRepository.findLosBySkills({
      skills,
      embeddingConfiguration: this.resolveEmbeddingConfiguration({
        model: embeddingModelQuery,
        provider: embeddingProviderQuery,
        dimension: embeddingDimensionQuery,
      }),
      threshold,
      topN,
      campusId,
      facultyId,
      isGenEd,
      academicYearSemesters,
    });

    const arrayResult = Array.from(result.entries()).map(([skill, los]) => {
      return {
        skill,
        learningOutcomes: los,
      };
    });

    // Extract and log learning outcomes with similarity scores
    const losWithSim = arrayResult.flatMap((skillResult) =>
      skillResult.learningOutcomes.map((lo) => ({
        lo_name: lo.cleanedName,
        sim: lo.similarityScore,
      })),
    );

    console.log('Learning Outcomes Array:', losWithSim);
    console.timeEnd('CloRepositoryTest');
    console.log('LO length: ', arrayResult[0]?.learningOutcomes?.length || 0);

    return arrayResult;
  }

  @Post('/course-retriever')
  @ApiQuery({
    name: 'skills',
    required: false,
    description:
      'Comma-separated list of skills to search for (default: predefined set)',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Similarity threshold between 0 and 1 (default: 0.6)',
    example: '0.6',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    description: 'Number of top matches to return per skill (default: 20)',
    example: '20',
  })
  @ApiQuery({
    name: 'enableLlmFilter',
    required: false,
    description: 'Enable LLM filtering (default: false)',
    example: 'false',
  })
  @ApiQuery({
    name: 'campusId',
    required: false,
    description: 'Campus ID filter',
  })
  @ApiQuery({
    name: 'facultyId',
    required: false,
    description: 'Faculty ID filter',
  })
  @ApiQuery({
    name: 'isGenEd',
    required: false,
    description: 'Filter for general education courses (default: false)',
    example: 'false',
  })
  @ApiQuery({
    name: 'embeddingModel',
    required: false,
    description: 'Embedding model identifier (default: e5-base)',
    example: EmbeddingModels.E5_BASE,
  })
  @ApiQuery({
    name: 'embeddingProvider',
    required: false,
    description: 'Embedding provider identifier (default: e5)',
    example: EmbeddingProviders.E5,
  })
  @ApiQuery({
    name: 'embeddingDimension',
    required: false,
    description: 'Embedding vector dimension (default: 768)',
    example: '768',
  })
  @ApiBody({
    description: 'Academic year and semester filters (array)',
    schema: {
      type: 'object',
      properties: {
        academicYearSemesters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              academicYear: { type: 'number', example: 2023 },
              semesters: {
                type: 'array',
                items: { type: 'number' },
                example: [1, 2],
              },
            },
          },
        },
      },
    },
  })
  async testCourseRetrieverService(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('enableLlmFilter') enableLlmFilterQuery?: string,
    @Query('campusId') campusIdQuery?: string,
    @Query('facultyId') facultyIdQuery?: string,
    @Query('isGenEd') isGenEdQuery?: string,
    @Query('embeddingModel') embeddingModelQuery?: string,
    @Query('embeddingProvider') embeddingProviderQuery?: string,
    @Query('embeddingDimension') embeddingDimensionQuery?: string,
    @Body()
    body?: {
      academicYearSemesters?: { academicYear: number; semesters?: number[] }[];
    },
  ): Promise<any> {
    console.time('CourseRetrieverServiceTest');

    // Parse skills from comma-separated query string or use defaults
    const skills = skillsQuery
      ? skillsQuery
          .split(',')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      : [
          'machine learning basics',
          'data analysis',
          'programming fundamentals',
          'mathematics for ai',
        ];

    const threshold = thresholdQuery ? parseFloat(thresholdQuery) : 0.6;
    const topN = topNQuery ? parseInt(topNQuery, 10) : 20;
    const enableLlmFilter = enableLlmFilterQuery === 'true';
    const campusId = (campusIdQuery as Identifier) ?? undefined;
    const facultyId = (facultyIdQuery as Identifier) ?? undefined;
    const isGenEd = isGenEdQuery === 'true';
    const academicYearSemesters = body?.academicYearSemesters ?? undefined;

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    console.log(`Processing ${skills.length} skills:`, skills);

    const result =
      await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
        skills,
        embeddingConfiguration: this.resolveEmbeddingConfiguration({
          model: embeddingModelQuery,
          provider: embeddingProviderQuery,
          dimension: embeddingDimensionQuery,
        }),
        threshold,
        topN,
        enableLlmFilter,
        campusId,
        facultyId,
        isGenEd,
        academicYearSemesters,
      });

    // Log total skills processed
    console.log(`Total skills processed: ${skills.length}`);

    // Define types for course information
    type CourseInfo = {
      courseCode: string;
      courseName: string;
      count: number;
      learningOutcomes: Set<string>;
    };

    type UniqueCourseInfo = {
      courseCode: string;
      courseName: string;
      count: number;
    };

    // Convert Map to array for response and group courses by unique codes
    const arrayResult = Array.from(result.entries()).map(([skill, courses]) => {
      // Group courses by unique course code and track learning outcomes
      const coursesByCode = new Map<
        string,
        CourseInfo
      >();

      courses.forEach((course) => {
        const courseCode = course.subjectCode;
        const loName =
          course.matchedLearningOutcomes[0]?.cleanedName || 'Unknown LO';

        if (!coursesByCode.has(courseCode)) {
          coursesByCode.set(courseCode, {
            courseCode,
            courseName: course.subjectName,
            count: 0,
            learningOutcomes: new Set(),
          });
        }

        const courseInfo = coursesByCode.get(courseCode);
        if (courseInfo) {
          courseInfo.count++;
          courseInfo.learningOutcomes.add(loName);
        }
      });

      // Convert to array and sort by count (descending)
      const uniqueCourses: UniqueCourseInfo[] = Array.from(
        coursesByCode.values(),
      )
        .map(
          (courseInfo): UniqueCourseInfo => ({
            courseCode: courseInfo.courseCode,
            courseName: courseInfo.courseName,
            count: courseInfo.count,
          }),
        )
        .sort((a, b) => b.count - a.count);

      // Log unique courses for this skill
      console.log(
        `Skill "${skill}": Found ${uniqueCourses.length} unique course codes (${courses.length} total occurrences)`,
      );
      console.log(
        `Top 5 course codes for "${skill}":`,
        uniqueCourses
          .slice(0, 5)
          .map((c) => `${c.courseCode} (${c.count}x)`)
          .join(', '),
      );

      // Log detailed information about courses with multiple LOs
      const coursesWithMultipleLos = Array.from(coursesByCode.entries())
        .filter(([, info]) => info.learningOutcomes.size > 1)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3); // Show top 3

      if (coursesWithMultipleLos.length > 0) {
        console.log(
          `\nCourses with multiple matching learning outcomes for "${skill}":`,
        );
        coursesWithMultipleLos.forEach(([courseCode, info]) => {
          console.log(
            `  ${courseCode} (${info.count}x): ${Array.from(info.learningOutcomes).slice(0, 3).join(', ')}${info.learningOutcomes.size > 3 ? '...' : ''}`,
          );
        });
        console.log('');
      }

      // Log courses that have 2 or more matched learning outcomes
      const coursesWithTwoOrMoreMatches = courses.filter(
        (course) => course.matchedLearningOutcomes.length >= 2,
      );

      if (coursesWithTwoOrMoreMatches.length > 0) {
        console.log(
          `\nCourses with 2+ matched learning outcomes for "${skill}":`,
        );

        // Group by courseId to detect duplicates
        const byCourseId = new Map<string, any[]>();
        coursesWithTwoOrMoreMatches.forEach((course) => {
          const id = course.id;
          if (!byCourseId.has(id)) {
            byCourseId.set(id, []);
          }
          byCourseId.get(id)!.push(course);
        });

        // Check for duplicates
        let duplicateCount = 0;
        byCourseId.forEach((courseList, courseId) => {
          if (courseList.length > 1) {
            duplicateCount++;
            console.log(
              `    DUPLICATE DETECTED: CourseId ${courseId} appears ${courseList.length} times`,
            );
          }
        });

        if (duplicateCount > 0) {
          console.log(`    Total duplicates: ${duplicateCount}`);
        }

        coursesWithTwoOrMoreMatches.forEach((course) => {
          const loNames = course.matchedLearningOutcomes
            .slice(0, 3)
            .map((lo) => lo.cleanedName)
            .join(', ');
          const moreText =
            course.matchedLearningOutcomes.length > 3 ? '...' : '';
          console.log(
            `  ${course.subjectCode} (${course.matchedLearningOutcomes.length} matches) [ID: ${course.id}]: ${loNames}${moreText}`,
          );
        });
        console.log('');
      }

      return {
        skill,
        courses,
        uniqueCourses,
        uniqueCourseCount: uniqueCourses.length,
        totalOccurrences: courses.length,
      };
    });

    // Calculate and log unique course statistics
    const allUniqueCodes = new Set<string>();
    const totalOccurrences = arrayResult.reduce(
      (sum, skillResult) => sum + skillResult.totalOccurrences,
      0,
    );

    arrayResult.forEach((skillResult) => {
      skillResult.uniqueCourses.forEach((course) => {
        allUniqueCodes.add(course.courseCode);
      });
    });

    console.log(
      `Unique course codes across all skills: ${allUniqueCodes.size}`,
    );
    console.log(
      `Total course occurrences across all skills: ${totalOccurrences}`,
    );

    // Debug: Verify calculations
    console.log('\n--- Debug Verification ---');
    const allCourses = arrayResult.flatMap((result) => result.courses);
    console.log(`Total courses in arrayResult: ${allCourses.length}`);

    const uniqueCourseIds = new Set(allCourses.map((c) => c.id));
    console.log(`Unique course IDs: ${uniqueCourseIds.size}`);

    const uniqueSubjectCodes = new Set(allCourses.map((c) => c.subjectCode));
    console.log(`Unique subject codes: ${uniqueSubjectCodes.size}`);

    // Group by subject code to verify counts
    const bySubjectCode = new Map<string, any[]>();
    allCourses.forEach((course) => {
      const code = course.subjectCode;
      if (!bySubjectCode.has(code)) {
        bySubjectCode.set(code, []);
      }
      bySubjectCode.get(code)!.push(course);
    });

    console.log('\nSubject code breakdown:');
    Array.from(bySubjectCode.entries())
      .sort((a, b) => b[1].length - a[1].length)

      .forEach(([code, courses]) => {
        console.log(`  ${code}: ${courses.length} occurrences`);
        const uniqueIds = new Set(courses.map((c) => c.id));
        console.log(`    Unique course IDs: ${uniqueIds.size}`);
      });
    console.log('--- End Debug ---\n');

    console.timeEnd('CourseRetrieverServiceTest');

    return arrayResult;
  }
}
