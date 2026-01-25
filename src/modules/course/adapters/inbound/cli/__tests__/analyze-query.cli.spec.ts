import { Identifier } from 'src/shared/contracts/types/identifier';

import { Campus } from 'src/modules/campus/types/campus.type';
import { CourseViewWithSimilarity } from 'src/modules/course/types/course.type';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

import { getSimilarityBar, parseArgsArray } from '../helpers';

const baseDate = new Date('2024-01-01T00:00:00.000Z');

// Helper builders for potential future tests
const _buildMockCampus = (overrides: Partial<Campus> = {}): Campus => ({
  campusId: 'campus-1' as Identifier,
  code: 'B',
  nameEn: 'Bangkok',
  nameTh: 'กรุงเทพ',
  createdAt: baseDate,
  updatedAt: baseDate,
  faculties: [],
  courses: [],
  ...overrides,
});

const _buildMockFaculty = (overrides: Partial<Faculty> = {}): Faculty => ({
  facultyId: 'faculty-1' as Identifier,
  code: 'ENG',
  nameEn: 'Engineering',
  nameTh: 'วิศวกรรม',
  createdAt: baseDate,
  updatedAt: baseDate,
  campuses: [],
  courses: [],
  ...overrides,
});

const _buildMockCourse = (
  overrides: Partial<CourseViewWithSimilarity> = {},
): CourseViewWithSimilarity => ({
  id: 'course-1' as Identifier,
  campus: _buildMockCampus(),
  faculty: _buildMockFaculty(),
  subjectCode: 'CS101',
  subjectName: 'Intro to CS',
  isGenEd: true,
  courseLearningOutcomes: [],
  matchedLearningOutcomes: [],
  courseOfferings: [],
  totalClicks: 0,
  score: 85,
  createdAt: baseDate,
  updatedAt: baseDate,
  ...overrides,
});

describe('analyze-query.cli', () => {
  describe('parseArgsArray', () => {
    it('should parse help flag -h', () => {
      const result = parseArgsArray(['-h']);
      expect(result).toEqual({ help: true });
    });

    it('should parse help flag --help', () => {
      const result = parseArgsArray(['--help']);
      expect(result).toEqual({ help: true });
    });

    it('should parse query with value', () => {
      const result = parseArgsArray(['--query', 'machine learning']);
      expect(result).toEqual({
        query: 'machine learning',
        help: false,
      });
    });

    it('should parse query with threshold after it', () => {
      const result = parseArgsArray(['--query', 'test', '--threshold', '0.7']);
      expect(result).toEqual({
        query: 'test',
        threshold: 0.7,
        help: false,
      });
    });

    it('should parse query with threshold and top-n', () => {
      const result = parseArgsArray([
        '--threshold',
        '0.7',
        '--top-n',
        '5',
        '--query',
        'test',
      ]);
      expect(result).toEqual({
        query: 'test',
        threshold: 0.7,
        topN: 5,
        help: false,
      });
    });

    it('should parse all numeric options', () => {
      const result = parseArgsArray([
        '--query',
        'data science',
        '--threshold',
        '0.75',
        '--top-n',
        '15',
      ]);
      expect(result).toEqual({
        query: 'data science',
        threshold: 0.75,
        topN: 15,
        help: false,
      });
    });

    it('should parse campus-id and faculty-id', () => {
      const result = parseArgsArray([
        '--query',
        'business',
        '--campus-id',
        'campus-1',
        '--faculty-id',
        'faculty-1',
      ]);
      expect(result).toEqual({
        query: 'business',
        campusId: 'campus-1',
        facultyId: 'faculty-1',
        help: false,
      });
    });

    it('should parse is-gen-ed as true', () => {
      const result = parseArgsArray(['--query', 'test', '--is-gen-ed', 'true']);
      expect(result).toEqual({
        query: 'test',
        isGenEd: true,
        help: false,
      });
    });

    it('should parse is-gen-ed as false', () => {
      const result = parseArgsArray([
        '--query',
        'test',
        '--is-gen-ed',
        'false',
      ]);
      expect(result).toEqual({
        query: 'test',
        isGenEd: false,
        help: false,
      });
    });

    it('should handle empty args array', () => {
      const result = parseArgsArray([]);
      expect(result).toEqual({ help: false });
    });

    it('should handle missing value for query', () => {
      const result = parseArgsArray(['--query']);
      expect(result).toEqual({
        help: false,
        query: undefined,
      });
    });

    it('should ignore flag-like value for threshold', () => {
      const result = parseArgsArray(['--threshold', '--query', 'test']);
      expect(result).toEqual({
        query: 'test',
        help: false,
        threshold: undefined,
      });
    });

    it('should handle all options together', () => {
      const result = parseArgsArray([
        '--query',
        'machine learning',
        '--threshold',
        '0.8',
        '--top-n',
        '20',
        '--campus-id',
        'campus-2',
        '--faculty-id',
        'faculty-3',
        '--is-gen-ed',
        'true',
      ]);
      expect(result).toEqual({
        query: 'machine learning',
        threshold: 0.8,
        topN: 20,
        campusId: 'campus-2',
        facultyId: 'faculty-3',
        isGenEd: true,
        help: false,
      });
    });

    it('should parse decimal threshold values', () => {
      const result = parseArgsArray(['--query', 'test', '--threshold', '0.65']);
      expect(result.threshold).toBe(0.65);
    });

    it('should handle top-n as integer', () => {
      const result = parseArgsArray(['--query', 'test', '--top-n', '10']);
      expect(result.topN).toBe(10);
    });

    it('should handle float values for top-n by parsing int', () => {
      const result = parseArgsArray(['--query', 'test', '--top-n', '10.5']);
      expect(result.topN).toBe(10);
    });
  });

  describe('getSimilarityBar', () => {
    it('should return empty bar for 0% score', () => {
      const result = getSimilarityBar(0);
      expect(result).toBe('0.0% ');
    });

    it('should return one block for 10% score', () => {
      const result = getSimilarityBar(10);
      expect(result).toBe('10.0% █');
    });

    it('should return correct blocks for 50% score', () => {
      const result = getSimilarityBar(50);
      expect(result).toBe('50.0% ██████████');
    });

    it('should return full bar for 100% score', () => {
      const result = getSimilarityBar(100);
      expect(result).toBe('100.0% ██████████████████████████');
    });

    it('should floor the score for block calculation', () => {
      const result = getSimilarityBar(85.7);
      expect(result).toBe('85.7% ███████████████████');
    });

    it('should format score with one decimal place', () => {
      const result = getSimilarityBar(73.456);
      expect(result).toBe('73.5% ███████████████');
    });

    it('should handle edge case of 0.1%', () => {
      const result = getSimilarityBar(0.1);
      expect(result).toBe('0.1% ');
    });

    it('should handle edge case of 99.9%', () => {
      const result = getSimilarityBar(99.9);
      expect(result).toBe('99.9% ██████████████████████████');
    });

    it('should handle negative scores gracefully', () => {
      const result = getSimilarityBar(-5);
      expect(result).toBe('-5.0% ');
    });

    it('should handle scores above 100 gracefully', () => {
      const result = getSimilarityBar(150);
      expect(result).toBe('150.0% ██████████████████████████████████');
    });
  });
});
