import { SerializationHelper } from '../serialization.helper';
import {
  createEmptyCourseFilterResult,
  createMockCourseFilterResult,
} from './serialization.helper.fixture';

describe('SerializationHelper', () => {
  describe('serializeMap', () => {
    it('should convert empty Map to empty object', () => {
      const map = new Map();
      const result = SerializationHelper.serializeMap(map);

      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should convert Map entries to object key-value pairs', () => {
      const map = new Map([
        ['data analysis', 'courses for analytics'],
        ['statistics', 'courses for stats'],
      ]);
      const result = SerializationHelper.serializeMap(map);

      expect(result['data analysis']).toBe('courses for analytics');
      expect(result['statistics']).toBe('courses for stats');
    });

    it('should stringify numeric keys', () => {
      const map = new Map([
        [1, 'value1'],
        [2, 'value2'],
      ]);
      const result = SerializationHelper.serializeMap(map);

      expect(result['1']).toBe('value1');
      expect(result['2']).toBe('value2');
      expect(Object.keys(result)).toEqual(['1', '2']);
    });

    it('should preserve array and object values', () => {
      const map = new Map([
        ['skills', ['data analysis', 'python']],
        ['course', { subjectCode: 'CS101' }],
      ]);
      const result = SerializationHelper.serializeMap(map);

      expect(result['skills']).toEqual(['data analysis', 'python']);
      expect(result['course']).toEqual({ subjectCode: 'CS101' });
    });

    it('should produce JSON-serializable result', () => {
      const map = new Map<string, string | object | number[]>([
        ['key1', 'value1'],
        ['key2', { nested: 'value2' }],
        ['key3', [1, 2, 3]],
      ]);

      const result = SerializationHelper.serializeMap(map);

      expect(() => JSON.stringify(result)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(result));
      expect(parsed.key1).toBe('value1');
      expect(parsed.key2.nested).toBe('value2');
    });
  });

  describe('serializeCourseFilterResult', () => {
    it('should convert all three Maps to Records', () => {
      const filterResult = createMockCourseFilterResult();
      const result =
        SerializationHelper.serializeCourseFilterResult(filterResult);

      expect(result.llmAcceptedCoursesBySkill).not.toBeInstanceOf(Map);
      expect(result.llmRejectedCoursesBySkill).not.toBeInstanceOf(Map);
      expect(result.llmMissingCoursesBySkill).not.toBeInstanceOf(Map);
    });

    it('should preserve non-Map properties', () => {
      const filterResult = createMockCourseFilterResult({
        llmInfo: {
          model: 'gpt-4',
          provider: 'openai',
          promptVersion: '2024-01-01',
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt',
        },
        tokenUsage: {
          model: 'gpt-4',
          inputTokens: 100,
          outputTokens: 50,
        },
      });

      const result =
        SerializationHelper.serializeCourseFilterResult(filterResult);

      expect(result.llmInfo).toEqual({
        model: 'gpt-4',
        provider: 'openai',
        promptVersion: '2024-01-01',
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      });
      expect(result.tokenUsage).toEqual({
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it('should handle empty Maps', () => {
      const filterResult = createEmptyCourseFilterResult();
      const result =
        SerializationHelper.serializeCourseFilterResult(filterResult);

      expect(result.llmAcceptedCoursesBySkill).toEqual({});
      expect(result.llmRejectedCoursesBySkill).toEqual({});
      expect(result.llmMissingCoursesBySkill).toEqual({});
    });

    it('should produce JSON-serializable result', () => {
      const filterResult = createMockCourseFilterResult();
      const result =
        SerializationHelper.serializeCourseFilterResult(filterResult);

      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });
});
