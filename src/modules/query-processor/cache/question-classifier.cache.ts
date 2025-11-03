import { Injectable } from '@nestjs/common';

import { BaseLocalCache } from 'src/common/adapters/secondary/cache/base-local.cache';

import { QuestionClassification } from '../types/question-classification.type';

@Injectable()
export class QuestionClassifierCache extends BaseLocalCache<QuestionClassification> {
  store(questionText: string, classification: QuestionClassification): void {
    this.set(this.normalize(questionText), classification);
  }

  lookup(questionText: string): QuestionClassification | null {
    return this.get(this.normalize(questionText));
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase();
  }
}
