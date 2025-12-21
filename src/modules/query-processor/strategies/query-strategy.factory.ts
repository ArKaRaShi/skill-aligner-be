import { Injectable } from '@nestjs/common';

import { IQueryStrategy } from '../contracts/i-query-strategy.contract';
import { QueryProfile } from '../types/query-profile.type';
import { SkillQueryStrategy } from './skill-query.strategy';

@Injectable()
export class QueryStrategyFactory {
  constructor(private readonly skillQueryStrategy: SkillQueryStrategy) {}

  /**
   * Get the appropriate query strategy based on the query profile
   * @param queryProfile - The profile of the query
   * @returns An instance of IQueryStrategy or null if no suitable strategy is found
   */
  getStrategy(queryProfile: QueryProfile): IQueryStrategy | null {
    // For now, we only have one strategy, but this factory can be extended
    // to select different strategies based on the query profile
    if (this.skillQueryStrategy.canHandle(queryProfile)) {
      return this.skillQueryStrategy;
    }

    return null;
  }
}
