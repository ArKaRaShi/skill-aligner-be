# Question Set V6 Documentation

## Overview

Question Set V6 is a comprehensive 200-question test set designed to evaluate the question classification system. This test set follows a realistic distribution pattern where most student questions are relevant to learning and skill development.

## Distribution Ratio And Rules

Total 200 questions are divided as follows:

### Language Distribution

**Thai Questions**

- Count: 147 questions
- Percentage: 73.5%

**English Questions**

- Count: 53 questions
- Percentage: 26.5%

This reflects the bilingual nature of the educational context where the system operates.

### Question Type Distribution

**Relevant Questions**

- Count: 144 questions (72%)
- Breakdown: 9 relevant question types (A-I), 4 domains, 4 paraphrases each (3 thai, 1 english)
- Language split: 108 Thai, 36 English

**Irrelevant Questions**

- Count: 36 questions (18%)
- Breakdown: 7 irrelevant question types (J-P),
  For (J-O) 4 paraphrases each (3 thai, 1 english) Total 18 Thai, 6 English
  For (P) random question generation (9 thai, 3 english) Total 9 Thai, 3 English
- Language split: 27 Thai, 9 English

**Dangerous Questions**

- Count: 20 questions (10%)
- Breakdown: use 7 relevant question types (A-I) but change the context to dangerous content, 2 paraphrases each (1 thai, 1 english) Total 7 Thai, 7 English
  For the remaining 6 questions, use free-form dangerous question generation (5 thai, 1 english) Total 5 Thai, 1 English
- Language split: 12 Thai, 8 English

This distribution reflects the assumption that most students will ask relevant questions about learning and skill development, with fewer irrelevant queries and minimal dangerous requests.

## Domain Coverage

The test set covers four diverse domains to ensure comprehensive evaluation:

### 1. Technology Domain

- Software development and programming
- Artificial intelligence and machine learning
- Cybersecurity and network infrastructure
- Cloud computing and DevOps
- Data science and analytics

### 2. Finance Domain

- Investment and portfolio management
- Financial planning and analysis
- Banking and financial services
- Accounting and auditing
- FinTech and digital banking

### 3. Language Domain

- Translation and interpretation skills
- Linguistics and language learning
- Creative writing and communication
- Technical writing and documentation

### 4. Agriculture Domain

- Farming techniques and sustainable agriculture
- Agricultural technology and automation
- Food science and safety
- Agricultural business management

## Question Categories

### Relevant Questions (144 questions)

Following the patterns from `question-accept-patterns.md`:

9 main types of relevant questions:

**A. Direct Skill Request** - Clear skill identification

- "อยากเรียนทักษะ X ควรเริ่มจากไหน?"
- "I want to develop skill X, where should I start?"

**B. Topic → Skill Mapping** - Domain-based skill extraction

- "อยากเรียนเรื่อง X ต้องมีทักษะอะไร?"
- "I'm interested in X, what skills do I need?"

**C. Task-Based Skill** - Job/task to skill mapping

- "ถ้าต้องทำ X ต้องมีทักษะอะไรบ้าง?"
- "What skills do I need to accomplish X?"

**D. Job/Role → Skill** - Career-focused questions

- "อยากเป็น X ต้องมีทักษะอะไร?"
- "I want to become an X, what skills should I develop?"

**E. Learning Outcome-Driven** - Result-oriented questions

- "อยากอ่านงบการเงินเป็น ต้องเรียนอะไร?"
- "I want to be able to do X, what courses are available?"

**F. Multi-Skill Requirement** - Combined skill questions

- "อยากพัฒนา A และ B ควรเรียนคอร์สไหนก่อน?"
- "Are there courses that teach both A and B?"

**G. Proficiency Level-Based** - Skill level questions

- "อยากเริ่มต้นจาก 0 ในทักษะ X เรียนอะไรดี?"
- "I want to advance to expert level in X, what courses are available?"

**H. Problem-Solving Skill Query** - Pain point questions

- "ทำ X ไม่เป็น ควรเสริมทักษะอะไร?"
- "I'm struggling with X, what skills should I develop?"

**I. Skill Expansion/Transition Questions** - Adding or switching skills

- "ตอนนี้เรียน X อยู่แต่อยากลองด้าน Y ด้วย มีวิชาแนะนำมั้ย"
- "I'm currently studying X but want to explore Y, any course recommendations?"
- "มีพื้นฐานด้าน X แล้ว อยากเพิ่มทักษะ Y ควรเรียนอะไรต่อ"
- "I have background in X and want to transition to Y, what skills should I develop?"
- "เรียน X มาแล้ว อยากเพิ่ม Y เข้าไปด้วย เริ่มจากคอร์สไหนดี"

### Irrelevant Questions (36 questions)

7 main types of irrelevant questions (For test classifier robustness, Other types possible. But, keep to these main 7 that should ignore clearly):

**J. Course-Specific Queries** - Questions requiring specific course knowledge

- "คอร์ส 01204591-67 สอนอะไรบ้าง?"
- "What does course XYZ cover?"

**K. Institution-Specific Queries** - University/faculty-specific questions

- "มหาลัย A มีคอร์ส X ไหม?"
- "Does University A offer course X?"

**L. Administrative/Enrollment Queries** - Registration and logistics questions

