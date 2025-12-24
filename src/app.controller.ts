import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

import {
  EmbeddingMetadata,
  EmbeddingModels,
  EmbeddingProviders,
} from './core/embedding/constants/model.constant';
import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from './core/embedding/contracts/i-embedding-client.contract';
import { EmbeddingHelper } from './core/embedding/helpers/embedding.helper';
import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from './modules/course/contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from './modules/course/contracts/i-course-retriever-service.contract';

@Controller()
export class AppController {
  constructor(
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,
    @Inject(I_EMBEDDING_CLIENT_TOKEN)
    private readonly embeddingClient: IEmbeddingClient,
  ) {}

  private resolveEmbeddingConfiguration({
    dimension,
  }: {
    dimension?: string;
  }): EmbeddingMetadata {
    const dimensionNumber = dimension ? Number(dimension) : 768;

    // Auto-select model and provider based on dimension
    const config: EmbeddingMetadata = {
      model:
        dimensionNumber === 1536
          ? EmbeddingModels.OPENROUTER_OPENAI_3_SMALL
          : EmbeddingModels.E5_BASE,
      provider:
        dimensionNumber === 1536
          ? EmbeddingProviders.OPENROUTER
          : EmbeddingProviders.E5,
      dimension: dimensionNumber,
    };

    if (!EmbeddingHelper.isRegistered(config)) {
      throw new BadRequestException(
        `Unsupported embedding dimension: ${dimensionNumber}`,
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
    name: 'embeddingDimension',
    required: false,
    description:
      'Embedding vector dimension (default: 768, options: 768 or 1536)',
    example: '768',
  })
  async testCloRepository(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('isGenEd') isGenEdQuery?: string,
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
    let isGenEd: boolean | undefined;
    if (isGenEdQuery === 'true') {
      isGenEd = true;
    } else if (isGenEdQuery === 'false') {
      isGenEd = false;
    }

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseLearningOutcomeRepository.findLosBySkills({
      skills,
      embeddingConfiguration: this.resolveEmbeddingConfiguration({
        dimension: embeddingDimensionQuery,
      }),
      threshold,
      topN,
      isGenEd: isGenEd,
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
    name: 'isGenEd',
    required: false,
    description: 'Filter for general education courses (default: false)',
    example: 'false',
  })
  @ApiQuery({
    name: 'embeddingDimension',
    required: false,
    description:
      'Embedding vector dimension (default: 768, options: 768 or 1536)',
    example: '768',
  })
  async testCourseRetrieverService(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('isGenEd') isGenEdQuery?: string,
    @Query('embeddingDimension') embeddingDimensionQuery?: string,
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
    const isGenEd = isGenEdQuery === 'true';

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    console.log(`Processing ${skills.length} skills:`, skills);

    const result =
      await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
        skills,
        embeddingConfiguration: this.resolveEmbeddingConfiguration({
          dimension: embeddingDimensionQuery,
        }),
        loThreshold: threshold,
        topNLos: topN,
        enableLlmFilter: false,
        isGenEd: isGenEd,
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
      const coursesByCode = new Map<string, CourseInfo>();

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

    const uniqueCourseIds = new Set(allCourses.map((c) => c.id as string));
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
        const uniqueIds = new Set(
          courses.map((c: any) =>
            Object.hasOwn(c, 'id')
              ? String((c as { id: unknown }).id)
              : 'unknown',
          ),
        );
        console.log(`    Unique course IDs: ${uniqueIds.size}`);
      });
    console.log('--- End Debug ---\n');

    console.timeEnd('CourseRetrieverServiceTest');

    return arrayResult;
  }

  @Get('/embed')
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Text to embed',
    example: 'machine learning basics',
  })
  async embedQuery(@Query('query') query: string): Promise<any> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(
        'Query parameter is required and cannot be empty',
      );
    }

    console.time('EmbeddingTest');

    try {
      const result = await this.embeddingClient.embedOne({
        text: query.trim(),
        role: 'query',
      });

      const vectorLength = result.vector.length;
      console.log(`Embedding generated for query: "${query}"`);
      console.log(`Vector length: ${vectorLength}`);
      console.log(`Model: ${result.metadata.model}`);
      console.log(`Provider: ${result.metadata.provider}`);
      console.log(`Dimension: ${result.metadata.dimension}`);

      console.timeEnd('EmbeddingTest');

      return {
        query: query.trim(),
        vectorLength,
        model: result.metadata.model,
        provider: result.metadata.provider,
        dimension: result.metadata.dimension,
        generatedAt: result.metadata.generatedAt,
        vector: result.vector,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      console.timeEnd('EmbeddingTest');
      throw new BadRequestException(
        `Failed to generate embedding: ${(error as Error).message}`,
      );
    }
  }
}
