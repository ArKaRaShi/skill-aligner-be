type QueryProfile = {
  existing: string[];
  desired: string[];
  preferrences: string[];
};

export type RegisterTool = {
  id: string;
  name: string;
  description: string;

  inputExample?: any;
  outputExample?: any;

  hintPairing?: string[];
  dependsOn?: string[];
};

// Execution plan types for LLM dispatcher
export type ToolExecutionStep = {
  id: string;
  dependsOn: string[] | null;
};

export type ExecutionPlan = ToolExecutionStep[][];

// question: ถนัดโค้ด มีอาชีพอะไรบ้าง ต้องมีทักษะอะไรบ้าง สนใจ AI เป็นพิเศษ
const QUERY_PROFILE: QueryProfile = {
  existing: ['ถนัดโค้ด'],
  desired: ['มีอาชีพอะไรบ้าง', 'ต้องมีทักษะอะไรบ้าง'],
  preferrences: ['สนใจ AI เป็นพิเศษ'],
};

// question: อยากเรียนการเงิน
export const REGISTER_TOOL: RegisterTool[] = [
  {
    id: 'skill-inferrer-from-query',
    name: 'skill-inferrer-from-query',
    description: 'Infers skills from context',

    inputExample: {
      query: 'อยากเรียนการเงิน',
      profile: QUERY_PROFILE,
    },
    outputExample: [
      {
        skillName: 'Risk Management',
        reason:
          'การเงินเกี่ยวข้องกับการบริหารความเสี่ยง เช่น การลงทุนและการจัดการสินทรัพย์',
      },
      {
        skillName: 'Financial Analysis',
        reason:
          'การวิเคราะห์การเงินเป็นทักษะสำคัญในการทำความเข้าใจสถานะการเงินและการตัดสินใจทางธุรกิจ',
      },
    ],
  },
  {
    id: 'occupation-inferrer-from-query',
    name: 'occupation-inferrer-from-query',
    description: 'Infers occupations from skills and user preferences',
    dependsOn: ['skill-inferrer-from-query'], // Depends on skills being identified first

    inputExample: {
      query: 'ถนัดโค้ด มีอาชีพอะไรบ้าง ต้องมีทักษะอะไรบ้าง สนใจ AI เป็นพิเศษ',
      profile: QUERY_PROFILE,
    },
    outputExample: [
      {
        occupationName: 'Software Developer',
        requiredSkills: ['Programming', 'Problem Solving', 'Version Control'],
      },
      {
        occupationName: 'Data Scientist',
        requiredSkills: [
          'Statistics',
          'Machine Learning',
          'Data Visualization',
        ],
      },
    ],
  },
];