- "คอร์สนี้เปิดลงทะเบียนวันไหน?"
- "When does registration open for this course?"

**M. Skill-Free Advice Questions** - General advice without skill context

- "ควรเริ่มยังไงดีถ้าอยากพัฒนาตัวเอง?"
- "How should I start developing myself?"

**N. Non-Learning Intent** - Questions unrelated to skill development

- "พรุ่งนี้ฝนจะตกไหม?"
- "What's the weather tomorrow?"

**O. Fantasy/Imaginary Questions** - Edge cases with fictional contexts

- "อยากเป็น Harry Potter ต้องเรียนอะไร?"
- "I want to become a Jedi, what skills do I need?"

**P. Free-Form Nonsense Questions** - Random or nonsensical queries

### Dangerous Questions (20 questions)

Questions involving illegal activities, harmful content, or dangerous requests:

- Weapon creation and manufacturing
- Illegal drug production
- Hacking and cybercrime
- Document forgery
- Nudity and adult content creation
- Animal cruelty
- Terrorism and explosives

## Quality Assurance

Each question includes:

1. Clear categorization based on the acceptance patterns
2. Reasoning explaining the classification
3. Domain context for relevant questions
4. Proper language formatting (Thai/English)

## Usage

This test set is designed to:

1. Evaluate classifier accuracy across different question types
2. Test robustness against edge cases and irrelevant queries
3. Ensure proper handling of dangerous content
4. Validate multilingual processing capabilities
5. Assess domain-specific question understanding

## Paraphrase and Intent Variation Strategy

To ensure robust classifier testing, the test set includes multiple paraphrases for the same underlying intent across different categories:

### Same Intent, Different Phrasing Examples

**Direct Skill Request Paraphrases:**

- "อยากเรียนทักษะ X ควรเริ่มจากไหน?"
- "I want to develop skill X, where should I start?"
- "สนใจพัฒนาทักษะ X แนะนำคอร์สหน่อย"
- "What courses are available for learning skill X?"
- "มีคอร์สที่สอนทักษะ X ไหม?"

**Topic → Skill Mapping Paraphrases:**

- "อยากเรียนเรื่อง X ต้องมีทักษะอะไร?"
- "I'm interested in X, what skills do I need?"
- "สนใจด้าน X มีคอร์สอะไรแนะนำ?"
- "What skills are required for field X?"
- "อยากเริ่มต้นด้าน X ต้องเรียนทักษะไหนก่อน?"

**Job/Role → Skill Paraphrases:**

- "อยากเป็น X ต้องมีทักษะอะไร?"
- "I want to become an X, what skills should I develop?"
- "งานสาย X ต้องเรียนคอร์สอะไรบ้าง?"
- "What skills are needed for X career?"
- "ถ้าอยากทำงานเป็น X ควรเรียนอะไร"

### Cross-Domain Intent Testing

Each intent pattern is tested across all five domains to ensure domain-agnostic classification:

**Example: Direct Skill Request across domains**

- Technology: "อยากเรียนทักษะ Python ควรเริ่มจากไหน?"
- Finance: "I want to develop financial analysis skills, where should I start?"
- Language: "สนใจพัฒนาทักษะการแปลภาษา แนะนำคอร์สหน่อย"
- Agriculture: "What courses are available for learning sustainable farming?"
- Healthcare: "มีคอร์สที่สอนทักษะการดูแลผู้ป่วยไหม?"

**Example: Skill Expansion/Transition across domains**

- Technology: "ตอนนี้เรียนพื้นฐาน programming อยู่ อยากลองด้าน AI ด้วย มีวิชาแนะนำมั้ย"
- Finance: "I'm studying accounting but want to explore investment banking, any recommendations?"
- Language: "เรียนภาษาอังกฤษมาแล้ว อยากเพิ่มภาษาจีนเข้าไปด้วย เริ่มจากคอร์สไหนดี"
- Agriculture: "มีพื้นฐานด้านการเกษตรแบบดั้งเดิมแล้ว อยากเพิ่มทักษะ ag-tech ควรเรียนอะไรต่อ"
- Healthcare: "I have nursing background and want to transition to healthcare administration, what skills should I develop?"

### Linguistic Variation Testing

**Formal vs. Informal Language:**

- Formal: "ท่านสามารถแนะนำคอร์สเรียนสำหรับพัฒนาทักษะ X ได้ไหมครับ"
- Informal: "อยากเก่ง X ต้องเรียนอะไร"

**Direct vs. Indirect Questions:**

- Direct: "What skills do I need for data science?"
- Indirect: "I'm wondering about the skills required for data science"

**Simple vs. Complex Sentence Structure:**

- Simple: "อยากเรียน AI"
- Complex: "Given my background in programming, I'm interested in transitioning to AI and would like to know what foundational skills I should develop"

### Edge Case Paraphrases

**Fantasy Questions with Different Contexts:**

- "อยากเป็น Harry Potter ต้องเรียนเวทมนตร์อะไร"
- "I want to become a Jedi, what Force skills should I learn?"
- "ถ้าอยากเป็นนักเวทย์ต้องมีทักษะด้านไหนบ้าง"

**Ambiguous References:**

- "เรื่องนั้นเรียนยังไง" (unspecified topic)
- "I want to learn about that thing" (ambiguous reference)
- "สนใจเรื่องที่คุยไป" (referencing previous conversation)
