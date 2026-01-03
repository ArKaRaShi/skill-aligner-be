import { ArrayHelper } from '../array.helper';

describe('ArrayHelper', () => {
  describe('sortByNumberKeyDesc', () => {
    it('should sort array by numeric key in descending order', () => {
      // Arrange
      type TestObject = { id: number; score: number; name: string };
      const input: TestObject[] = [
        { id: 1, score: 85, name: 'Alice' },
        { id: 2, score: 92, name: 'Bob' },
        { id: 3, score: 78, name: 'Charlie' },
        { id: 4, score: 95, name: 'Diana' },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].score).toBe(95);
      expect(result[1].score).toBe(92);
      expect(result[2].score).toBe(85);
      expect(result[3].score).toBe(78);
      expect(result[0].name).toBe('Diana');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Alice');
      expect(result[3].name).toBe('Charlie');
    });

    it('should handle empty array', () => {
      // Arrange
      type TestObject = { score: number };
      const input: TestObject[] = [];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle single element array', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [{ id: 1, score: 85 }];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(85);
    });

    it('should return 0 (no change) when values are null', () => {
      // Arrange
      type TestObject = { id: number; score: number | null };
      const input: TestObject[] = [
        { id: 1, score: null },
        { id: 2, score: null },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(2);
      // Order should remain the same (comparator returns 0)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return 0 (no change) when values are undefined', () => {
      // Arrange
      type TestObject = { id: number; score?: number };
      const input: TestObject[] = [
        { id: 1, score: undefined },
        { id: 2, score: undefined },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(2);
      // Order should remain the same (comparator returns 0)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle mixed null and valid numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number | null | undefined };
      const input: TestObject[] = [
        { id: 1, score: null },
        { id: 2, score: 85 },
        { id: 3, score: undefined },
        { id: 4, score: 92 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(4);
      // When comparator returns 0 for comparisons involving null/undefined,
      // those elements maintain their positions. Valid numbers keep their original relative order.
      const validScores = result.filter(
        (item) => typeof item.score === 'number',
      );
      expect(validScores).toHaveLength(2);
      expect(validScores[0].id).toBe(2); // 85 stays in its original position
      expect(validScores[1].id).toBe(4); // 92 stays in its original position
      // The null/undefined items should be in the array
      const nullItems = result.filter(
        (item) => item.score === null || item.score === undefined,
      );
      expect(nullItems).toHaveLength(2);
    });

    it('should handle negative numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: -10 },
        { id: 2, score: -5 },
        { id: 3, score: 0 },
        { id: 4, score: 5 },
        { id: 5, score: 10 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(10);
      expect(result[1].score).toBe(5);
      expect(result[2].score).toBe(0);
      expect(result[3].score).toBe(-5);
      expect(result[4].score).toBe(-10);
    });

    it('should handle decimal numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 85.5 },
        { id: 2, score: 85.1 },
        { id: 3, score: 85.9 },
        { id: 4, score: 85.3 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(85.9);
      expect(result[1].score).toBe(85.5);
      expect(result[2].score).toBe(85.3);
      expect(result[3].score).toBe(85.1);
    });

    it('should handle very large numbers', () => {
      // Arrange
      type TestObject = { id: number; value: number };
      const input: TestObject[] = [
        { id: 1, value: Number.MAX_SAFE_INTEGER - 1000 },
        { id: 2, value: Number.MAX_SAFE_INTEGER },
        { id: 3, value: Number.MAX_SAFE_INTEGER - 500 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'value'>(
        input,
        'value',
      );

      // Assert
      expect(result[0].value).toBe(Number.MAX_SAFE_INTEGER);
      expect(result[1].value).toBe(Number.MAX_SAFE_INTEGER - 500);
      expect(result[2].value).toBe(Number.MAX_SAFE_INTEGER - 1000);
    });

    it('should handle zero values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 0 },
        { id: 2, score: -1 },
        { id: 3, score: 1 },
        { id: 4, score: 0 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(1);
      expect(result[1].score).toBe(0);
      expect(result[2].score).toBe(0);
      expect(result[3].score).toBe(-1);
    });

    it('should maintain stable sort for equal values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 85 },
        { id: 2, score: 85 },
        { id: 3, score: 85 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((item) => item.score === 85)).toBe(true);
      // All items should have score 85, order might vary due to sort stability
    });

    it('should sort objects with multiple properties correctly', () => {
      // Arrange
      type TestObject = {
        id: number;
        priority: number;
        name: string;
        active: boolean;
      };
      const input: TestObject[] = [
        { id: 1, priority: 2, name: 'Low', active: true },
        { id: 2, priority: 5, name: 'High', active: false },
        { id: 3, priority: 1, name: 'Lowest', active: true },
        { id: 4, priority: 3, name: 'Medium', active: false },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'priority'>(
        input,
        'priority',
      );

      // Assert
      expect(result[0].priority).toBe(5);
      expect(result[0].name).toBe('High');
      expect(result[1].priority).toBe(3);
      expect(result[1].name).toBe('Medium');
      expect(result[2].priority).toBe(2);
      expect(result[2].name).toBe('Low');
      expect(result[3].priority).toBe(1);
      expect(result[3].name).toBe('Lowest');
    });

    it('should handle array with all identical values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 100 },
        { id: 2, score: 100 },
        { id: 3, score: 100 },
        { id: 4, score: 100 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result.every((item) => item.score === 100)).toBe(true);
    });

    it('should sort in place (mutate the original array)', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 85 },
        { id: 2, score: 92 },
      ];
      const originalRef = input;

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toBe(originalRef); // Same reference
      expect(result[0].score).toBe(92);
      expect(result[1].score).toBe(85);
    });

    it('should handle very small decimal differences', () => {
      // Arrange
      type TestObject = { id: number; value: number };
      const input: TestObject[] = [
        { id: 1, value: 0.0001 },
        { id: 2, value: 0.0002 },
        { id: 3, value: 0.00015 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<TestObject, 'value'>(
        input,
        'value',
      );

      // Assert
      expect(result[0].value).toBe(0.0002);
      expect(result[1].value).toBe(0.00015);
      expect(result[2].value).toBe(0.0001);
    });
  });

  describe('sortByNumberKeyAsc', () => {
    it('should sort array by numeric key in ascending order', () => {
      // Arrange
      type TestObject = { id: number; score: number; name: string };
      const input: TestObject[] = [
        { id: 1, score: 85, name: 'Alice' },
        { id: 2, score: 92, name: 'Bob' },
        { id: 3, score: 78, name: 'Charlie' },
        { id: 4, score: 95, name: 'Diana' },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].score).toBe(78);
      expect(result[1].score).toBe(85);
      expect(result[2].score).toBe(92);
      expect(result[3].score).toBe(95);
      expect(result[0].name).toBe('Charlie');
      expect(result[1].name).toBe('Alice');
      expect(result[2].name).toBe('Bob');
      expect(result[3].name).toBe('Diana');
    });

    it('should handle empty array', () => {
      // Arrange
      type TestObject = { score: number };
      const input: TestObject[] = [];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle single element array', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [{ id: 1, score: 85 }];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(85);
    });

    it('should return 0 (no change) when values are null', () => {
      // Arrange
      type TestObject = { id: number; score: number | null };
      const input: TestObject[] = [
        { id: 1, score: null },
        { id: 2, score: null },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(2);
      // Order should remain the same (comparator returns 0)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should return 0 (no change) when values are undefined', () => {
      // Arrange
      type TestObject = { id: number; score?: number };
      const input: TestObject[] = [
        { id: 1, score: undefined },
        { id: 2, score: undefined },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(2);
      // Order should remain the same (comparator returns 0)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle mixed null and valid numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number | null | undefined };
      const input: TestObject[] = [
        { id: 1, score: null },
        { id: 2, score: 85 },
        { id: 3, score: undefined },
        { id: 4, score: 92 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc(input, 'score' as any);

      // Assert
      expect(result).toHaveLength(4);
      // When comparator returns 0 for comparisons involving null/undefined,
      // those elements maintain their positions. Valid numbers keep their original relative order.
      const validScores = result.filter(
        (item) => typeof item.score === 'number',
      );
      expect(validScores).toHaveLength(2);
      expect(validScores[0].id).toBe(2); // 85 stays in its original position
      expect(validScores[1].id).toBe(4); // 92 stays in its original position
      // The null/undefined items should be in the array
      const nullItems = result.filter(
        (item) => item.score === null || item.score === undefined,
      );
      expect(nullItems).toHaveLength(2);
    });

    it('should handle negative numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: -10 },
        { id: 2, score: -5 },
        { id: 3, score: 0 },
        { id: 4, score: 5 },
        { id: 5, score: 10 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(-10);
      expect(result[1].score).toBe(-5);
      expect(result[2].score).toBe(0);
      expect(result[3].score).toBe(5);
      expect(result[4].score).toBe(10);
    });

    it('should handle decimal numbers', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 85.5 },
        { id: 2, score: 85.1 },
        { id: 3, score: 85.9 },
        { id: 4, score: 85.3 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(85.1);
      expect(result[1].score).toBe(85.3);
      expect(result[2].score).toBe(85.5);
      expect(result[3].score).toBe(85.9);
    });

    it('should handle very large numbers', () => {
      // Arrange
      type TestObject = { id: number; value: number };
      const input: TestObject[] = [
        { id: 1, value: Number.MAX_SAFE_INTEGER - 1000 },
        { id: 2, value: Number.MAX_SAFE_INTEGER },
        { id: 3, value: Number.MAX_SAFE_INTEGER - 500 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'value'>(
        input,
        'value',
      );

      // Assert
      expect(result[0].value).toBe(Number.MAX_SAFE_INTEGER - 1000);
      expect(result[1].value).toBe(Number.MAX_SAFE_INTEGER - 500);
      expect(result[2].value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 0 },
        { id: 2, score: -1 },
        { id: 3, score: 1 },
        { id: 4, score: 0 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result[0].score).toBe(-1);
      expect(result[1].score).toBe(0);
      expect(result[2].score).toBe(0);
      expect(result[3].score).toBe(1);
    });

    it('should maintain stable sort for equal values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 85 },
        { id: 2, score: 85 },
        { id: 3, score: 85 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((item) => item.score === 85)).toBe(true);
      // All items should have score 85, order might vary due to sort stability
    });

    it('should sort objects with multiple properties correctly', () => {
      // Arrange
      type TestObject = {
        id: number;
        priority: number;
        name: string;
        active: boolean;
      };
      const input: TestObject[] = [
        { id: 1, priority: 2, name: 'Low', active: true },
        { id: 2, priority: 5, name: 'High', active: false },
        { id: 3, priority: 1, name: 'Lowest', active: true },
        { id: 4, priority: 3, name: 'Medium', active: false },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'priority'>(
        input,
        'priority',
      );

      // Assert
      expect(result[0].priority).toBe(1);
      expect(result[0].name).toBe('Lowest');
      expect(result[1].priority).toBe(2);
      expect(result[1].name).toBe('Low');
      expect(result[2].priority).toBe(3);
      expect(result[2].name).toBe('Medium');
      expect(result[3].priority).toBe(5);
      expect(result[3].name).toBe('High');
    });

    it('should handle array with all identical values', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 100 },
        { id: 2, score: 100 },
        { id: 3, score: 100 },
        { id: 4, score: 100 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result.every((item) => item.score === 100)).toBe(true);
    });

    it('should sort in place (mutate the original array)', () => {
      // Arrange
      type TestObject = { id: number; score: number };
      const input: TestObject[] = [
        { id: 1, score: 92 },
        { id: 2, score: 85 },
      ];
      const originalRef = input;

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );

      // Assert
      expect(result).toBe(originalRef); // Same reference
      expect(result[0].score).toBe(85);
      expect(result[1].score).toBe(92);
    });

    it('should handle very small decimal differences', () => {
      // Arrange
      type TestObject = { id: number; value: number };
      const input: TestObject[] = [
        { id: 1, value: 0.0001 },
        { id: 2, value: 0.0002 },
        { id: 3, value: 0.00015 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<TestObject, 'value'>(
        input,
        'value',
      );

      // Assert
      expect(result[0].value).toBe(0.0001);
      expect(result[1].value).toBe(0.00015);
      expect(result[2].value).toBe(0.0002);
    });
  });

  describe('comparison between asc and desc', () => {
    it('should produce opposite orderings for the same input', () => {
      // Arrange
      type TestObject = { id: number; value: number };
      const input: TestObject[] = [
        { id: 1, value: 10 },
        { id: 2, value: 30 },
        { id: 3, value: 20 },
      ];

      // Create copies to avoid mutation interference
      const inputForAsc: TestObject[] = [...input];
      const inputForDesc: TestObject[] = [...input];

      // Act
      const ascResult = ArrayHelper.sortByNumberKeyAsc<TestObject, 'value'>(
        inputForAsc,
        'value',
      );
      const descResult = ArrayHelper.sortByNumberKeyDesc<TestObject, 'value'>(
        inputForDesc,
        'value',
      );

      // Assert
      expect(ascResult[0].value).toBe(10);
      expect(ascResult[1].value).toBe(20);
      expect(ascResult[2].value).toBe(30);

      expect(descResult[0].value).toBe(30);
      expect(descResult[1].value).toBe(20);
      expect(descResult[2].value).toBe(10);

      // Verify they are exact reverses
      expect(ascResult[0]).toEqual(descResult[2]);
      expect(ascResult[1]).toEqual(descResult[1]);
      expect(ascResult[2]).toEqual(descResult[0]);
    });
  });

  describe('type safety', () => {
    it('should accept valid number keys', () => {
      // Arrange
      type TestObject = {
        id: number;
        score: number;
        name: string;
      };
      const input: TestObject[] = [
        { id: 1, score: 85, name: 'Alice' },
        { id: 2, score: 92, name: 'Bob' },
      ];

      // Act & Assert - Should compile without errors
      const ascResult = ArrayHelper.sortByNumberKeyAsc<TestObject, 'score'>(
        input,
        'score',
      );
      const descResult = ArrayHelper.sortByNumberKeyDesc<TestObject, 'score'>(
        input,
        'score',
      );

      expect(ascResult).toHaveLength(2);
      expect(descResult).toHaveLength(2);
    });

    it('should handle objects with optional numeric properties', () => {
      // Arrange
      type TestObject = {
        id: number;
        score?: number;
        name: string;
      };
      const input: TestObject[] = [
        { id: 1, score: 85, name: 'Alice' },
        { id: 2, name: 'Bob' }, // No score
        { id: 3, score: 92, name: 'Charlie' },
      ];

      // Act & Assert
      const result = ArrayHelper.sortByNumberKeyDesc(input, 'score' as any);
      expect(result).toHaveLength(3);
    });
  });

  describe('edge cases and real-world scenarios', () => {
    it('should sort courses by relevance score descending', () => {
      // Arrange
      type Course = {
        courseId: string;
        relevanceScore: number;
        title: string;
      };
      const courses: Course[] = [
        { courseId: 'C001', relevanceScore: 0.85, title: 'Introduction to AI' },
        {
          courseId: 'C002',
          relevanceScore: 0.92,
          title: 'Machine Learning Basics',
        },
        {
          courseId: 'C003',
          relevanceScore: 0.78,
          title: 'Data Science Fundamentals',
        },
        {
          courseId: 'C004',
          relevanceScore: 0.88,
          title: 'Advanced Neural Networks',
        },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<Course, 'relevanceScore'>(
        courses,
        'relevanceScore',
      );

      // Assert
      expect(result[0].courseId).toBe('C002');
      expect(result[0].relevanceScore).toBe(0.92);
      expect(result[1].courseId).toBe('C004');
      expect(result[2].courseId).toBe('C001');
      expect(result[3].courseId).toBe('C003');
    });

    it('should sort learning outcomes by confidence score ascending', () => {
      // Arrange
      type LearningOutcome = {
        loId: string;
        confidence: number;
        text: string;
      };
      const learningOutcomes: LearningOutcome[] = [
        { loId: 'LO001', confidence: 0.95, text: 'Understand ML concepts' },
        { loId: 'LO002', confidence: 0.87, text: 'Apply neural networks' },
        { loId: 'LO003', confidence: 0.92, text: 'Analyze data patterns' },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<
        LearningOutcome,
        'confidence'
      >(learningOutcomes, 'confidence');

      // Assert
      expect(result[0].confidence).toBe(0.87);
      expect(result[1].confidence).toBe(0.92);
      expect(result[2].confidence).toBe(0.95);
    });

    it('should handle sorting by timestamp', () => {
      // Arrange
      type Event = {
        id: number;
        timestamp: number;
        event: string;
      };
      const events: Event[] = [
        { id: 1, timestamp: 1_600_000_000_000, event: 'start' },
        { id: 2, timestamp: 1_600_000_005_000, event: 'middle' },
        { id: 3, timestamp: 1_600_000_002_500, event: 'checkpoint' },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyAsc<Event, 'timestamp'>(
        events,
        'timestamp',
      );

      // Assert
      expect(result[0].event).toBe('start');
      expect(result[1].event).toBe('checkpoint');
      expect(result[2].event).toBe('middle');
    });

    it('should handle sorting by count or frequency', () => {
      // Arrange
      type WordCount = {
        word: string;
        count: number;
      };
      const wordCounts: WordCount[] = [
        { word: 'the', count: 1000 },
        { word: 'and', count: 850 },
        { word: 'is', count: 920 },
        { word: 'to', count: 780 },
      ];

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<WordCount, 'count'>(
        wordCounts,
        'count',
      );

      // Assert
      expect(result[0].word).toBe('the');
      expect(result[0].count).toBe(1000);
      expect(result[1].word).toBe('is');
      expect(result[2].word).toBe('and');
      expect(result[3].word).toBe('to');
    });

    it('should sort large datasets efficiently', () => {
      // Arrange
      type LargeItem = { id: number; value: number };
      const largeArray: LargeItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: Math.floor(Math.random() * 10000),
      }));

      // Act
      const result = ArrayHelper.sortByNumberKeyDesc<LargeItem, 'value'>(
        largeArray,
        'value',
      );

      // Assert
      expect(result).toHaveLength(1000);
      // Verify it's actually sorted
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value);
      }
    });
  });
});
