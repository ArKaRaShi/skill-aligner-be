import { InspectorPipeline } from '../inspector';
import { CleanCourseWithCLO } from '../types/clean-course.type';

const buildCourse = (
  overrides: Partial<CleanCourseWithCLO> = {},
): CleanCourseWithCLO => ({
  academic_year: 2024,
  semester: 1,
  campus_code: 'C',
  faculty_code: 'F',
  subject_code: 'SUB',
  subject_name_th: 'Subject',
  clo_no: 1,
  original_clo_name_th: 'Original',
  clean_clo_name_th: 'Clean',
  skipEmbedding: false,
  keywords: [],
  ...overrides,
});

const getLoggedMessages = (spy: jest.SpyInstance): string[] =>
  spy.mock.calls.flat().filter((arg) => typeof arg === 'string');

describe('InspectorPipeline', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('logCloConflictsByCourseAndTerm', () => {
    it('logs success when each term has consistent CLO names', () => {
      const data = [
        buildCourse({ clo_no: 1, clean_clo_name_th: 'CLO 1' }),
        buildCourse({ clo_no: 2, clean_clo_name_th: 'CLO 2' }),
      ];

      InspectorPipeline.logCloConflictsByCourseAndTerm(data);

      expect(getLoggedMessages(logSpy)).toContain(
        '[InspectorPipeline] No CLO conflicts detected across subject/year/semester pairs.',
      );
    });

    it('logs conflict when the same CLO number has multiple names within a term', () => {
      const data = [
        buildCourse({ clo_no: 1, clean_clo_name_th: 'Intro' }),
        buildCourse({ clo_no: 1, clean_clo_name_th: 'Advanced' }),
      ];

      InspectorPipeline.logCloConflictsByCourseAndTerm(data);

      const messages = getLoggedMessages(logSpy);
      expect(
        messages.some((msg) =>
          msg.includes('[InspectorPipeline][CLO_CONFLICT] subject=SUB'),
        ),
      ).toBe(true);
    });
  });

  describe('logCloConsistencyAcrossTerms', () => {
    it('logs success when every term has the same CLO set', () => {
      const data = [
        buildCourse({
          academic_year: 2023,
          semester: 1,
          clo_no: 1,
          clean_clo_name_th: 'CLO 1',
        }),
        buildCourse({
          academic_year: 2023,
          semester: 1,
          clo_no: 2,
          clean_clo_name_th: 'CLO 2',
        }),
        buildCourse({
          academic_year: 2024,
          semester: 1,
          clo_no: 1,
          clean_clo_name_th: 'CLO 1',
        }),
        buildCourse({
          academic_year: 2024,
          semester: 1,
          clo_no: 2,
          clean_clo_name_th: 'CLO 2',
        }),
      ];

      InspectorPipeline.logCloConsistencyAcrossTerms(data);

      expect(getLoggedMessages(logSpy)).toContain(
        '[InspectorPipeline] All terms contain matching CLO definitions per subject.',
      );
    });

    it('logs mismatch when later terms diverge', () => {
      const data = [
        buildCourse({
          academic_year: 2023,
          semester: 1,
          clo_no: 1,
          clean_clo_name_th: 'CLO 1',
        }),
        buildCourse({
          academic_year: 2024,
          semester: 1,
          clo_no: 1,
          clean_clo_name_th: 'Different',
        }),
      ];

      InspectorPipeline.logCloConsistencyAcrossTerms(data);

      const messages = getLoggedMessages(logSpy);
      expect(
        messages.some((msg) =>
          msg.includes('[InspectorPipeline][CLO_TERM_MISMATCH] subject=SUB'),
        ),
      ).toBe(true);
    });
  });

  describe('logCourseLocationConsistency', () => {
    it('logs success when each subject code maps to a single campus and faculty', () => {
      const data = [
        buildCourse({
          subject_code: 'SUB1',
          campus_code: 'C1',
          faculty_code: 'F1',
        }),
        buildCourse({
          subject_code: 'SUB2',
          campus_code: 'C2',
          faculty_code: 'F2',
        }),
      ];

      InspectorPipeline.logCourseLocationConsistency(data);

      expect(getLoggedMessages(logSpy)).toContain(
        '[InspectorPipeline] All subject codes map to a single campus and faculty.',
      );
    });

    it('logs conflict when a subject code spans multiple campuses or faculties', () => {
      const data = [
        buildCourse({ campus_code: 'C1', faculty_code: 'F1' }),
        buildCourse({ campus_code: 'C2', faculty_code: 'F1' }),
        buildCourse({ campus_code: 'C2', faculty_code: 'F2' }),
      ];

      InspectorPipeline.logCourseLocationConsistency(data);

      const messages = getLoggedMessages(logSpy);
      expect(
        messages.some((msg) =>
          msg.includes('[InspectorPipeline][COURSE_LOCATION] subject=SUB'),
        ),
      ).toBe(true);
    });
  });
});
