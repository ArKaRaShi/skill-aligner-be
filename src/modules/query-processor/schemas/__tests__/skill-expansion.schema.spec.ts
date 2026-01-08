import {
  LlmSkillExpansion,
  LlmSkillExpansionV2,
  SkillExpansionSchema,
  SkillExpansionV2Schema,
  SkillItemSchema,
  SkillItemV2Schema,
} from '../skill-expansion.schema';

describe('SkillItemSchema (V1)', () => {
  const validInput = {
    skill: 'Python programming',
    reason: 'User explicitly mentioned Python as a required skill',
  };

  describe('validation', () => {
    it('should accept valid skill item with all required fields', () => {
      const result = SkillItemSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should accept skill with special characters', () => {
      const input = {
        skill: 'C++ programming',
        reason: 'User asked about C++ courses',
      };
      const result = SkillItemSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept skill with Thai characters', () => {
      const input = {
        skill: 'การเขียนโปรแกรม Python',
        reason: 'ผู้ใช้ถามเกี่ยวกับทักษะการเขียนโปรแกรม',
      };
      const result = SkillItemSchema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe('rejection tests', () => {
    it('should reject empty skill string', () => {
      expect(() => {
        SkillItemSchema.parse({ skill: '', reason: 'Test reason' });
      }).toThrow('Skill name cannot be empty');
    });

    it('should reject empty reason string', () => {
      expect(() => {
        SkillItemSchema.parse({ skill: 'Python', reason: '' });
      }).toThrow('Reason cannot be empty');
    });

    it('should reject missing skill field', () => {
      expect(() => {
        SkillItemSchema.parse({ reason: 'Test reason' } as unknown);
      }).toThrow();
    });

    it('should reject missing reason field', () => {
      expect(() => {
        SkillItemSchema.parse({ skill: 'Python' } as unknown);
      }).toThrow();
    });

    it('should reject non-string skill', () => {
      const nonStrings = [123, true, null, undefined, {}];
      nonStrings.forEach((skill) => {
        expect(() => {
          SkillItemSchema.parse({ skill, reason: 'Test' } as unknown);
        }).toThrow();
      });
    });

    it('should reject non-string reason', () => {
      const nonStrings = [123, true, null, undefined, {}];
      nonStrings.forEach((reason) => {
        expect(() => {
          SkillItemSchema.parse({ skill: 'Python', reason } as unknown);
        }).toThrow();
      });
    });
  });
});

describe('SkillItemV2Schema (V2)', () => {
  const validInput = {
    skill: 'การเขียนโปรแกรม',
    learning_outcome: 'สามารถเขียนโปรแกรมภาษา Python เพื่อแก้ปัญหาเบื้องต้นได้',
    reason: 'ผู้ใช้ถามเกี่ยวกับทักษะการเขียนโปรแกรมเพื่อการทำงาน',
  };

  describe('validation', () => {
    it('should accept valid skill item with all required fields', () => {
      const result = SkillItemV2Schema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should accept skill item with English text', () => {
      const input = {
        skill: 'Web development',
        learning_outcome:
          'Can build responsive web applications using HTML, CSS, and JavaScript',
        reason: 'User asked about web development skills for frontend career',
      };
      const result = SkillItemV2Schema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept skill item with mixed Thai-English content', () => {
      const input = {
        skill: 'การเขียนโปรแกรม Python (Python programming)',
        learning_outcome:
          'เข้าใจหลักการเขียนโปรแกรมเชิงวัตถุ (OOP) และสามารถประยุกต์ใช้ได้',
        reason: 'User wants to learn Python for data analysis and automation',
      };
      const result = SkillItemV2Schema.parse(input);
      expect(result).toEqual(input);
    });
  });

  describe('rejection tests', () => {
    it('should reject empty skill string', () => {
      expect(() => {
        SkillItemV2Schema.parse({
          skill: '',
          learning_outcome: 'Can write code',
          reason: 'Test reason',
        });
      }).toThrow('Skill name cannot be empty');
    });

    it('should reject empty learning_outcome string', () => {
      expect(() => {
        SkillItemV2Schema.parse({
          skill: 'Python',
          learning_outcome: '',
          reason: 'Test reason',
        });
      }).toThrow('Learning outcome cannot be empty');
    });

    it('should reject empty reason string', () => {
      expect(() => {
        SkillItemV2Schema.parse({
          skill: 'Python',
          learning_outcome: 'Can write code',
          reason: '',
        });
      }).toThrow('Reason cannot be empty');
    });

    it('should reject missing any required field', () => {
      expect(() => {
        SkillItemV2Schema.parse({ skill: 'Python' } as unknown);
      }).toThrow();

      expect(() => {
        SkillItemV2Schema.parse({ learning_outcome: 'Test' } as unknown);
      }).toThrow();

      expect(() => {
        SkillItemV2Schema.parse({ reason: 'Test' } as unknown);
      }).toThrow();
    });
  });
});

describe('SkillExpansionSchema (V1)', () => {
  const validInput = {
    skills: [
      {
        skill: 'Python programming',
        reason: 'User mentioned Python as required skill',
      },
      {
        skill: 'Data analysis',
        reason: 'Inferred from question about analyzing datasets',
      },
    ],
  };

  describe('array validation', () => {
    it('should accept array with one skill', () => {
      const input = {
        skills: [
          {
            skill: 'Python programming',
            reason: 'User asked about Python',
          },
        ],
      };
      const result = SkillExpansionSchema.parse(input);
      expect(result.skills).toHaveLength(1);
    });

    it('should accept array with multiple skills', () => {
      const result = SkillExpansionSchema.parse(validInput);
      expect(result.skills).toHaveLength(2);
    });

    it('should reject empty array (V1 requires at least one skill)', () => {
      expect(() => {
        SkillExpansionSchema.parse({ skills: [] });
      }).toThrow('At least one skill must be provided');
    });

    it('should reject missing skills field', () => {
      expect(() => {
        SkillExpansionSchema.parse({} as unknown);
      }).toThrow();
    });

    it('should reject non-array skills', () => {
      const nonArrays = [123, 'string', true, null, {}];
      nonArrays.forEach((skills) => {
        expect(() => {
          SkillExpansionSchema.parse({ skills } as unknown);
        }).toThrow();
      });
    });
  });

  describe('nested item validation', () => {
    it('should reject array with items missing skill field', () => {
      expect(() => {
        SkillExpansionSchema.parse({
          skills: [{ reason: 'Test reason' } as unknown],
        });
      }).toThrow();
    });

    it('should reject array with items missing reason field', () => {
      expect(() => {
        SkillExpansionSchema.parse({
          skills: [{ skill: 'Python' } as unknown],
        });
      }).toThrow();
    });

    it('should reject array with items containing empty skill', () => {
      expect(() => {
        SkillExpansionSchema.parse({
          skills: [{ skill: '', reason: 'Test reason' }],
        });
      }).toThrow();
    });

    it('should reject array with items containing empty reason', () => {
      expect(() => {
        SkillExpansionSchema.parse({
          skills: [{ skill: 'Python', reason: '' }],
        });
      }).toThrow();
    });
  });

  describe('type inference', () => {
    it('should correctly infer LlmSkillExpansion type', () => {
      const input: LlmSkillExpansion = {
        skills: [
          {
            skill: 'Python programming',
            reason: 'User asked about Python',
          },
        ],
      };
      const result = SkillExpansionSchema.parse(input);
      expect(result).toEqual(input);
    });
  });
});

describe('SkillExpansionV2Schema (V2)', () => {
  const validInput = {
    skills: [
      {
        skill: 'การเขียนโปรแกรม',
        learning_outcome:
          'สามารถเขียนโปรแกรมภาษา Python เพื่อแก้ปัญหาเบื้องต้นได้',
        reason: 'ผู้ใช้ถามเกี่ยวกับทักษะการเขียนโปรแกรม',
      },
      {
        skill: 'การวิเคราะห์ข้อมูล',
        learning_outcome:
          'สามารถใช้ Python วิเคราะห์ข้อมูลและสร้างกราฟเพื่อการนำเสนอได้',
        reason: 'ผู้ใช้ต้องการวิเคราะห์ข้อมูลเชิงธุรกิจ',
      },
    ],
  };

  describe('array validation', () => {
    it('should accept array with one skill', () => {
      const input = {
        skills: [
          {
            skill: 'การเขียนโปรแกรม',
            learning_outcome: 'สามารถเขียนโปรแกรมได้',
            reason: 'ผู้ใช้ถามเกี่ยวกับการเขียนโปรแกรม',
          },
        ],
      };
      const result = SkillExpansionV2Schema.parse(input);
      expect(result.skills).toHaveLength(1);
    });

    it('should accept array with multiple skills', () => {
      const result = SkillExpansionV2Schema.parse(validInput);
      expect(result.skills).toHaveLength(2);
    });

    it('should accept empty array (V2 allows zero skills)', () => {
      const input = { skills: [] };
      const result = SkillExpansionV2Schema.parse(input);
      expect(result.skills).toEqual([]);
    });

    it('should reject missing skills field', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({} as unknown);
      }).toThrow();
    });
  });

  describe('nested item validation', () => {
    it('should reject array with items missing skill field', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              learning_outcome: 'Can write code',
              reason: 'Test reason',
            } as unknown,
          ],
        });
      }).toThrow();
    });

    it('should reject array with items missing learning_outcome field', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              skill: 'Python',
              reason: 'Test reason',
            } as unknown,
          ],
        });
      }).toThrow();
    });

    it('should reject array with items missing reason field', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              skill: 'Python',
              learning_outcome: 'Can write code',
            } as unknown,
          ],
        });
      }).toThrow();
    });

    it('should reject array with items containing empty skill', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              skill: '',
              learning_outcome: 'Can write code',
              reason: 'Test reason',
            },
          ],
        });
      }).toThrow();
    });

    it('should reject array with items containing empty learning_outcome', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              skill: 'Python',
              learning_outcome: '',
              reason: 'Test reason',
            },
          ],
        });
      }).toThrow();
    });

    it('should reject array with items containing empty reason', () => {
      expect(() => {
        SkillExpansionV2Schema.parse({
          skills: [
            {
              skill: 'Python',
              learning_outcome: 'Can write code',
              reason: '',
            },
          ],
        });
      }).toThrow();
    });
  });

  describe('type inference', () => {
    it('should correctly infer LlmSkillExpansionV2 type', () => {
      const input: LlmSkillExpansionV2 = {
        skills: [
          {
            skill: 'การเขียนโปรแกรม',
            learning_outcome: 'สามารถเขียนโปรแกรมได้',
            reason: 'ผู้ใช้ถามเกี่ยวกับการเขียนโปรแกรม',
          },
        ],
      };
      const result = SkillExpansionV2Schema.parse(input);
      expect(result).toEqual(input);
    });
  });
});

describe('V1 vs V2 Schema Differences', () => {
  describe('array constraint differences', () => {
    it('V1 should reject empty array, V2 should accept it', () => {
      const emptyInput = { skills: [] };

      // V1 rejects empty array
      expect(() => {
        SkillExpansionSchema.parse(emptyInput);
      }).toThrow('At least one skill must be provided');

      // V2 accepts empty array
      const resultV2 = SkillExpansionV2Schema.parse(emptyInput);
      expect(resultV2.skills).toEqual([]);
    });
  });

  describe('field requirement differences', () => {
    it('V1 has 2 required fields, V2 has 3 required fields', () => {
      const v1Input = {
        skills: [
          {
            skill: 'Python',
            reason: 'Test reason',
          },
        ],
      };

      // V1 accepts 2 fields
      const resultV1 = SkillExpansionSchema.parse(v1Input);
      expect(resultV1.skills[0]).toHaveProperty('skill');
      expect(resultV1.skills[0]).toHaveProperty('reason');
      expect(resultV1.skills[0]).not.toHaveProperty('learning_outcome');

      // V2 requires 3 fields
      expect(() => {
        SkillExpansionV2Schema.parse(v1Input as unknown);
      }).toThrow();
    });
  });
});
