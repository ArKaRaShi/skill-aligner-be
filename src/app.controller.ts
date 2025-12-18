import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';

import {
  createOpenRouter,
  OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';

import { Identifier } from './common/domain/types/identifier';
import { AppConfigService } from './config/app-config.service';
import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from './modules/course/contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from './modules/course/contracts/i-course-repository.contract';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from './modules/course/contracts/i-course-retriever-service.contract';
import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from './modules/embedding/contracts/i-embedding-client.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from './modules/query-processor/contracts/i-skill-expander-service.contract';
import {
  I_TOOL_DISPATCHER_SERVICE_TOKEN,
  IToolDispatcherService,
} from './modules/query-processor/contracts/i-tool-dispatcher-service.contract';
import { TSkillExpansionV2 } from './modules/query-processor/types/skill-expansion.type';

@Controller()
export class AppController {
  private readonly openRouter: OpenRouterProvider;

  constructor(
    private readonly appConfigService: AppConfigService,
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,

    @Inject(I_EMBEDDING_CLIENT_TOKEN)
    private readonly embeddingService: IEmbeddingClient,
    @Inject(I_TOOL_DISPATCHER_SERVICE_TOKEN)
    private readonly toolDispatcherService: IToolDispatcherService,

    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,
  ) {
    this.openRouter = createOpenRouter({
      apiKey: this.appConfigService.openRouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  @Get('/openrouter')
  async getResponse(@Query('question') question: string): Promise<string> {
    const completions = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.appConfigService.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await completions.json();
  }

  @Get('/test-skill-expander')
  async testSkillExpander(
    @Query('question') question: string,
  ): Promise<TSkillExpansionV2> {
    const result = await this.skillExpanderService.expandSkillsV2(question);
    return result;
  }

  @Get('/test/course-repository')
  async testCourseRepository(
    @Query('skills') skillsQuery?: string,
  ): Promise<any> {
    console.time('CourseRepositoryTest');
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

    const matchesPerSkill = 20;
    const threshold = 0.6;

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseRepository.findCoursesBySkillsViaLO({
      skills,
      matchesPerSkill,
      threshold,
    });

    const arrayResult = Array.from(result.entries()).map(([skill, courses]) => {
      const coursesWithoutEmbeddings = courses.map(
        ({ cloMatches, ...course }) => {
          const cloMatchesWithoutEmbeddings = cloMatches.map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ embedding, ...cloMatch }) => cloMatch,
          );

          return {
            ...course,
            cloMatches: cloMatchesWithoutEmbeddings,
          };
        },
      );

      return {
        skill,
        courses: coursesWithoutEmbeddings,
      };
    });

    // Extract and log learning outcomes with similarity scores
    const losWithSim = arrayResult.flatMap((skillResult) =>
      skillResult.courses.flatMap((course) =>
        course.cloMatches.map((clo) => ({
          lo_name: clo.cleanedCloName,
          sim: clo.similarityScore,
        })),
      ),
    );

    console.log('Learning Outcomes Array:', losWithSim);

    console.timeEnd('CourseRepositoryTest');
    console.log('Course length: ', arrayResult[0].courses.length);

    return arrayResult;
  }

  @Get('/test/embedding-service')
  async testEmbeddingService(): Promise<any> {
    const text = 'Sample text for embedding';

    const embeddings = await this.embeddingService.embedOne({
      text,
      role: 'query',
    });
    console.log('Embeddings:', embeddings);
    return embeddings;
  }

  @Get('/test/tool-dispatcher')
  async testToolDispatcher(@Query('query') query: string): Promise<any> {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    try {
      const executionPlan =
        await this.toolDispatcherService.generateExecutionPlan(query);
      return { query, executionPlan };
    } catch (error) {
      console.error('Error in tool dispatcher:', error);
      return {
        error: 'Failed to generate execution plan',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/test/clo-repository')
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
    name: 'vectorDimension',
    required: false,
    description: 'Dimension of embedding vectors (768 or 1536, default: 768)',
    example: '768',
  })
  async testCloRepository(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('vectorDimension') vectorDimensionQuery?: string,
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
    const vectorDimension = vectorDimensionQuery
      ? (parseInt(vectorDimensionQuery, 10) as 768 | 1536)
      : 768;

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseLearningOutcomeRepository.findLosBySkills({
      skills,
      threshold,
      topN,
      vectorDimension,
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

  @Post('/test/course-retriever-service')
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
    name: 'vectorDimension',
    required: false,
    description: 'Dimension of embedding vectors (768 or 1536, default: 768)',
    example: '768',
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
    @Query('vectorDimension') vectorDimensionQuery?: string,
    @Query('enableLlmFilter') enableLlmFilterQuery?: string,
    @Query('campusId') campusIdQuery?: string,
    @Query('facultyId') facultyIdQuery?: string,
    @Query('isGenEd') isGenEdQuery?: string,
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
    const vectorDimension = vectorDimensionQuery
      ? (parseInt(vectorDimensionQuery, 10) as 768 | 1536)
      : 768;
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
        threshold,
        topN,
        vectorDimension,
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
      courseNameTh: string;
      courseNameEn: string | null;
      count: number;
      academicYearSemesters: Set<string>;
    };

    type UniqueCourseInfo = {
      courseCode: string;
      courseNameTh: string;
      courseNameEn: string | null;
      count: number;
      academicYearSemesters: string[];
    };

    // Convert Map to array for response and group courses by unique codes
    const arrayResult = Array.from(result.entries()).map(([skill, courses]) => {
      // Group courses by unique course code and track learning outcomes
      const coursesByCode = new Map<
        string,
        CourseInfo & { learningOutcomes: Set<string> }
      >();

      courses.forEach((course) => {
        const courseCode = course.subjectCode;
        const loName =
          course.matchedLearningOutcomes[0]?.cleanedName || 'Unknown LO';

        if (!coursesByCode.has(courseCode)) {
          coursesByCode.set(courseCode, {
            courseCode,
            courseNameTh: course.subjectNameTh,
            courseNameEn: course.subjectNameEn,
            count: 0,
            academicYearSemesters: new Set(),
            learningOutcomes: new Set(),
          });
        }

        const courseInfo = coursesByCode.get(courseCode);
        if (courseInfo) {
          courseInfo.count++;
          courseInfo.learningOutcomes.add(loName);

          if (course.academicYear && course.semester) {
            courseInfo.academicYearSemesters.add(
              `${course.academicYear}/${course.semester}`,
            );
          }
        }
      });

      // Convert to array and sort by count (descending)
      const uniqueCourses: UniqueCourseInfo[] = Array.from(
        coursesByCode.values(),
      )
        .map(
          (courseInfo): UniqueCourseInfo => ({
            courseCode: courseInfo.courseCode,
            courseNameTh: courseInfo.courseNameTh,
            courseNameEn: courseInfo.courseNameEn,
            count: courseInfo.count,
            academicYearSemesters: Array.from(
              courseInfo.academicYearSemesters,
            ).sort(),
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
          const id = course.courseId;
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
            `  ${course.subjectCode} (${course.matchedLearningOutcomes.length} matches) [ID: ${course.courseId}]: ${loNames}${moreText}`,
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

    const uniqueCourseIds = new Set(allCourses.map((c) => c.courseId));
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
        const uniqueIds = new Set(courses.map((c) => c.courseId));
        console.log(`    Unique course IDs: ${uniqueIds.size}`);
      });
    console.log('--- End Debug ---\n');

    console.timeEnd('CourseRetrieverServiceTest');

    return arrayResult;
  }
}
