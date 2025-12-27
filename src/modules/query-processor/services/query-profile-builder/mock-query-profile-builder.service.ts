import { Injectable } from '@nestjs/common';

import { TokenUsage } from 'src/common/types/token-usage.type';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class MockQueryProfileBuilderService
  implements IQueryProfileBuilderService
{
  async buildQueryProfile(query: string): Promise<QueryProfile> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay

    const lowerQuery = query.toLowerCase();

    // Mock logic based on common patterns
    const tokenUsage: TokenUsage = {
      model: 'mock-model',
      inputTokens: 0,
      outputTokens: 0,
    };
    const profile: QueryProfile = {
      intents: [],
      preferences: [],
      background: [],
      language: 'th',
      tokenUsage,
    };

    // Detect intents
    if (
      lowerQuery.includes('อาชีพ') ||
      lowerQuery.includes('career') ||
      lowerQuery.includes('job')
    ) {
      profile.intents.push({
        original: 'อาชีพ',
        augmented: 'ask-occupation',
      });
    }

    if (
      lowerQuery.includes('ทักษะ') ||
      lowerQuery.includes('skill') ||
      lowerQuery.includes('เรียน')
    ) {
      profile.intents.push({
        original: 'ทักษะ',
        augmented: 'ask-skills',
      });
    }

    // Detect preferences
    if (
      lowerQuery.includes('ai') ||
      lowerQuery.includes('artificial intelligence')
    ) {
      profile.preferences.push({
        original: 'AI',
        augmented: 'AI',
      });
    }

    if (
      lowerQuery.includes('การเงิน') ||
      lowerQuery.includes('finance') ||
      lowerQuery.includes('financial')
    ) {
      profile.preferences.push({
        original: 'การเงิน',
        augmented: 'finance',
      });
    }

    // Detect background
    if (
      lowerQuery.includes('ถนัดโค้ด') ||
      lowerQuery.includes('coding') ||
      lowerQuery.includes('programming')
    ) {
      profile.background.push({
        original: 'ถนัดโค้ด',
        augmented: 'coding',
      });
    }

    if (
      lowerQuery.includes('พื้นฐาน') ||
      lowerQuery.includes('background') ||
      lowerQuery.includes('experience')
    ) {
      profile.background.push({
        original: 'มีพื้นฐาน',
        augmented: 'has-background',
      });
    }

    // If no profile information was found, return an empty profile
    return profile;
  }
}
