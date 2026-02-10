## Decision: Best CLO Retrieval Strategy

- **Status**: Experiment idea (not yet executed)
- **Context**: While grounding answers for the answer generator we currently fetch the top course-learning-outcome (CLO) matches per input skill from the semantic retriever.
- **Hypothesis**: Keeping only the highest-scoring CLO per course provides sufficient grounding signal while reducing the payload delivered to the LLM.

### Expected Benefits
- Lower prompt complexity and shorter context → fewer tokens and faster responses.
- Less irrelevant context → reduced hallucination risk and fewer heuristic filters/thresholds during post-processing.
- Stable best-match evidence → maintains or improves grounding quality for the answer generator.

### Validation Plan (pending)
1. Compare answer quality (precision/recall, human review) between two prompt setups. Both start with the same retrieval step; the difference is how many CLOs per course we pass downstream:
   - **Variant A (single-best CLO):**
     ```
     Skill Summary:
     - financial analysis: Course [1] (การเงินเบื้องต้น)
     - investment strategies: Course [2] (การเงินระหว่างประเทศ)

     Course Details:
     Course [1]: การเงินเบื้องต้น
       Supports Skills: financial analysis
       Learning Objectives:
         1. เข้าใจพื้นฐานการจัดการการเงินส่วนบุคคล

     Course [2]: การเงินระหว่างประเทศ
       Supports Skills: investment strategies
       Learning Objectives:
         1. เข้าใจหลักการทางการเงินระหว่างประเทศ
     ```
   - **Variant B (multi-CLO):**
     ```
     Skill Summary:
     - financial analysis: Course [1] (การเงินเบื้องต้น)
     - investment strategies: Course [1] (การเงินเบื้องต้น), Course [2] (การเงินระหว่างประเทศ)

     Course Details:
     Course [1]: การเงินเบื้องต้น
       Supports Skills: financial analysis, investment strategies
       Learning Objectives:
         1. เข้าใจพื้นฐานการจัดการการเงินส่วนบุคคล
         2. ประเมินความเสี่ยงและผลตอบแทนเบื้องต้นสำหรับการลงทุน
         3. สร้างงบประมาณการออมและการลงทุนระยะยาว

     Course [2]: การเงินระหว่างประเทศ
       Supports Skills: investment strategies
       Learning Objectives:
         1. เข้าใจหลักการทางการเงินระหว่างประเทศ
         2. วิเคราะห์ผลกระทบของอัตราแลกเปลี่ยนต่อการลงทุน
         3. เปรียบเทียบกลยุทธ์การลงทุนระหว่างประเทศต่าง ๆ
     ```
2. Track token usage and latency deltas.
3. Monitor LLM failure modes (hallucinations, irrelevant citations) during pilot runs.

### Risks & Unknowns
- May exclude secondary CLOs that occasionally add useful nuance.
- Requires UX affordance for users to expand and inspect full CLO lists when needed.

### Next Step
Document when the experiment is scheduled and capture real-world results to confirm (or refute) the hypothesis.
