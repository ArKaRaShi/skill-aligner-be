## Decision: Best CLO Retrieval

- **Status**: Experiment idea (not yet executed)
- **Context**: While grounding answers for the answer generator we currently fetch the top course-learning-outcome (CLO) matches per input skill from the semantic retriever.
- **Hypothesis**: Keeping only the highest-scoring CLO per course provides sufficient grounding signal while reducing the payload delivered to the LLM.

### Expected Benefits
- Lower prompt complexity and shorter context → fewer tokens and faster responses.
- Less irrelevant context → reduced hallucination risk and fewer heuristic filters/thresholds during post-processing.
- Stable best-match evidence → maintains or improves grounding quality for the answer generator.

### Validation Plan (pending)
1. Compare answer quality (precision/recall, human review) between single-best CLO and multi-CLO prompts.
2. Track token usage and latency deltas.
3. Monitor LLM failure modes (hallucinations, irrelevant citations) during pilot runs.

### Risks & Unknowns
- May exclude secondary CLOs that occasionally add useful nuance.
- Requires UX affordance for users to expand and inspect full CLO lists when needed.

### Next Step
Document when the experiment is scheduled and capture real-world results to confirm (or refute) the hypothesis.
