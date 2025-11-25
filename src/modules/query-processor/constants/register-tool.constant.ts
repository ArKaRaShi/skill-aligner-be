import { QueryProfile } from '../types/query-profile.type';
import { RegisterTool } from '../types/register-tool.type';

// question: ถนัดโค้ด มีอาชีพอะไรบ้าง ต้องมีทักษะอะไรบ้าง สนใจ AI เป็นพิเศษ
const QUERY_PROFILE: QueryProfile = {
  background: [{ original: 'ถนัดโค้ด', augmented: 'coding' }],
  intents: [
    { original: 'มีอาชีพอะไรบ้าง', augmented: 'ask-occupation' },
    { original: 'ต้องมีทักษะอะไรบ้าง', augmented: 'ask-skills' },
  ],
  preferences: [{ original: 'สนใจ AI เป็นพิเศษ', augmented: 'AI' }],
  language: 'th',
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
    // dependsOn: ['skill-inferrer-from-query'], // Depends on skills being identified first

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
