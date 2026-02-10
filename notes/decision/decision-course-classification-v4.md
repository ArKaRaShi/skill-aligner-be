## decision-course-classification-v4

### Prompt Anchors

- **Latency optimization:** Primary focus on reducing response time by eliminating reason generation
- **Output simplification:** Only included courses are output, excluded courses are omitted entirely
- **Precision filtering:** Model focuses on identifying most relevant courses without justification overhead
- **Enhanced language detection:** More specific rules for Thai/English/mixed language handling

### Key Rules Communicated

- **Selective reason generation:** Model only generates reasons for included courses
- **Include-only output:** Only courses marked as "include" appear in the response
- **No exclusion output:** Excluded courses are thought about but not included in final output
- **Maximum 5 courses per skill:** Limit remains with justification only for included courses
- **Context-based decisions:** Still requires decisions based solely on provided information
- **Improved language guidelines:** Better handling of mixed Thai/English input with specific fallback rules

### Significant Changes from v3

1. **Selective reason generation** - Reasons only for included courses, excluded courses omitted entirely
2. **Simplified decision process** - Model still evaluates all courses but only outputs included ones
3. **Output format change** - Only included courses with reasons appear in final JSON
4. **Language detection enhancement** - Added specific rules for mixed language handling

### Performance Impact

- **Latency reduction:** 10-30% improvement in response time (Quick estimate; needs validation)
- **Token usage reduction:** Eliminated reasons for excluded courses reduces output tokens
- **Processing speed:** Faster model inference due to reduced output generation requirements

### Remaining Vague Areas

- **Debugging capability:** Harder to troubleshoot excluded course decisions without visibility
- **Quality assurance:** Partial visibility into model decision-making process (only included decisions visible)
- **Mixed language handling:** Verb counting approach may still be subjective

### Pending Decisions & Follow-ups

- **Latency evaluation:** Need comprehensive performance testing to quantify actual improvements
- **User experience impact:** Assess if lack of reasons affects user trust and understanding
- **Debugging tools:** May need separate logging mechanism for internal decision tracking
- **Quality monitoring:** Implement automated checks to ensure classification quality without reasons
- **Rollback strategy:** Define criteria for reverting to v3 if quality issues arise
- **A/B testing:** Compare v3 vs v4 performance on real user queries

### Problem Solved

- **Performance bottleneck:** Addressed latency concerns by removing computationally expensive reason generation
- **Output verbosity:** Reduced response size for faster transmission and processing
- **Simplified task focus:** Model can concentrate on core classification without explanatory overhead

### Trade-offs

- **Transparency vs. Speed:** Sacrificed exclusion visibility for performance gains
- **Debugging capability:** Lost insight into exclusion reasoning process
- **User experience focus:** Excluded courses are irrelevant to user goals, so not showing them improves user experience
- **Selective transparency:** Users see relevant courses with reasons, irrelevant courses are filtered out
