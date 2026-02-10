import { Test, TestingModule } from '@nestjs/testing';

import { IEmbeddingRouterService } from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { I_EMBEDDING_ROUTER_SERVICE_TOKEN } from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { PrismaCourseRepository } from '../prisma-course.repository';

function createIdentifier(id: string) {
  return id as Identifier;
}

type CourseFindManyArgs = {
  where?: {
    courseLearningOutcomes?: {
      some?: {
        id?: {
          in?: Identifier[];
        };
      };
    };
  };
};

type CourseFindManyFn = (params?: CourseFindManyArgs) => Promise<unknown[]>;

describe('PrismaCourseRepository - findCourseByLearningOutcomeIds (unit)', () => {
  let moduleRef: TestingModule;
  let repository: PrismaCourseRepository;
  let prismaCourseFindMany: jest.MockedFunction<CourseFindManyFn>;

  beforeEach(async () => {
    prismaCourseFindMany = jest
      .fn<ReturnType<CourseFindManyFn>, Parameters<CourseFindManyFn>>()
      .mockResolvedValue([]);

    const prismaMock = {
      course: {
        findMany: prismaCourseFindMany,
      },
    } as unknown as PrismaService;

    const embeddingRouterServiceMock = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as unknown as jest.Mocked<IEmbeddingRouterService>;

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaCourseRepository,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: I_EMBEDDING_ROUTER_SERVICE_TOKEN,
          useValue: embeddingRouterServiceMock,
        },
      ],
    }).compile();

    repository = moduleRef.get(PrismaCourseRepository);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('returns an empty map and skips querying when no learning outcome ids are provided', async () => {
    // Arrange
    const params = { learningOutcomeIds: [] };

    // Act
    const result = await repository.findCourseByLearningOutcomeIds(params);

    // Assert
    expect(result.size).toBe(0);
    expect(prismaCourseFindMany).not.toHaveBeenCalled();
  });

  it('deduplicates learning outcome ids before building the prisma query', async () => {
    // Arrange
    const params = {
      learningOutcomeIds: [
        createIdentifier('11111111-1111-1111-1111-111111111111'),
        createIdentifier('11111111-1111-1111-1111-111111111111'),
        createIdentifier('22222222-2222-2222-2222-222222222222'),
      ],
    };

    // Act
    await repository.findCourseByLearningOutcomeIds(params);

    // Assert
    expect(prismaCourseFindMany).toHaveBeenCalledTimes(1);
    const args = prismaCourseFindMany.mock.calls[0]?.[0];

    expect(args?.where?.courseLearningOutcomes?.some?.id?.in).toEqual([
      createIdentifier('11111111-1111-1111-1111-111111111111'),
      createIdentifier('22222222-2222-2222-2222-222222222222'),
    ]);
  });
});
