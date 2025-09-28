import { Prisma, User as PrismaUser } from '@prisma/client';

import { User as UserEntity } from 'src/modules/user/core/domain/entities/user.entity';

export class UserPrismaMapper {
  /**
   * Maps a Prisma User model to a UserEntity.
   * @param prismaUser - The Prisma User model to be converted.
   * @returns The corresponding UserEntity.
   */
  static toEntity(prismaUser: PrismaUser): UserEntity {
    const { id, email, createdAt, updatedAt } = prismaUser;
    return UserEntity.reconstruct({
      id,
      email,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Maps a UserEntity to a Prisma.UserCreateInput.
   * @param user - The user entity to be converted.
   * @returns The Prisma.UserCreateInput object.
   */
  static toPrismaCreateInput(user: UserEntity): Prisma.UserCreateInput {
    return {
      id: user.id.toString(),
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Maps a UserEntity to a Prisma.UserUpdateInput.
   * @param user - The user entity to be converted.
   * @returns The Prisma.UserUpdateInput object.
   */
  static toPrismaUpdateInput(user: UserEntity): Prisma.UserUpdateInput {
    return {
      email: user.email,
      updatedAt: user.updatedAt,
    };
  }
}
