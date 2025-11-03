import { Injectable } from '@nestjs/common';

import { BaseLocalCache } from 'src/common/adapters/secondary/cache/base-local.cache';

import { SkillExpansion } from '../types/skill-expansion.type';

@Injectable()
export class QuestionSkillCache extends BaseLocalCache<SkillExpansion> {
  store(questionText: string, expansion: SkillExpansion): void {
    this.set(this.normalize(questionText), expansion);
  }

  lookup(questionText: string): SkillExpansion | null {
    return this.get(this.normalize(questionText));
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase();
  }
}
