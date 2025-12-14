import { Injectable } from '@nestjs/common';

import {
  IQuestionClassifierService,
  QuestionClassifyInput,
} from '../../contracts/i-question-classifier-service.contract';
import { TQuestionClassification } from '../../types/question-classification.type';

@Injectable()
export class MockQuestionClassifierService
  implements IQuestionClassifierService
{
  async classify(
    input: QuestionClassifyInput,
  ): Promise<TQuestionClassification> {
    const { question, promptVersion } = input;

    // Simple mock logic based on keywords
    const classification: TQuestionClassification = {
      category: 'relevant',
      reason: 'Mock classification based on keywords',
      model: 'mock-model',
      userPrompt: 'Mock user prompt',
      systemPrompt: 'Mock system prompt',
      promptVersion,
    };

    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('dangerous')) {
      classification.category = 'dangerous';
      classification.reason = 'Contains dangerous content';
    } else if (lowerQuestion.includes('unclear')) {
      classification.category = 'irrelevant';
      classification.reason = 'Question is unclear';
    } else if (lowerQuestion.includes('out of scope')) {
      classification.category = 'irrelevant';
      classification.reason = 'Topic is out of scope';
    }

    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return classification;
  }
}
