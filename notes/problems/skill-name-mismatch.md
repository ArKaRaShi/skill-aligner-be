## Skill-Only Embedding Mismatch

- **Context:** Retrieval still embeds queries using only the skill label. In the “European culture” experiment, this produced similarity scores between 0.78–0.88, all but a few falling below the production cutoff (0.82).
- **Problem:** Skill names by themselves miss key domain cues. Courses whose learning objectives clearly cover European cultural topics are filtered out because the query embedding lacks descriptive context.
- **Evidence:** When learning-objective text was added to the embeddings, relevant pairs scored up to 0.88. Using only the bare skill name dropped them to ~0.78–0.81, causing recall loss.
- **Example:** “european cultural studies” vs. “อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตก...” scored **0.78** with the plain skill name but **0.88** when LO text was included—illustrating recall loss tied to label-only embeddings.
- **Impact:** Users asking about nuanced domains (e.g., cultural studies) can receive empty or sparse recommendations despite relevant courses existing.
- **Next Steps:** Investigate augmenting skill embeddings with LO or enriched descriptions, and track similarity distributions before changing the production cutoff.

### Experiment Log (2025-11-01)
- **Query example:** มีวิชาที่สอนเกี่ยวกับวัฒนะธรรมยุโรปมั้ย
- **Pairs and similarities:**
  1. `european cultural studies: Explores key themes in European history, society, arts, and cultural identity.`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.81**
  2. `historical context analysis: Examines events chronologically to understand how past developments shape contemporary Europe.`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.80**
  3. `cross cultural communication: Builds practical strategies for navigating language, customs, and norms across European societies.`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.79**
  4. `european cultural studies`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.78**
  5. `สามารถเล่าและวิเคราะห์ประเด็นสำคัญของประวัติศาสตร์และสังคมยุโรปได้อย่างกระชับ`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.86**
  6. `เข้าใจความแตกต่างของวัฒนธรรมย่อยในภูมิภาคยุโรป (ตะวันตก เหนือ ตะวันออก ใต้) และนำไปอธิบายสถานการณ์ร่วมสมัยได้`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.88**
  7. `ระบุผลกระทบของศิลปะ ภาษา และค่านิยมยุโรปที่มีต่อโลกปัจจุบัน พร้อมตัวอย่างจากประเทศต่าง ๆ`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.84**
  8. `เปรียบเทียบวัฒนธรรมยุโรปกับวัฒนธรรมไทย/ภูมิภาคอื่นเพื่อพัฒนาทักษะระหว่างวัฒนธรรม (intercultural communication)`  
     vs. `อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้` → **0.84**

(*text1 treated as query; text2 as passage in the experiment*)
