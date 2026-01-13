/**
 * Entity extraction types
 * Types for extracted entities from user questions
 */
import type { ConfidenceLevel, ExtractionSource } from './core.enums';

/**
 * Base interface for extracted entities
 * Common fields across all entity types
 */
export interface BaseExtractedEntity {
  name: string;
  normalizedLabel: string;
  confidence: ConfidenceLevel;
  source: ExtractionSource;
}

/**
 * Topic extraction (broad knowledge area)
 * Examples: "AI", "Data Science", "Cooking", "Finance"
 */
export interface TopicExtraction extends BaseExtractedEntity {
  type: 'topic';
}

/**
 * Skill extraction (specific, measurable ability)
 * Examples: "Python", "React", "SQL", "algorithms"
 */
export interface SkillExtraction extends BaseExtractedEntity {
  type: 'skill';
}

/**
 * Task extraction (concrete activity requiring skills)
 * Examples: "build mobile apps", "solve Leetcode problems", "ทำอาหารไทย"
 */
export interface TaskExtraction extends BaseExtractedEntity {
  type: 'task';
}

/**
 * Role extraction (job/position requiring multiple skills)
 * Examples: "Data Scientist", "Software Engineer", "UX Designer"
 */
export interface RoleExtraction extends BaseExtractedEntity {
  type: 'role';
}

/**
 * Union type for all extracted entity types
 */
export type ExtractedEntity =
  | TopicExtraction
  | SkillExtraction
  | TaskExtraction
  | RoleExtraction;

/**
 * Entity counts for tracking extraction summary
 */
export interface EntityCounts {
  topics: number;
  skills: number;
  tasks: number;
  roles: number;
}
