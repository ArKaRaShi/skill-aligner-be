# Question Accept Patterns

**Important Context**: The system has skills, course names, and learning outcomes for courses that can be recommended to users based on their learning needs. Questions that this context cannot provide will be classified as irrelevant.
**Limitation-1**: The question must can extracts skills because skills act as the bridge between user learning intent and course recommendations. So, questions that do not allow skill extraction cannot be classified as relevant.
**Limitation-2**: The question ask like course comparison, or name, code or thing
specific about course, faculty, university cannot be classified as relevant.

## A. Direct Skill Request (ชี้ทักษะตรงๆ)

**Description:** ผู้ใช้ระบุ skill ชัดเจน → extract ง่ายที่สุด

**Examples:**

1. "อยากเรียนทักษะ X ควรเริ่มจากไหน?"
2. "อยากพัฒนาทักษะ X แนะนำคอร์สให้หน่อย"
3. "มีคอร์สที่สอนทักษะ X ไหม?"
4. "อยากเก่ง X ต้องเรียนอะไร?"

**Note:** Category นี้ = gold standard ของระบบ เพราะ skill โผล่ในคำถามเลย

---

## B. Topic → Skill Mapping (ระบุหัวข้องาน/โดเมนที่ map เป็น skill)

**Description:** ผู้ใช้ไม่ได้พูดคำว่า skill แต่พาดพิงถึง "หัวข้อที่รู้จักและ map เป็น skill ได้"

**Examples:**

5. "อยากเรียนเรื่อง X ต้องมีทักษะอะไร?"
6. "อยากเข้าใจหัวข้อ X เริ่มจากคอร์สอะไรดี?"
7. "อยากเริ่มต้นด้าน X ต้องเรียนทักษะไหนก่อน?"
8. "สนใจด้าน X มีคอร์สอะไรแนะนำ?"

**Examples:** "AI", "Data Analytics", "Budgeting", "Cloud" → map skill domain ได้

---

## C. Task-Based Skill (ระบุงานให้ทำ → สกัด skill ที่ต้องใช้)

**Description:** ผู้ใช้บอกสิ่งที่อยากทำ → ระบบแปลงเป็น "skills required"

**Examples:**

9. "ถ้าต้องทำ X ต้องมีทักษะอะไรบ้าง?"
10. "อยากทำโปรเจ็กต์แบบ X ควรเรียนอะไร?"
11. "ถ้าฉันต้องสร้าง X ต้องมีทักษะอะไร?"
12. "อยากทำงานสาย X ต้องอัปสกิลด้านไหน?"

**Examples:** "ทำ chatbot", "วิเคราะห์ข้อมูล", "สร้างระบบ backend"

---

## D. Job / Role → Skill (ระบุอาชีพ)

**Description:** คำถามพวกนี้เพื่อ map job → required skills

**Examples:**

13. "อยากเป็น X ต้องมีทักษะอะไร?"
14. "งานสาย X ต้องเรียนคอร์สอะไรบ้าง?"
15. "ถ้าอยากเปลี่ยนงานเป็น X ควรพัฒนาทักษะไหนก่อน?"

**Examples:** "Data Scientist", "Cloud Engineer", "AI Engineer"

---

## E. Learning Outcome–Driven (ถามแบบอยากได้ผลลัพธ์เชิง skill)

**Description:** ระบุ "สิ่งที่อยากทำได้" → map skill ได้

**Examples:**

16. "อยากอ่านงบการเงินเป็น ต้องเรียนอะไร?"
17. "อยากตีความข้อมูลให้เป็น ต้องพัฒนาทักษะอะไร?"
18. "อยากสามารถสร้าง X ได้ มีคอร์สไหน?"

**Note:** เน้น action: analyze, design, implement, evaluate, etc.

---

## F. Multi-Skill Requirement (ถามแบบรวมหลายทักษะ)

**Description:** ผู้ใช้ระบุหลาย skill → map ได้ตั้งแต่สองตัวขึ้นไป

**Examples:** 21. "อยากพัฒนา A และ B ควรเรียนคอร์สไหนก่อน?" 22. "มีคอร์สที่สอนทักษะทั้ง A, B, C ไหม?"

**Note:** classifier ต้อง handle multi-label

---

## G. Proficiency Level–Based (ระดับความสามารถ)

**Description:** ยังคง extract skill ได้ เพราะระบุ domain

