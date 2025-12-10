# Question Classification Guidelines

This document outlines the question types that are accepted and not accepted by the CareerSkillAligner system's question classifier.

## System Architecture Overview

The CareerSkillAligner system is a **course recommendation engine** that uses RAG (Retrieval-Augmented Generation) architecture. It's important to understand that:

1. **Primary Function**: The system recommends courses based on learning outcomes that match user queries
2. **Data Source**: It searches through course names and learning outcomes from the database
3. **Limitation**: It does not provide general knowledge answers, career advice, or conceptual explanations
4. **Output**: The main output is a list of relevant courses with some synthesized context

The system is designed to answer "What courses should I take to learn X?" rather than "What is X?" or "How do I become Y?"

## Classification Categories

The system classifies questions into four main categories:

1. **relevant** - Accepted questions
2. **irrelevant** - Not accepted (safe but unrelated)
3. **dangerous** - Not accepted (harmful content)
4. **unclear** - Not accepted (insufficient context)

## Accepted Question Types (Relevant)

### Effective Course-Related Questions

These questions work well with the system because they can be answered by recommending relevant courses:

- Direct requests for courses on specific topics
- Questions about learning particular skills
- Inquiries about subject availability

**Examples:**

- "อยากเรียน Python มีคอร์สไหนบ้าง" (I want to learn Python, what courses are available?)
- "สอนเกี่ยวกับการวิเคราะห์ข้อมูล" (Teach about data analysis)
- "มีคอร์ส AI ไหม" (Are there AI courses?)
- "อยากเก่งการเงิน" (I want to be good at finance)
- "สนใจเรียนเขียนเว็บ" (Interested in learning web development)

### Career Development Questions (Limited Effectiveness)

These questions may receive partial answers if relevant courses exist, but the system cannot provide comprehensive career guidance:

- Questions about career advancement and professional growth
- Inquiries about job-related skills and requirements
- Questions about transitioning to new roles or industries

**Examples:**

- "อยากเป็นนักพัฒนาเว็บ ต้องเริ่มเรียนอะไร" (I want to be a web developer, what should I start learning?)
- "ทำยังไงถึงได้งาน Data Science" (How can I get a Data Science job?)
- "อยากเป็นผู้จัดการการตลาด ต้องมี skill อะไรบ้าง" (I want to be a marketing manager, what skills do I need?)

**Note**: These questions will only receive course recommendations, not comprehensive career advice.

### Skills Development Questions

- Questions about acquiring new skills or improving existing ones
- Inquiries about specific technical or professional skills
- Questions about skill progression strategies

**Examples:**

- "อยากเก่งการเงินเบื้องต้น เริ่มตรงไหนดี" (I want to be good at basic finance, where should I start?)
- "ฝึกเขียน Python สำหรับทำเว็บเริ่มยังไงดี" (How should I start practicing Python for web development?)
- "อยากทำกราฟิกแบบมืออาชีพใน Photoshop" (I want to do professional graphics in Photoshop)

### Learning Goals Questions

- Questions about educational paths and learning strategies
- Inquiries about specific fields or topics of study
- Questions about learning methodologies and approaches

**Examples:**

