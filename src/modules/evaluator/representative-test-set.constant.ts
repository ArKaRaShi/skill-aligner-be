/**
 * QUESTION_SET
 * ----------------
 * ชุดคำถามตัวอย่างสำหรับทดสอบและวิเคราะห์พฤติกรรมของ
 * exploratory course recommendation system
 *
 * PURPOSE:
 * - ใช้เป็น scenario-based test set เพื่อครอบคลุมพฤติกรรมการใช้งานที่หลากหลาย
 * - วิเคราะห์การทำงานของ pipeline ตั้งแต่
 *   skill inference → course retrieval → relevance filtering → answer synthesis
 * - ไม่ได้ใช้เป็น ground truth dataset
 * - ไม่ได้ใช้เพื่อวัดความถูกต้องเชิงสถิติ (accuracy / precision / recall)
 *
 * DESIGN RATIONALE:
 * - ปัญหานี้เป็น exploratory mapping problem:
 *   ผู้ใช้มีเป้าหมายหรือทิศทางแล้ว แต่ไม่รู้โครงสร้างรายวิชาของมหาวิทยาลัย
 * - คำถามของผู้ใช้ในโลกจริงมีความหลากหลายทางภาษา
 *   และไม่ได้ถูกตั้งในรูปแบบเชิงวิชาการ
 * - ดังนั้น test set นี้ถูกออกแบบเพื่อครอบคลุม "behavior space ของระบบ"
 *   มากกว่าการสะท้อน distribution ของผู้ใช้จริง
 *
 * QUESTION PATTERN (for explanation only, not enforcement):
 * - Pattern A: ระบุหัวข้อหรือทักษะที่สนใจอย่างชัดเจน (Direct / Explicit Concept)
 * - Pattern B: ระบุเป้าหมายหรือผลลัพธ์ที่ต้องการ แต่ยังไม่รู้เส้นทาง (Outcome / Goal-Oriented)
 * - Pattern C: มีหลายแนวคิด หรืออยู่ระหว่างการตัดสินใจ (Multi-Concept / Transition)
 *
 * IMPORTANT NOTES:
 * - Pattern เหล่านี้ใช้เพื่ออธิบายและออกแบบการทดลองเท่านั้น
 * - ไม่ได้ใช้เป็น hard classification
 * - คำถามหนึ่งสามารถเข้าข่ายได้มากกว่าหนึ่ง pattern
 * - ชุดคำถามนี้ตั้งใจให้มีทั้ง:
 *   - คำถามที่แมพตรง
 *   - คำถามที่ต้องอาศัย skill expansion
 *   - คำถามเชิงเป้าหมายระดับกว้าง
 *   เพื่อสังเกตพฤติกรรมและข้อจำกัดของระบบ
 */
