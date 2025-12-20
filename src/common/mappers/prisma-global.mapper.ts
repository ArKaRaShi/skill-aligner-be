import { Prisma } from '@prisma/client';

export class PrismaGlobalMapper {
  static mapPrismaMetadataToDomain(
    metadata: Prisma.JsonObject | null,
  ): Record<string, any> | null {
    if (!metadata) {
      return null;
    }

    return { ...metadata };
  }
}
