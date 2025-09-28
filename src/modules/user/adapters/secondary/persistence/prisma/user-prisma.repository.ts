import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { IUserRepository } from 'src/modules/user/core/application/ports/i-user.repository';
import { User } from 'src/modules/user/core/domain/entities/user.entity';

import { UserPrismaMapper } from './user-prisma.mapper';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user ? UserPrismaMapper.toEntity(user) : null;
  }

  async save(user: User): Promise<User> {
    const result = await this.prisma.user.upsert({
      where: { id: user.id.toString() },
      create: UserPrismaMapper.toPrismaCreateInput(user),
      update: UserPrismaMapper.toPrismaUpdateInput(user),
    });
    return UserPrismaMapper.toEntity(result);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? UserPrismaMapper.toEntity(user) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
