## Retrieval Threshold Investigation

- **Current setting:** Retrieval discards matches with similarity below **0.82** before answer generation.
- **Observed issue:** Semantically close skills like “budgeting skills” and “budgeting techniques” surface different course sets, and several relevant items fall just under 0.82 and get filtered out.
- **Impact:** Useful budgeting content is missing from the context, weakening downstream recommendations.
- **Next steps:** Reevaluate the cutoff—either relax the threshold or introduce a smarter filter (e.g., dynamic thresholds per skill cluster). Continue logging borderline scores for manual review until the rule is revised.
