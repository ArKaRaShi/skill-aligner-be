# Embedding Experiment – Self-Recognition Note

**Date:** 2025-11-01  

## Situation
- Attempted semantic search for courses teaching **European culture**.
- Original embeddings used only **skill names**.
- Similarity experiment results (top 8) with skill + LO descriptions showed scores ranging **0.78–0.88**.
- Current threshold in production: 0.82 → all results below cutoff, so no course returned.

## Observations
- Skill names alone sometimes miss domain-specific anchors (e.g., "European cultural studies").
- Expanding embeddings with **LO descriptions** or **enriched skill descriptions** boosted similarity scores.
- Using LO text directly seems more robust for retrieval when skill labels are too generic or sparse.

## Potential Solutions
1. Use **LO text** as embedding for semantic search.
2. Enrich skill embedding with **description context** (both skill name + description).
3. Possibly combine both approaches for higher recall while monitoring precision.
4. Track changes, keep versioned embeddings, avoid blind replacement.

## Self-Recognition / Takeaway
- Recognized the **weakness of relying solely on skill labels**.
- Boosting semantic alignment via LO text is effective but requires careful threshold management.
- Must **record experiments, monitor thresholds**, and validate before updating production embeddings.

# Semantic Search Experiment Log

**Date:** 2025-11-01  
**Question Example:** มีวิชาที่สอนเกี่ยวกับวัฒนะธรรมยุโรปมั้ย  

## Pairs and Similarities

1. **text1:** european cultural studies: Explores key themes in European history, society, arts, and cultural identity.  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.81  

2. **text1:** historical context analysis: Examines events chronologically to understand how past developments shape contemporary Europe.  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.80  

3. **text1:** cross cultural communication: Builds practical strategies for navigating language, customs, and norms across European societies.  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.79  

4. **text1:** european cultural studies  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.78  

5. **text1:** สามารถเล่าและวิเคราะห์ประเด็นสำคัญของประวัติศาสตร์และสังคมยุโรปได้อย่างกระชับ  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.86  

6. **text1:** เข้าใจความแตกต่างของวัฒนธรรมย่อยในภูมิภาคยุโรป (ตะวันตก เหนือ ตะวันออก ใต้) และนำไปอธิบายสถานการณ์ร่วมสมัยได้  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.88  

7. **text1:** ระบุผลกระทบของศิลปะ ภาษา และค่านิยมยุโรปที่มีต่อโลกปัจจุบัน พร้อมตัวอย่างจากประเทศต่าง ๆ  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.84  

8. **text1:** เปรียบเทียบวัฒนธรรมยุโรปกับวัฒนธรรมไทย/ภูมิภาคอื่นเพื่อพัฒนาทักษะระหว่างวัฒนธรรม (intercultural communication)  
   **text2:** อธิบายประเด็นสำคัญเกี่ยวกับวิถีชีวิตสมัยใหม่ในยุโรปตะวันตกในแง่มุมต่าง ๆ ที่หลักสูตรกำหนดได้  
   **similarity:** 0.84  

## Notes
text1 use as query
text2 use as passage