- "อยากเรียนเกี่ยวกับการเงิน" (I want to learn about finance)
- "สนใจทำโมเดล AI ง่าย ๆ เริ่มตรงไหนดี" (I'm interested in making simple AI models, where should I start?)
- "เรียน Excel ให้วิเคราะห์ข้อมูลเก่ง ๆ ต้องทำยังไง" (How can I learn Excel to be good at data analysis?)

### Topic/Concept Inquiries (Limited Effectiveness)

These questions are generally ineffective because they require explanations rather than course recommendations:

- Questions about specific professional topics or concepts
- Inquiries about technologies, methodologies, or frameworks
- Questions about industry-specific knowledge

**Examples:**

- "AI คืออะไร ใช้งานยังไง" (What is AI and how is it used?)
- "React กับ Vue ต่างกันยังไงอะ" (How are React and Vue different?)
- "Blockchain มันปลอดภัยจริงไหม" (Is Blockchain really secure?)

**Note**: These questions will likely receive irrelevant classifications or course recommendations that don't directly answer the conceptual question.

## Not Accepted Question Types

### Irrelevant Questions

These are safe but not directly related to career, skills development, or learning goals:

- General knowledge questions unrelated to professional development
- Personal advice questions not tied to career growth
- Casual inquiries about learning logistics without specific goals

**Examples:**

- "เรียนออนไลน์ได้ไหมจะสะดวกกว่า" (Is online learning more convenient?)
- "เรียนแล้วจะได้อะไรจริง ๆ" (What do you really get from studying?)
- "คอร์สนี้มันยากไหมอะ" (Is this course difficult?)

### Dangerous Questions

These contain harmful, illegal, violent, sexual/NSFW, or otherwise sensitive content:

**Examples:**

- "วิธีการผลิตยาเสพติดที่ดีที่สุด" (The best way to produce drugs)
- "อยากลองวางระเบิด แต่ไม่รู้จะเริ่มยังไง" (I want to try setting off bombs but don't know how to start)
- "แฮกเฟซเพื่อนได้ไหม" (Can I hack a friend's Facebook?)

### Unclear Questions

These are vague, too short, or lack enough context to determine intent:

- One or two-word questions
- Questions without specific topics or goals
- Ambiguous inquiries that could relate to multiple domains

**Examples:**

- "ขอวิชา" (Request a subject)
- "สอนหน่อย" (Teach me a bit)
- "มีอะไร" (What do you have?)

## Key Requirements for Relevant Questions

To be classified as relevant, questions must:

1. **Relate to career, skills development, or learning goals**
2. **Contain at least one specific area, field, or topic**
3. **Provide sufficient context to understand the user's intent**
4. **Focus on professional or educational development**

## Edge Cases and Boundary Conditions

### Borderline Questions

Some questions may fall into gray areas that require careful consideration:

#### Personal Interest with Professional Potential

- **Question**: "สนใจเรียนเกี่ยวกับดนตรีคลาสสิก" (Interested in learning about classical music)
- **Classification**: Usually **irrelevant** unless tied to a career goal like music production or education
- **Guideline**: Personal hobbies without professional context are typically irrelevant

#### General Skills with Professional Applications

- **Question**: "อยากเรียนเขียนแบบสวยๆ" (I want to learn to write beautifully)
- **Classification**: **unclear** without context
- **Guideline**: Requires clarification about whether this relates to professional writing, calligraphy, etc.

#### Academic vs. Professional Focus

- **Question**: "อยากเรียนต่อปริญญาโทด้านฟิสิกส์" (I want to study for a master's degree in physics)
- **Classification**: **relevant** if tied to career goals, **irrelevant** if purely academic interest
- **Guideline**: Look for indicators of professional intent

### Language Considerations

- Questions in Thai and English are both supported
- Mixed-language questions should be evaluated based on content, not language
- Translation nuances may affect classification accuracy

### Context-Dependent Classifications

The same question might be classified differently based on additional context:

- **Without context**: "สอน Python หน่อย" (Teach me some Python) → **unclear**
- **With context**: "สอน Python สำหรับทำงาน Data Science" (Teach me Python for Data Science work) → **relevant**

### System Limitations

- The classifier cannot interpret sarcasm or humor reliably
- Cultural references may be misunderstood without proper context
- Very technical jargon might be misclassified if the classifier lacks domain knowledge

## System Limitations

### What the System Cannot Do Well

1. **General Knowledge Q&A**: Cannot explain concepts, technologies, or theories
2. **Career Advice**: Cannot provide comprehensive career guidance or job search strategies
3. **Comparisons**: Cannot compare different technologies, methodologies, or approaches
4. **Personal Advice**: Cannot give opinions on learning methods, study techniques, or personal decisions
5. **Current Events**: Cannot answer questions about recent developments or trends

### What the System Does Well

1. **Course Recommendations**: Finds relevant courses based on learning outcomes
2. **Skill Matching**: Matches user interests to available course content
3. **Topic Discovery**: Helps users discover courses related to their interests
4. **Learning Path Suggestions**: Suggests courses that build specific skills

## Classification Process

The system follows this process:

1. Analyze the question for relevance to career/skills/learning
2. Check for harmful or inappropriate content
3. Evaluate if the question has sufficient context
4. Classify according to the guidelines above
5. Provide a brief reasoning for the classification
6. For relevant questions: Extract skills, search for matching courses, and return recommendations

## Note on Version Differences

The system has evolved from V1 to V2 classification:

- **V1**: Used "out_of_scope" for safe but unrelated questions
- **V2**: Uses "irrelevant" for safe but unrelated questions

Both versions maintain the same core acceptance criteria for relevant questions related to career development, skills acquisition, and learning goals.
