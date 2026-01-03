import { Injectable } from '@nestjs/common';

import { BaseLocalCache } from 'src/shared/kernel/cache/base-local.cache';

import { TSkillExpansion } from '../types/skill-expansion.type';

@Injectable()
export class QuestionSkillCache extends BaseLocalCache<TSkillExpansion> {
  store(questionText: string, expansion: TSkillExpansion): void {
    this.set(this.normalize(questionText), expansion);
  }

  lookup(questionText: string): TSkillExpansion | null {
    return this.get(this.normalize(questionText));
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase();
  }
}
