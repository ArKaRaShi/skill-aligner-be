Big Picture: Question Types in Your System

1. Skill-focused questions (learning/improving skills)
   • Goal: Understand what the student wants to learn or improve.
   • Subgroups / Examples:
   1. Explicit skill request – "ฉันอยากเรียนการเขียนโปรแกรม" → Suggest skills and related courses.
   2. Background-informed skill suggestion – "ฉันถนัดโค้ด อยากเรียนเรื่อง AI" → Use existing skills to recommend next skills.
   3. Open-ended skill exploration – "อยากเก่งการเงิน" → Broad skill recommendations.
      • Downstream impact: Calls skill inference module → links to course retrieval.

⸻

2. Occupation-focused questions (career planning / skill-to-job mapping)
   • Goal: Help students understand what career paths are possible.
   • Subgroups / Examples:
   1. Direct occupation query – "ถนัดโค้ด มีอาชีพอะไรบ้าง" → List careers.
   2. Skill-to-occupation mapping – "ฉันชอบวิเคราะห์ข้อมูล จะทำงานอะไรได้บ้าง" → Infer skills → map to jobs.
   3. Combination / multi-factor query – "สนใจ AI และถนัดคณิตศาสตร์ มีอาชีพอะไรเหมาะ" → Multiple filters.
      • Downstream impact: Calls occupation inference module → may also link to skill inference to suggest preparatory learning.

⸻

3. Course-focused questions (learning path / concrete recommendations) [IMPLICIT]
   • Note: Course retrieval is attached to ALL question types, not just explicit course queries
   • Subgroups / Examples:
   1. Skill-to-course mapping – "อยากเรียนการเงิน มีคอร์สไหนบ้าง" → Return courses that teach the skill.
   2. Occupation-to-course mapping – "อยากเป็น Data Scientist ต้องเรียนคอร์สอะไร" → Career → skills → courses.
   3. Preference-constrained courses – "อยากเรียนออนไลน์/เน้นปฏิบัติ" → Filter by format or domain.
      • Downstream impact: Course retrieval module is called for ALL question types

⸻

4. Combined / Exploratory questions
   • Mix of background, preference, skill, and occupation.
   • Examples:
   • "ฉันชอบเขียนโค้ด สนใจ AI อยากรู้ว่าเรียนอะไรดี มีอาชีพอะไรบ้าง"
   • "อยากเก่งธุรกิจ แต่ไม่รู้ว่าควรเริ่มจากอะไร"
   • Requires: Split input → call skill infer, occupation infer, course retrieve → aggregate results.

⸻

5. Edge / Out-of-scope
   • Questions outside your course catalog or domain.
   • Example: "ฉันอยากเป็นนักบินอวกาศ มีคอร์สที่มหาวิทยาลัยไหน?"
   • Handling: fallback + logging.