export const QUESTION_SET_BEHAVIORAL = [
  /**
   * QUESTION → BEHAVIORAL PATTERN MAPPING
   * ------------------------------------
   * การจัดกลุ่มนี้มีไว้เพื่ออธิบายพฤติกรรมที่ต้องการทดสอบของระบบ
   * ไม่ใช่ intent classification และไม่ใช่ ground truth
   *
   * Pattern A: Direct / Explicit Concept
   * - มี mention ชัดเจนของทักษะหรือหัวข้อ
   *
   * Pattern B: Outcome / Goal-Oriented
   * - ระบุเป้าหมายหรือผลลัพธ์ที่ต้องการ
   * - ยังไม่รู้ว่าจะไปเรียนอะไร
   *
   * Pattern C: Multi-Concept / Transition
   * - มีมากกว่าหนึ่งแนวคิด
   * - ต้องอาศัยการแตกหลายมุม (skill expansion)
   */

  /* =========================
   * Pattern A (Direct / Explicit)
   * ========================= */

  'มีวิชาสอนการบริหารเงินตัวเองไหม', // A (topic/skill explicit)
  'มีวิชาสอนภาษาจีนมั้ย', // A
  'อยากเรียนสายโค้ด มันมีวิชาอะไรบ้าง', // A (broad but explicit domain)
  'มีวิชาที่สอนเกี่ยวกับการการทำแบรนด์ไหม', // A

  'อยากพัฒนาทักษะการวิเคราะห์งบการเงิน', // A (explicit skill)
  'มีวิชาเกี่ยวกับ OOP บ้างไหม', // A

  'การสร้างเว็บไซต์ต้องมีทักษะอะไรบ้าง', // A + B (task → skills)
  'การจะทำอาหารไทยได้ ต้องเรียนรู้อะไรบ้าง', // A + B

  // 'อยากเป็น Tiktoker มีวิชาสอนอะไรแนวนี้บ้าง', // A + B
  'อยากเป็นนักพัฒนาเกม ต้องมีทักษะอะไรบ้าง เรียนวิชาอะไรดี', // A + B

  /* =========================
   * Pattern B (Outcome / Goal-Oriented)
   * ========================= */

  'อยากพัฒนาตัวเองให้ทำงานสายเทคโนโลยีได้ ต้องมีทักษะอะไรบ้าง มีวิชาแนะนำไหม', // B
  'อยากคุยกับคนจีนได้ ต้องเรียนอะไรบ้าง', // B
  'อยากใช้ AI ในชีวิตประจำวันได้', // B
  'อยากแก้โจทย์ Leetcode ได้โหดๆ มีวิชาแนะนำป่าว', // B

  'เป็นคนชอบเขียนโค้ด ถ้าอยากต่อยอดต้องมีทักษะอะไรเพิ่ม มีวิชาแนะนำไหม', // B
  'อยากเขียนโค้ดให้เป็นระบบมากขึ้น มี structure ชัดเจนขึ้น มีวิชาแนะนำไหม', // B

  /* =========================
   * Pattern C (Multi-Concept / Transition)
   * ========================= */

  'อยากเรียนภาษาจีน หรือไม่ก็ภาษาเวียดนาม มีวิชาแนะนำไหม', // C
  'อยากลองทำ web app หรือ mobile app มีวิชาแนะนำไหม', // C

  'อยากเอา AI มาประยุกต์ใช้ในการวิเคราะห์รายงานทางการเงิน มีวิชาแนะนำไหม', // B + C

  'อยากเปิดร้านค้าออนไลน์ หรือทำเว็บไซต์ E-commerce มีวิชาอะไรแนะนำบ้าง', // B + C
  'อยากทำงานที่ผสมเทคโนโลยีกับความคิดสร้างสรรค์ แต่ไม่อยากเขียนโค้ดเยอะ ควรเรียนอะไรดี', // C

  /* =========================
   * Real-world style questions
   * (used to test robustness & exploratory behavior)
   * ========================= */
  'อยากเรียนเทค + ดนตรีผสมกัน มีวิชามั้ยอะ', // C
  // lol
  'อยากทำธุรกิจ + เทค + ดนตรี + การตลาด + AI',

  // จากอาจารย์
  'อยากเป็น tiktoker ต้องมีทักษะอะไรบ้าง', // A + B
  'อยากมีทักษะความเป็นผู้นำ มีวิชาสอนบ้างไหม', // A + B

  // จากเพื่อนๆ
  'อยากเรียนจบไปเปิดบริษัทยานยนต์', // B (large goal-level)
  'อยากประกอบคอมพิวเตอร์เป็น มีวิชาแนะนำไหม', // A + B
  'อยากทำธุจกิจ farmhub แนะนำหน่อย',
  'อยากทำธุรกิจร้านเหล้า', // 47ee7e21-bf34-4b40-85a1-4aa40a83f925
  'อยากทำธุรกิจเกี่ยวกับปศุสัตว์', // b8a854b3-d7ea-440a-b6a8-77f3b6014bb1
  'อยากทำฟาร์มหมู', // 28adf29b-f23f-4ba1-8cee-883be6f988cb
  'อยากเป็นนายก', // 4e19d7da-ea20-407c-b85c-683c8328c4e1
];

