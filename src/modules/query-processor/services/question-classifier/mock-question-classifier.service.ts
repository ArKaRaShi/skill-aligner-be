import { Injectable } from '@nestjs/common';

import { IQuestionClassifierService } from '../../contracts/i-question-classifier-service.contract';
import { QuestionClassification } from '../../types/question-classification.type';

@Injectable()
export class MockQuestionClassifierService
  implements IQuestionClassifierService
{
  async classify(question: string): Promise<QuestionClassification> {
    // Simple mock logic based on keywords
    const classification: QuestionClassification = {
      classification: 'relevant',
      reason: 'Mock classification based on keywords',
      rawQuestion: question,
    };

    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('dangerous')) {
      classification.classification = 'dangerous';
      classification.reason = 'Contains dangerous content';
    } else if (lowerQuestion.includes('unclear')) {
      classification.classification = 'unclear';
      classification.reason = 'Question is unclear';
    } else if (lowerQuestion.includes('out of scope')) {
      classification.classification = 'out_of_scope';
      classification.reason = 'Topic is out of scope';
    }

    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    return classification;
  }
}
