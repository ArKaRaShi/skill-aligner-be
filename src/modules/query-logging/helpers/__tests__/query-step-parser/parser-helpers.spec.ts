import { QueryStepParserHelper } from '../../query-step-parser.helper';
import {
  complexObjectForMap,
  createMockCourse,
  emptyObjectForMap,
  multipleEntriesObjectForMap,
  singleEntryObjectForMap,
  validClassificationRawOutput,
} from './fixtures/query-step-parser.helper.fixture';

describe('QueryStepParserHelper.reconstructMap', () => {
  let helper: QueryStepParserHelper;

  beforeEach(() => {
    helper = new QueryStepParserHelper();
  });

  it('should reconstruct Map from empty object', () => {
    // Act
    const result = helper.reconstructMap(emptyObjectForMap);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should reconstruct Map from single entry object', () => {
    // Act
    const result = helper.reconstructMap(singleEntryObjectForMap);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(1);
    expect(result.get('python')).toEqual([createMockCourse()]);
  });

  it('should reconstruct Map from multiple entries object', () => {
    // Act
    const result = helper.reconstructMap(multipleEntriesObjectForMap);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(3);
    expect(result.get('python')).toEqual([
      createMockCourse({ subjectCode: 'CS201' }),
    ]);
    expect(result.get('javascript')).toEqual([
      createMockCourse({ subjectCode: 'CS202' }),
    ]);
    expect(result.get('java')).toEqual([
      createMockCourse({ subjectCode: 'CS203' }),
    ]);
  });

  it('should reconstruct Map from complex object with multiple values per key', () => {
    // Act
    const result = helper.reconstructMap(complexObjectForMap);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get('python')).toHaveLength(2);
    expect(result.get('javascript')).toHaveLength(1);
  });

  it('should preserve key-value relationships', () => {
    // Arrange
    const testObject = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    // Act
    const result = helper.reconstructMap(testObject);

    // Assert
    expect(result.get('key1')).toBe('value1');
    expect(result.get('key2')).toBe('value2');
    expect(result.get('key3')).toBe('value3');
  });

  it('should handle numeric string keys', () => {
    // Arrange
    const numericKeys = {
      '123': [createMockCourse({ subjectCode: 'CS123' })],
      '456': [createMockCourse({ subjectCode: 'CS456' })],
    };

    // Act
    const result = helper.reconstructMap(numericKeys);

    // Assert
    expect(result.size).toBe(2);
    expect(result.get('123')).toBeDefined();
    expect(result.get('456')).toBeDefined();
  });

  it('should handle special character keys', () => {
    // Arrange
    const specialKeys = {
      'skill-with-dash': [createMockCourse()],
      skill_with_underscore: [createMockCourse()],
      'skill.with.dot': [createMockCourse()],
    };

    // Act
    const result = helper.reconstructMap(specialKeys);

    // Assert
    expect(result.size).toBe(3);
    expect(result.get('skill-with-dash')).toBeDefined();
    expect(result.get('skill_with_underscore')).toBeDefined();
    expect(result.get('skill.with.dot')).toBeDefined();
  });

  it('should handle null and undefined values in map', () => {
    // Arrange
    const objectWithNulls = {
      key1: null,
      key2: undefined,
      key3: 'valid-value',
    };

    // Act
    const result = helper.reconstructMap(objectWithNulls);

    // Assert
    expect(result.size).toBe(3);
    expect(result.get('key1')).toBeNull();
    expect(result.get('key2')).toBeUndefined();
    expect(result.get('key3')).toBe('valid-value');
  });

  it('should handle nested objects as values', () => {
    // Arrange
    const nestedObject = {
      python: {
        courses: [createMockCourse()],
        count: 1,
      },
      javascript: {
        courses: [createMockCourse()],
        count: 1,
      },
    };

    // Act
    const result = helper.reconstructMap(nestedObject);

    // Assert
    expect(result.size).toBe(2);
    expect(result.get('python')).toEqual({
      courses: [createMockCourse()],
      count: 1,
    });
  });

  it('should handle arrays as values', () => {
    // Arrange
    const arrayValues = {
      skills: ['python', 'javascript', 'java'],
      courses: ['CS101', 'CS102', 'CS103'],
    };

    // Act
    const result = helper.reconstructMap(arrayValues);

    // Assert
    expect(result.size).toBe(2);
    expect(result.get('skills')).toEqual(['python', 'javascript', 'java']);
    expect(result.get('courses')).toEqual(['CS101', 'CS102', 'CS103']);
  });

  it('should maintain proper Map type with string keys and generic values', () => {
    // Arrange
    const typedObject = {
      stringKey: 'stringValue',
      numberKey: 12345,
      booleanKey: true,
      arrayKey: [1, 2, 3],
      objectKey: { nested: 'value' },
    };

    // Act
    const result = helper.reconstructMap(typedObject);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.get('stringKey')).toBe('stringValue');
    expect(result.get('numberKey')).toBe(12345);
    expect(result.get('booleanKey')).toBe(true);
    expect(result.get('arrayKey')).toEqual([1, 2, 3]);
    expect(result.get('objectKey')).toEqual({ nested: 'value' });
  });
});

describe('QueryStepParserHelper.singleton export', () => {
  it('should export singleton instance', () => {
    // Arrange & Act
    const helper1 = new QueryStepParserHelper();
    const helper2 = new QueryStepParserHelper();

    // Assert - Different instances but same behavior
    expect(helper1).toBeInstanceOf(QueryStepParserHelper);
    expect(helper2).toBeInstanceOf(QueryStepParserHelper);

    // Both should work identically
    const result1 = helper1.parseClassificationRaw(
      validClassificationRawOutput,
    );
    const result2 = helper2.parseClassificationRaw(
      validClassificationRawOutput,
    );

    expect(result1).toEqual(result2);
  });
});