**Examples:** 23. "อยากเริ่มต้นจาก 0 ในทักษะ X เรียนอะไรดี?" 24. "อยากต่อยอดระดับ advanced ใน X มีคอร์สไหม?"

---

## H. Problem-Solving Skill Query (ถามจาก pain point)

**Description:** ผู้ใช้พูดปัญหา → skill ตรงกับ problem domain

**Examples:** 25. "ทำ X ไม่เป็น ควรเสริมทักษะอะไร?" 26. "สับสนเรื่อง X ต้องเรียนคอร์สไหนเพื่อแก้?"

**Examples:** "วิเคราะห์ข้อมูลไม่เป็น"

## I. Course-Specific Queries (ผูกกับคอร์สโดยตรง)

**Description:** คำถามที่ต้องรู้จักชื่อคอร์ส รายวิชา โค้ดคอร์ส หรือข้อมูลเฉพาะรายวิชา

**Examples:**

1. "คอร์ส 01204591-67 สอนอะไรบ้าง?"
2. "คอร์ส 01204591-67 ดีไหม?"
3. "รหัสวิชา 01204591-67 เปิดสอนเทอมนี้ไหม?"
4. "คอร์ส Deep Learning ตัวนี้ดีไหม?"

**Why Irrelevant:** ระบบไม่รู้จักคอร์สเฉพาะ → extract skill ไม่ได้ → invalid ตาม Limitation-2

---

## J. Institution-Specific Queries (ผูกกับมหาลัย/คณะ/ภาควิชา)

**Description:** คำถามที่ต้องรู้ context ของมหาวิทยาลัย หรือข้อกำหนดเฉพาะแวดวงมหาลัย

**Examples:**

5. "มหาลัย A มีคอร์ส Budgeting ไหม?"
6. "ภาควิชา B มีเปิดคลาสนี้ไหม?"
7. "ถ้าเรียนสาขานี้ต้องลงวิชาไหนก่อน?"
8. "คณะแพทย์ของ ม. C มีสอน Data Analytics ไหม?"

**Why Irrelevant:** เกี่ยวข้องกับโครงสร้างหลักสูตรเฉพาะ → skill extraction เป็นไปไม่ได้

---

## K. Administrative / Enrollment Queries (ถามข้อมูลเชิงธุรการ)

**Description:** คำถามที่ไม่เกี่ยวกับทักษะ แต่เกี่ยวกับการลงทะเบียน เวลาเรียน ผู้สอน หรือระบบเก็บเงิน

**Examples:**

9. "คอร์สนี้เปิดลงทะเบียนวันไหน?"
10. "คอร์สนี้ราคาเท่าไหร่?"
11. "สอนโดยใคร?"
12. "มีรอบเรียนวันเสาร์ไหม?"
13. "คอร์สนี้เรียนกี่ชั่วโมง?"

**Why Irrelevant:** ไม่มี skill extraction → ไม่โยงคอร์สโดยผลลัพธ์ทักษะ → ระบบตอบไม่ได้ตาม design

---

## M. Skill-Free Advice Questions (ไม่พูดสกิล ไม่พูดงาน ไม่พูดโดเมน)

**Description:** คำถามขอคำแนะนำทั่วไปที่ไม่โยงไป learning skill set เลย

**Examples:**

5. "ควรเริ่มยังไงดีถ้าอยากพัฒนาตัวเอง?"
6. "ชีวิตควรวางแผนยังไงดี?"
7. "อยากเก่งขึ้นต้องทำไง?" (ไม่ระบุ domain → extract ไม่ได้)
8. "ควรเรียนอะไรดี?" (กว้างจนไม่มีสกิลให้จับ)

**Why Irrelevant:** ไม่มี identifiable skill → ระบบ recommend คอร์สไม่ได้

---

## N. Non-Learning Intent (คำถามที่ไม่เกี่ยวกับทักษะหรือการเรียนเลย)

**Description:** ถามเรื่องทั่วไปที่ไม่กระทบ skill development

**Examples:**

9. "พรุ่งนี้ฝนจะตกไหม?"
10. "งบประมาณกรมนี้ถูกจัดสรรยังไง?" (ไม่ใช่ skill demand)
11. "ช่วยสรุปข่าวนี้ให้หน่อย"
12. "ช่วยแก้โจทย์คณิตนี้ให้ที" (ไม่ใช่การถามเพื่อเรียน skill)

**Why Irrelevant:** มันขาด "learning need → skill → course" chain ทั้งเส้น
