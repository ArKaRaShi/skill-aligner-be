# Question Classification Guidelines

## System Overview

This system is a course recommendation engine that suggests courses based on skills and learning outcomes. The system answers "What skills/courses do I need?" rather than providing general knowledge or career advice.

## Core Classification Criteria

Questions are evaluated based on three essential criteria:

### 1. Skill Extractability

The question must contain domains, areas, or occupations that can be mapped to specific skills:

- **Explicit**: "What skills do I need for data science?"
- **Implicit**: "I want to be a web developer" → requires web development skills
- **Domain-based**: "Finance careers" → requires financial analysis, accounting skills

### 2. Recommendation Intent

The question must explicitly or implicitly ask about required skills or courses:

- **Direct questions**: "ต้องมีทักษะอะไรบ้าง" (What skills are needed?)
- **Indirect requests**: "อยากเป็นนักพัฒนาเว็บ" (I want to be a web developer)
- **Course inquiries**: "มีวิชาอะไรแนะนำบ้าง" (What subjects do you recommend?)

### 3. Recommendation Satisfaction

Skills and course recommendations must reasonably satisfy the user's question:

- **Good fit**: "Python for data analysis" → Python programming, data analysis courses
- **Poor fit**: "What is AI?" → Cannot be satisfied with course recommendations alone
- **Partial fit**: "How to get a data science job?" → Can provide skills, but not complete career guidance

## Classification Categories

### Relevant (Accepted)

Questions that meet all three core criteria:

**Examples:**

- "อยากเรียน Python มีคอร์สไหนบ้าง" (I want to learn Python, what courses are available?)
- "อยากเป็นนักพัฒนาเว็บ ต้องเริ่มเรียนอะไร" (I want to be a web developer, what should I start learning?)
- "สนใจด้านการเงิน ต้องมีทักษะอะไรบ้าง" (Interested in finance, what skills are needed?)
- "อยากเก่งการวิเคราะห์ข้อมูล" (I want to be good at data analysis)

### Irrelevant (Not Accepted)

Safe questions that don't meet the core criteria:

**Examples:**

- "AI คืออะไร" (What is AI?) - Asks for explanation, not skills
- "เรียนออนไลน์สะดวกกว่าไหม" (Is online learning more convenient?) - No skill extraction
- "React กับ Vue ต่างกันยังไง" (How are React and Vue different?) - Comparison question

### Dangerous (Not Accepted)

Questions containing harmful, illegal, or inappropriate content.

### Unclear (Not Accepted)

Questions lacking sufficient context or specificity:

**Examples:**

- "สอนหน่อย" (Teach me a bit)
- "มีอะไร" (What do you have?)
- "ขอวิชา" (Request a subject)

## Decision Process

1. **Extract Skills**: Identify domains, areas, occupations that map to skills
2. **Check Intent**: Determine if question asks for skills/courses (explicitly or implicitly)
3. **Evaluate Fit**: Assess if recommendations can satisfy the question
4. **Classify**: Apply categories based on the three criteria

## Key Guidelines

- **Career-focused questions** are relevant if skills can be extracted and recommendations provided
- **"How to" questions** are relevant only if they lead to skill/course recommendations
- **"What is" questions** are generally irrelevant unless they imply skill development needs
- **Comparison questions** are typically irrelevant as they require explanations, not recommendations
- **Personal hobby questions** are relevant when they have extractable skills and courses can support them

## System Limitations

The system:

- ✅ Recommends courses based on learning outcomes
- ✅ Matches user interests to available course content
- ❌ Cannot provide general knowledge explanations
- ❌ Cannot give comprehensive career advice
- ❌ Cannot compare technologies or methodologies
