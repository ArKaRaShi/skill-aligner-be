/**
 * Core enumerations for the question-analyses module
 * Fundamental type definitions used across the module
 */

/**
 * Entity types that can be extracted from questions
 * Matches the classification system: topic, skill, task, role
 */
export type EntityType = 'topic' | 'skill' | 'task' | 'role';

/**
 * Confidence levels for extracted entities
 * LLM outputs qualitative confidence directly
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Source of entity extraction
 * - explicit: Direct mention in question text
 * - inferred: Derived from context or implications
 */
export type ExtractionSource = 'explicit' | 'inferred';

/**
 * Overall quality assessment of the extraction
 * - high: At least one HIGH confidence entity, clear learning intent
 * - medium: At least one MEDIUM confidence entity, reasonable learning intent
 * - low: Only LOW confidence entities, ambiguous learning intent
 * - none: No entities extracted, or irrelevant question
 */
export type ExtractionQuality = 'high' | 'medium' | 'low' | 'none';