/**
 * QUESTION_SET
 * ----------------
 * ชุดคำถามตัวอย่างที่ใช้สำหรับทดสอบและวิเคราะห์ระบบ
 * exploratory course recommendation system
 *
 * วัตถุประสงค์:
 * - ใช้เป็น representative test set เพื่อครอบคลุมรูปแบบคำถามของผู้ใช้ในโลกจริง
 * - สนับสนุนการออกแบบและประเมิน pipeline (skill inference → retrieval → scoring)
 * - ไม่ได้ใช้เป็น ground truth หรือ intent label ที่ตายตัว
 *
 * แนวคิดหลัก:
 * - คำถามของผู้ใช้มีความหลากหลาย และมักไม่อยู่ในรูปแบบเดียว
 * - รูปแบบการตั้งคำถาม (question expression patterns) สามารถทับซ้อนกันได้
 *   และ "คาดหวังให้ทับซ้อน" เนื่องจากผู้ใช้ไม่ได้คิดเป็นโครงสร้างทางวิชาการ
 *
 * การแบ่ง Pattern (เชิงอธิบาย ไม่ใช่การบังคับ):
 * - Pattern A: ระบุหัวข้อหรือทักษะที่สนใจอย่างชัดเจน (Direct / Explicit Concept)
 * - Pattern B: ระบุเป้าหมายหรือผลลัพธ์ที่ต้องการ แต่ยังไม่รู้เส้นทาง (Outcome / Goal-Oriented)
 * - Pattern C: มีหลายแนวคิด หรืออยู่ระหว่างการตัดสินใจ (Multi-Concept / Transition)
 *
 * หมายเหตุสำคัญ:
 * - Pattern เหล่านี้ไม่ได้ใช้เป็น hard classification
 * - คำถามหนึ่งสามารถเข้าข่ายได้มากกว่าหนึ่ง Pattern
 * - การจัดกลุ่มนี้มีไว้เพื่อช่วย "ออกแบบการทดลองและการอธิบายระบบ"
 *   ไม่ใช่เพื่อบอกว่าผู้ใช้มี intent แบบใดแบบหนึ่งเท่านั้น
 */
