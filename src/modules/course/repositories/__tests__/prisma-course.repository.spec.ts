import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import { IEmbeddingClient } from 'src/modules/embedding/contracts/i-embedding-client.contract';
import { I_EMBEDDING_CLIENT_TOKEN } from 'src/modules/embedding/contracts/i-embedding-client.contract';

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

    const embeddingClientMock = {
      embedOne: jest.fn(),
      embedMany: jest.fn(),
    } as jest.Mocked<IEmbeddingClient>;

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaCourseRepository,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: I_EMBEDDING_CLIENT_TOKEN,
          useValue: embeddingClientMock,
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
