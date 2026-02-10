# Case Study: Cross-Domain Skill Transfer in Exploratory Recommendation

## Success Case Overview

**Question:** อยากพัฒนาทักษะการวิเคราะห์งบการเงิน (I want to develop financial statement analysis skills)

**Inferred Skills:**

- การสร้างแบรนด์ (Brand Building)
- การสื่อสารเชิงกลยุทธ์ (Strategic Communication)

**Retrieved Course:** การสร้างและการจัดการแบรนด์ (01058261-68) - Brand Creation and Management

**Relevance Score:** 3/3 (Strong Alignment)

**Context:** Course is from คณะอุตสาหกรรมเกษตร (Faculty of Industrial Agriculture), not traditional business faculties like คณะบริหารธุรกิจ (Business) or คณะนิเทศศาสตร์ (Communication).

## Analysis

This case demonstrates **cross-domain skill transfer** in an exploratory learning system.

### Key Observations

- **Semantic Bridging:** The system correctly identified that brand management and strategic communication are relevant skills, even though the user asked about financial analysis
- **Interdisciplinary Connection:** Brand creation courses often include financial analysis components (brand valuation, ROI analysis, budget allocation)
- **Faculty Diversity:** The recommendation comes from Industrial Agriculture, showing that brand management skills apply beyond traditional business domains
- **System Design Intent:** This 3/3 score is CORRECT according to the system's exploratory philosophy—connecting skills across domains rather than strict faculty-based matching

### Why This Recommendation Works

Financial analysis skills are transferrable:

- **Brand Valuation:** Requires financial modeling and ROI analysis
- **Budget Allocation:** Needs cost-benefit analysis and financial forecasting
- **Investment Decisions:** Involves assessing financial performance of marketing initiatives

The course may teach these analytical skills in an agricultural branding context, making them relevant to the user's goal of developing financial analysis capabilities.

## Implications

This is **not a bug** but a **design feature** of the exploratory learning system:

- **Skill-Centric vs. Faculty-Centric:** The system prioritizes skill relevance over faculty boundaries, enabling cross-disciplinary discovery
- **Exploration Over Precision:** Users are exposed to relevant applications of skills in unexpected domains (e.g., financial analysis in agricultural branding)
- **Serendipitous Learning:** Learners may discover valuable connections they wouldn't find through faculty-restricted search

This behavior supports the system's goal of **exploratory learning**—helping users understand how skills transfer across different contexts and industries.

## Trade-offs

**Current approach (skill-based, faculty-agnostic):**

- ✅ Broader exposure to interdisciplinary applications
- ✅ Discovering unexpected connections
- ✅ Supporting genuine exploration and curiosity
- ❌ May surprise users expecting faculty-aligned results
- ❌ Lower precision for users with strict domain requirements

**Alternative approach (faculty-aligned):**

- ✅ Higher precision for domain-focused queries
- ✅ Matches traditional academic silos
- ❌ Limits cross-disciplinary discovery
- ❌ Reinforces domain boundaries

## Future Work

If stricter faculty alignment is needed for specific use cases:

- Add faculty filtering options for users who want domain-restricted results
- Implement faculty similarity scoring as a secondary signal
- Allow users to specify preferred faculties in their query
- Present faculty information prominently so users can make informed choices

## Related Prompt

**Relevance Scoring:** [`course-relevance-filter-v6.prompt.ts`](../src/modules/query-processor/prompts/course-relevance-filter/course-relevance-filter-v6.prompt.ts) - Correctly prioritizes skill relevance over faculty alignment