export const QUESTION_SET: {
  question: string;
  refId: string;
}[] = [
  // Pattern A Direct/Explicit Concept
  // มี mention ชัดเจนเกี่ยวกับทักษะหรือหัวข้อที่ต้องการเรียนรู้

  // Topic Based
  {
    question: 'มีวิชาสอนการบริหารเงินตัวเองไหม',
    refId: '27553284-019f-4c31-8dbe-b1bfbb5cb4d5',
  },
  {
    question: 'มีวิชาที่สอนเกี่ยวกับการการทำแบรนด์ไหม',
    refId: 'a7728000-0818-42b5-a49f-c89f4ee59ab5',
  },

  // Skill Based
  {
    question: 'อยากพัฒนาทักษะการวิเคราะห์งบการเงิน',
    refId: 'a5b1ad24-9995-4257-a50d-0d8e7931fbbf',
  },
  {
    question: 'มีวิชาเกี่ยวกับ OOP บ้างไหม',
    refId: 'cd96176f-8e18-4270-9c76-8c6b1cf19594',
  },

  // Task Based
  {
    question: 'การจัดงานอีเว้นตต้องเรียนอะไรบ้าง',
    refId: 'b41c15f8-2249-4469-9981-71cc1c75b2b4',
  },
  {
    question: 'การจะทำอาหารไทยได้ ต้องเรียนรู้อะไรบ้าง',
    refId: 'dd9ce8ba-20e8-4d4d-b92b-574da63f242b',
  },

  // Role Based
  // 'อยากเป็น Tiktoker มีวิชาสอนอะไรแนวนี้บ้าง',
  {
    question: 'อยากทำ hr ต้องมีทักษะอะไรบ้าง มีวิชาอะไรเกี่ยวข้อง',
    refId: 'd70fb21b-c337-425b-8b11-3ee2018f3fc4',
  },
  {
    question: 'tiktoker ต้องเรียนอะไรบ้าง',
    refId: '4ec5b89c-e5c8-46dd-b9cb-628c749cead6',
  },
  // Pattern B Outcome/Goal-Oriented
  // มีเป้าหมายหรือผลลัพธ์ที่ต้องการเรียนรู้ แต่ไม่ได้ระบุทักษะหรือหัวข้อโดยตรง
  {
    question: 'อยากพัฒนาตัวเองให้ทำงานสายเทคโนโลยีได้',
    refId: '01c601d2-5583-4413-a5c6-5f463efd897c',
  },
  {
    question:
      'อยากใช้เครื่องมือช่วยคิด ช่วยตัดสินใจในชีวิตประจำวัน มีวิชาแนะนำบ้างมั้ย',
    refId: 'bb7d4d89-d4e7-4bb1-b04e-ddd694ba3370',
  },
  {
    question: 'อยากแก้โจทย์ Leetcode ได้โหดๆ มีวิชาแนะนำป่าว',
    refId: 'be573eca-6596-418a-888d-f4f0c0d5651d',
  },
  {
    // TODO: This question maybe direct serch can't do.
    question:
      'เป็นคนชอบเขียนโค้ด ถ้าอยากต่อยอดต้องมีทักษะอะไรเพิ่ม มีวิชาแนะนำไหม',
    refId: '1fe15613-3060-4d9e-94dc-bd9a63e9911f',
  },

  // Pattern C Multi-Concept or Transition between concepts
  {
    question:
      'อยากเรียนภาษาจีนหรือภาษาเวียดนามที่เอาไปใช้ทำธุรกิจได้ มีวิชาไหนที่ช่วยเปรียบเทียบหรือปูพื้นฐานได้บ้าง',
    refId: '5c5fb47c-66ad-4a6d-9ff3-4a082f4de746',
  },
  {
    question: 'อยากลองทำ web app หรือ mobile app มีวิชาแนะนำไหม',
    refId: 'fd7678cc-6adb-4868-95e7-4ac339ea04c3',
  },

  {
    // TODO: This question maybe direct serch can't do.
    // ลองเทีนบเอา query ไปเสิร์ชตรงๆ topN 50 โดยไม่ skill expand ดู จะไม่เจอเกี่ยวกับ AI เลย
    question:
      'อยากเอา AI มาประยุกต์ใช้ในการวิเคราะห์รายงานทางการเงิน มีวิชาแนะนำไหม',
    refId: '909fa76b-d7a7-41a2-bb83-f67f1eb7c9da',
  },
  {
    question:
      'อยากเปิดร้านค้าออนไลน์ หรือทำเว็บไซต์ E-commerce มีวิชาอะไรแนะนำบ้าง',
    refId: '654330a8-2559-4273-abb4-36db7f0b31e1',
  },

  {
    // TODO: This one can illustrate with baseline that use direct search only.
    question:
      'อยากทำงานที่ผสมเทคโนโลยีกับความคิดสร้างสรรค์ แต่ไม่อยากเขียนโค้ดเยอะ ควรเรียนอะไรดี',
    refId: 'a945dd26-d7d4-49a4-ab23-57f3f954c8a0',
  },
  {
    question: 'อยากเรียนเทค + ดนตรีผสมกัน มีวิชามั้ยอะ',
    refId: '97b42158-60af-46d3-aa60-049d1243d2ee',
  },

  // จากอาจารย์
  // high coverage case (lot of courses will have learning outcome stating leadership skill)
  // questionable case (soft skill tend to have issues)
  {
    question: 'อยากมีทักษะความเป็นผู้นำ มีวิชาสอนบ้างไหม',
    refId: '1e7e132d-31b7-49fe-91dc-c2e0358a1b24',
  },
  {
    question: 'อยากเป็น tiktoker ต้องการทักษะอะไรบ้าง มีวิชาสอนอะไรแนวนี้บ้าง',
    refId: '3ef3d308-ac42-453e-bce7-bb7376046c41',
  },
  // จากเพื่อน
  {
    question: 'แม่บอกให้เป็นทนาย ทำไงดี',
    refId: '00e399aa-cf3c-472b-b5be-9a6e86e10637',
  },
  {
    question: 'อยากประกอบคอมพิวเตอร์เป็น มีวิชาแนะนำไหม',
    refId: 'b3460fa2-c348-4748-b583-4b042886e0ca',
  },
  {
    question: 'อยากทำธุรกิจเกี่ยวกับปศุสัตว์',
    refId: 'acd5b76f-8185-4b10-bb37-bde0ac14c51a',
  },
  {
    question: 'อยากเปิดร้านเหล้า',
    refId: 'adc6cdc0-e0f6-4006-849b-1d06dff5368c',
  },
  {
    question: 'อยากเรียนวิศวปิโตเลียมที่ต่างประเทศ',
    refId: '75dd76dc-b23f-4728-b9a4-09621f52a26b',
  },
  {
    // failure case, no coverage in course data
    question: 'อยากเรียนภาษาบาลี',
    refId: 'fa617f52-c86b-4b8c-976b-bfdb073f1070',
  },
];

//

console.log(`Behavioral Question Set Size: ${QUESTION_SET_BEHAVIORAL.length}`);
console.log(
  `Question Set Size: ${QUESTION_SET.length}\n`,
  `Question Set Ids: ${QUESTION_SET.map((q) => q.refId).join(',')}`,
);

// bunx ts-node --require tsconfig-paths/register src/modules/evaluator/representative-test-set.constant.ts
