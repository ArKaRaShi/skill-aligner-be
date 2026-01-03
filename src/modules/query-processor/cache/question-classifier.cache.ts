import { Injectable } from '@nestjs/common';

import { BaseLocalCache } from 'src/shared/infrastructure/cache/base-local.cache';

import { TQuestionClassification } from '../types/question-classification.type';

@Injectable()
export class QuestionClassifierCache extends BaseLocalCache<TQuestionClassification> {
  store(questionText: string, classification: TQuestionClassification): void {
    this.set(this.normalize(questionText), classification);
  }

  lookup(questionText: string): TQuestionClassification | null {
    return this.get(this.normalize(questionText));
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase();
  }
}
