/**
 * Branded type for Skills to ensure type safety.
 * Prevents accidental mixing of Skill with plain string types.
 */
export type Skill = string & { readonly __brand: unique symbol };
