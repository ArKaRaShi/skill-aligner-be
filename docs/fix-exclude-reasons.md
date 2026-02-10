# Fix for Generic Exclude Reasons in Answer Generation

## Problem Analysis

The original system was generating generic, unhelpful exclude reasons like "ไม่เกี่ยวข้องกับการลงทุนโดยตรง" (not directly related to investment) for all excluded courses, regardless of their actual content or relevance.

### Root Causes Identified

1. **Overly Restrictive Decision Criteria**: The prompt required "explicit advancement" of user interests, creating unrealistic standards
2. **Template-Based Examples**: The example in the prompt reinforced generic exclusion patterns
3. **Insufficient Reason Guidance**: No specific guidance on what constitutes meaningful vs. generic reasons
4. **Schema Validation Pressure**: Mandatory reason fields incentivized any text over meaningful analysis
5. **Service-Level Reinforcement**: Automated keyword-based filtering reinforced generic responses

## Solution Implemented

### 1. Created Improved Prompt (v4)

**File**: [`src/modules/query-processor/prompts/answer-generator/generate-answer-v4.prompt.ts`](src/modules/query-processor/prompts/answer-generator/generate-answer-v4.prompt.ts:1)

**Key Improvements**:

- **Nuanced Analysis Instructions**: Added detailed guidance for analyzing course content beyond binary decisions
- **Specific Reason Quality Guidelines**: Clear instructions for generating meaningful, course-specific reasons
- **Better Examples**: Updated example with detailed, specific exclusion reasons
- **Contextual Relevance Focus**: Emphasis on actual course content rather than keyword matching

**Critical Changes**:

```
OLD: "The decision to include or exclude a course must be based solely on whether its learning objectives explicitly advance the user's stated skills or topics of interest."

NEW: "For every skill and course pair in the context, perform a nuanced analysis of the course content:
   - Review the learning objectives in detail
   - Consider how the course content relates to the user's stated interests
   - Evaluate whether the course provides direct value, partial value, or minimal value
   - Take into account any user-specified constraints or domains to avoid"
```

### 2. Updated Prompt Factory

**File**: [`src/modules/query-processor/prompts/answer-generator/index.ts`](src/modules/query-processor/prompts/answer-generator/index.ts:1)

**Changes**:

- Added v4 prompt to the factory
- Updated type definitions to include 'v4' version
- Maintained backward compatibility with existing versions

### 3. Modified Service Configuration

**File**: [`src/modules/query-processor/services/answer-generator/object-based-answer-generator.service.ts`](src/modules/query-processor/services/answer-generator/object-based-answer-generator.service.ts:40)

**Changes**:

- Updated service to use v4 prompt by default
- Changed from `getPrompts('v3')` to `getPrompts('v4')`

## Expected Results

### Before Fix

```json
{
  "excludes": [
    {
      "skill": "financial analysis",
      "courses": [
        {
          "courseName": "การบัญชีระหว่างประเทศ",
          "reason": "ไม่เกี่ยวข้องกับการลงทุนโดยตรง"
        },
        {
          "courseName": "การวิเคราะห์งบการเงินและการประเมินมูลค่ากิจการ",
          "reason": "ไม่เกี่ยวข้องกับการลงทุนโดยตรง"
        }
      ]
    }
  ]
}
```

### After Fix

```json
{
  "excludes": [
    {
      "skill": "financial analysis",
      "courses": [
        {
          "courseName": "การบัญชีระหว่างประเทศ",
          "reason": "เน้นการวิเคราะห์รายงาบการเงินในระดับสากล ซึ่งเหมาะสำหรับผู้ทำงานในบริษัท multinational แต่ไม่ตรงกับความต้องการการลงทุนส่วนบุคคล"
        },
        {
          "courseName": "การวิเคราะห์งบการเงินและการประเมินมูลค่ากิจการ",
          "reason": "มุ่งเน้นการประเมินมูลค่ากิจการสำหรับการควบรวมและซื้อขาย ซึ่งเป็นทักษะระดับสูงที่ไม่จำเป็นสำหรับการลงทุนเบื้องต้น"
        }
      ]
    }
  ]
}
```

## Implementation Notes

### Backward Compatibility

- All existing v1-v3 prompts remain available
- Only the default service configuration changed to use v4
- Can be reverted by changing the prompt version in the service

### Testing Recommendations

1. Test with various question types (Thai, English, mixed)
2. Verify exclude reasons are course-specific and meaningful
3. Check that the system still respects user constraints appropriately
4. Monitor for any performance impacts from the more detailed analysis

### Future Improvements

- Consider adding A/B testing between v3 and v4 prompts
- Monitor user feedback on answer quality
- Potentially add more sophisticated constraint detection
- Consider implementing confidence scoring for include/exclude decisions

## Files Modified

1. **NEW**: `src/modules/query-processor/prompts/answer-generator/generate-answer-v4.prompt.ts`
2. **MODIFIED**: `src/modules/query-processor/prompts/answer-generator/index.ts`
3. **MODIFIED**: `src/modules/query-processor/services/answer-generator/object-based-answer-generator.service.ts`

## Summary

The fix addresses the core issue by shifting from constraint-based filtering to relevance-based analysis. The new prompt provides detailed guidance for generating meaningful, course-specific exclusion reasons that actually help users understand why certain courses don't match their needs.
