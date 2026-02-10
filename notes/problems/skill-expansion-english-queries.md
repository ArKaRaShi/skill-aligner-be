## Skill Expansion Problem: English Query Inference Failure

### Problem Description

The skill expansion service fails to properly infer relevant skills from simple English queries while successfully handling equivalent Thai queries.

### Examples of Failure

**Working Thai Query:**

```
Question: "อยากเรียนการลงทุนหุ้น"
Response: {
  "skills": [
    {
      "skill": "investment fundamentals",
      "reason": "Learner asked for core investing concepts."
    },
    {
      "skill": "equity analysis",
      "reason": "Stock evaluation skills support informed decisions."
    },
    {
      "skill": "portfolio diversification",
      "reason": "Mitigates risk when building investment strategies."
    }
  ]
}
```

**Failing English Query:**

```
Question: "Want to learn about stock investment"
Response: {
  "skills": []
}
```

### Future Investigation Needed

- **Root Cause Analysis**: Investigate why Thai queries work better than English for skill inference
- **Prompt Optimization**: Test different prompt structures and examples for English query handling
- **Performance Metrics**: Measure success rates across different query types and languages
- **A/B Testing**: Compare different prompt variations to identify optimal approach for English queries
