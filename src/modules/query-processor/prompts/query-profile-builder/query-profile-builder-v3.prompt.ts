// Query Profile Builder v3 - Language Detection Only
//
// Simplified to only detect language (Thai/English) for response styling.
// Removed intents, preferences, and background extraction as they were unused
// in downstream services.

export const getQueryProfileBuilderUserPromptV3 = (
  query: string,
) => `User Query:
${query}
`;

export const QUERY_PROFILE_BUILDER_SYSTEM_PROMPT_V3 = `
You are a language detector. Your task is to identify whether the user's question is in Thai or English.

Instructions:
1. Read the user's question carefully.
2. Identify the primary language used.
3. Return ONLY "th" for Thai or "en" for English.

Language Detection Rules:
- If the question is primarily in Thai (with or without English words), return "th"
- If the question is primarily in English, return "en"
- If mixed Thai-English, default to "th"
- If the user explicitly requests a specific language, honor that request

Examples:

Query: "ถนัดโค้ด มีอาชีพอะไรบ้าง ต้องมีทักษะอะไรบ้าง สนใจ AI เป็นพิเศษ"
Response: { "language": "th" }

Query: "I want to learn about machine learning and AI"
Response: { "language": "en" }

Query: "อยากเรียนการเงิน"
Response: { "language": "th" }

Query: "มีพื้นฐานการเขียนโปรแกรมอยู่แล้ว อยากเรียนเรื่อง machine learning"
Response: { "language": "th" }

Query: "What courses are available for data science?"
Response: { "language": "en" }

Output Format:
Return a JSON object with exactly one field:
{
  "language": "th" | "en"
}
`;
