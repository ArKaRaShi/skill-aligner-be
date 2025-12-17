import { CleanNormalizeCLOPipeline } from '../clean-normalize-clo.pipeline';
import { FileHelper } from '../helpers/file.helper';
import { RawCourseWithCLOJsonRow } from '../types/raw-course-row.type';

// Mock the modules before importing to prevent execution of pipeline code
jest.mock('../helpers/file.helper', () => ({
  FileHelper: {
    loadLatestJson: jest.fn(),
    saveLatestJson: jest.fn(),
  },
}));

// Mock console methods to prevent noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

const mockFileHelper = FileHelper as jest.Mocked<typeof FileHelper>;

describe('CleanNormalizeCLOPipeline', () => {
  const mockRawData: RawCourseWithCLOJsonRow[] = [
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 1,
      clo_name_th:
        '1. อธิบายเกี่ยวกับการย่อยสลายและการสังเคราะห์สารต่าง ๆ ในสิ่งมีชีวิตได้',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 2,
      clo_name_th: 'CLO2: วิเคราะห์และประเมินผลการดำเนินงานทางธุรกิจได้',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 3,
      clo_name_th: 'นิสิตอธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 4,
      clo_name_th: 'student can analyze data effectively',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 5,
      clo_name_th: 'อธิบายความสำคัญของอุตสาหกรรม\nสีเขียวได้',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 6,
      clo_name_th: '',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 7,
      clo_name_th: '   ',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 8,
      clo_name_th: '-',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 9,
      clo_name_th: 'CLO 1, 2, 3',
    },
    {
      academic_year: 2023,
      semester: 1,
      campus_code: 'B',
      faculty_code: '01',
      subject_code: 'CS101',
      subject_name_th: 'คอมพิวเตอร์เบื้องต้น',
      clo_no: 10,
      clo_name_th: '1.2.3',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should process raw data and return cleaned data', async () => {
      // Arrange
      mockFileHelper.loadLatestJson.mockResolvedValue(mockRawData);

      // Act
      const result = await CleanNormalizeCLOPipeline.execute();

      // Assert
      expect(mockFileHelper.loadLatestJson).toHaveBeenCalledWith(
        'src/modules/course/pipelines/data/raw/courses',
      );
      expect(result).toHaveLength(10);

      // Test first row - should remove leading numbers
      const firstRow = result[0];
      expect(firstRow.academic_year).toBe(2023);
      expect(firstRow.semester).toBe(1);
      expect(firstRow.campus_code).toBe('B');
      expect(firstRow.faculty_code).toBe('01');
      expect(firstRow.subject_code).toBe('CS101');
      expect(firstRow.subject_name_th).toBe('คอมพิวเตอร์เบื้องต้น');
      expect(firstRow.clo_no).toBe(1);
      expect(firstRow.original_clo_name_th).toBe(
        '1. อธิบายเกี่ยวกับการย่อยสลายและการสังเคราะห์สารต่าง ๆ ในสิ่งมีชีวิตได้',
      );
      expect(firstRow.clean_clo_name_th).toBe(
        'อธิบายเกี่ยวกับการย่อยสลายและการสังเคราะห์สารต่าง ๆ ในสิ่งมีชีวิตได้',
      );
      expect(firstRow.skipEmbedding).toBe(false);
      expect(firstRow.keywords).toEqual([]);

      // Test second row - should remove CLO prefix
      const secondRow = result[1];
      expect(secondRow.clean_clo_name_th).toBe(
        'วิเคราะห์และประเมินผลการดำเนินงานทางธุรกิจได้',
      );
      expect(secondRow.skipEmbedding).toBe(false);

      // Test third row - should remove "นิสิต" prefix
      const thirdRow = result[2];
      expect(thirdRow.clean_clo_name_th).toBe(
        'อธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
      );
      expect(thirdRow.skipEmbedding).toBe(false);

      // Test fourth row - should remove "student" prefix
      const fourthRow = result[3];
      expect(fourthRow.clean_clo_name_th).toBe('can analyze data effectively');
      expect(fourthRow.skipEmbedding).toBe(false);

      // Test fifth row - should remove newlines
      const fifthRow = result[4];
      expect(fifthRow.clean_clo_name_th).toBe(
        'อธิบายความสำคัญของอุตสาหกรรม สีเขียวได้',
      );
      expect(fifthRow.skipEmbedding).toBe(false);
    });

    it('should handle empty data array', async () => {
      // Arrange
      mockFileHelper.loadLatestJson.mockResolvedValue([]);

      // Act
      const result = await CleanNormalizeCLOPipeline.execute();

      // Assert
      expect(result).toEqual([]);
      expect(mockFileHelper.loadLatestJson).toHaveBeenCalledWith(
        'src/modules/course/pipelines/data/raw/courses',
      );
    });

    it('should mark rows for skip embedding based on various conditions', async () => {
      // Arrange
      mockFileHelper.loadLatestJson.mockResolvedValue(mockRawData);

      // Act
      const result = await CleanNormalizeCLOPipeline.execute();

      // Assert
      // Row 6 (index 5) - empty string should be skipped
      expect(result[5].skipEmbedding).toBe(true);
      expect(result[5].clean_clo_name_th).toBe('');

      // Row 7 (index 6) - whitespace only should be skipped
      expect(result[6].skipEmbedding).toBe(true);
      expect(result[6].clean_clo_name_th).toBe('');

      // Row 8 (index 7) - dash only should be skipped
      expect(result[7].skipEmbedding).toBe(true);
      expect(result[7].clean_clo_name_th).toBe('');

      // Row 9 (index 8) - sequential CLO numbers should be skipped
      expect(result[8].skipEmbedding).toBe(true);
      expect(result[8].clean_clo_name_th).toBe('');

      // Row 10 (index 9) - sequential numbers should be skipped
      expect(result[9].skipEmbedding).toBe(true);
      expect(result[9].clean_clo_name_th).toBe('');
    });
  });

  describe('CLO name cleaning functions', () => {
    beforeEach(() => {
      mockFileHelper.loadLatestJson.mockResolvedValue(mockRawData);
    });

    it('should remove leading numbers correctly', async () => {
      // Test various formats of leading numbers
      const testCases = [
        {
          input: '1. อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: '1) อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: '1- อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: '1.2.3 อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: '1.2-3 อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
      ];

      for (const testCase of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: testCase.input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].clean_clo_name_th).toBe(testCase.expected);
      }
    });

    it('should remove CLO prefixes correctly', async () => {
      const testCases = [
        {
          input: 'CLO1: อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: 'CLO 2. อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: 'clo3- อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
        {
          input: 'CLO 4 อธิบายเกี่ยวกับการย่อยสลาย',
          expected: 'อธิบายเกี่ยวกับการย่อยสลาย',
        },
      ];

      for (const testCase of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: testCase.input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].clean_clo_name_th).toBe(testCase.expected);
      }
    });

    it('should remove student/nisit prefixes correctly', async () => {
      const testCases = [
        {
          input: 'นิสิตอธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
          expected: 'อธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
        },
        {
          input: 'นิสิต: อธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
          expected: 'อธิบายความสำคัญของอุตสาหกรรมสีเขียวได้',
        },
        {
          input: 'student can analyze data effectively',
          expected: 'can analyze data effectively',
        },
        {
          input: 'Student: can analyze data effectively',
          expected: 'can analyze data effectively',
        },
        {
          input: 'STUDENT- can analyze data effectively',
          expected: 'can analyze data effectively',
        },
      ];

      for (const testCase of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: testCase.input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].clean_clo_name_th).toBe(testCase.expected);
      }
    });

    it('should remove newlines correctly', async () => {
      const testCases = [
        {
          input: 'อธิบายความสำคัญของอุตสาหกรรม\nสีเขียวได้',
          expected: 'อธิบายความสำคัญของอุตสาหกรรม สีเขียวได้',
        },
        {
          input: 'อธิบายความสำคัญของอุตสาหกรรม\r\nสีเขียวได้',
          expected: 'อธิบายความสำคัญของอุตสาหกรรม สีเขียวได้',
        },
        {
          input: 'อธิบายความสำคัญของอุตสาหกรรม\n\rสีเขียวได้',
          expected: 'อธิบายความสำคัญของอุตสาหกรรม สีเขียวได้',
        },
      ];

      for (const testCase of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: testCase.input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].clean_clo_name_th).toBe(testCase.expected);
      }
    });

    it('should handle complex CLO name transformations', async () => {
      const complexTestCases = [
        {
          input: '1. CLO2: นิสิตอธิบายความสำคัญของ\nอุตสาหกรรมสีเขียวได้',
          expected: 'อธิบายความสำคัญของ อุตสาหกรรมสีเขียวได้',
        },
        {
          input: '1.2.3) CLO 4- student: analyze\ndata effectively',
          expected: 'analyze data effectively',
        },
      ];

      for (const testCase of complexTestCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: testCase.input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].clean_clo_name_th).toBe(testCase.expected);
        expect(result[0].skipEmbedding).toBe(false);
      }
    });
  });

  describe('Skip embedding conditions', () => {
    beforeEach(() => {
      mockFileHelper.loadLatestJson.mockResolvedValue(mockRawData);
    });

    it('should skip embedding for empty or whitespace CLO names', async () => {
      const testCases = ['', '   ', '\t', '\n'];

      for (const input of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].skipEmbedding).toBe(true);
        expect(result[0].clean_clo_name_th).toBe('');
      }
    });

    it('should skip embedding for dash-only CLO names', async () => {
      const testCases = ['-', '- ', ' -', ' - '];

      for (const input of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].skipEmbedding).toBe(true);
      }
    });

    it('should skip embedding for sequential CLO numbers', async () => {
      const testCases = [
        'CLO 1, 2, 3',
        'clo 1.2.3',
        '1, 2, 3',
        '1.2.3',
        'CLO1,2,3',
        'clo1.2.3',
      ];

      for (const input of testCases) {
        const testData: RawCourseWithCLOJsonRow[] = [
          {
            ...mockRawData[0],
            clo_name_th: input,
          },
        ];
        mockFileHelper.loadLatestJson.mockResolvedValue(testData);

        const result = await CleanNormalizeCLOPipeline.execute();
        expect(result[0].skipEmbedding).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle FileHelper.loadLatestJson errors', async () => {
      // Arrange
      const errorMessage = 'Directory not found';
      mockFileHelper.loadLatestJson.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(CleanNormalizeCLOPipeline.execute()).rejects.toThrow(
        errorMessage,
      );
      expect(mockFileHelper.loadLatestJson).toHaveBeenCalledWith(
        'src/modules/course/pipelines/data/raw/courses',
      );
    });
  });
});
