# Course-Skill Relevance Evaluation Strategy

## Overview

This document outlines the comprehensive evaluation strategy for assessing the relevance of courses against skills as part of the retriever system. The strategy follows a 5-step process that systematically evaluates how well courses align with specific skill requirements.

## Evaluation Pipeline

### Step 1: Skill Representative Set Creation

**Purpose**: Generate a representative set of skills for evaluation.

**Implementation**:
- Select skills from predefined evaluation sets (to be created in `skill-generator-evaluation` module)
- Skills should cover diverse domains and complexity levels
- Each skill should have clear, measurable learning outcomes

**Input Pattern**:
```typescript
interface SkillRepresentativeSet {
  skills: string[];
  metadata: {
    source: 'skill-generator-evaluation'; // Reference to future module
    categories: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced';
  };
  createdAt: string;
}
```

### Step 2: Learning Outcome (LO) Retrieval

**Purpose**: Retrieve relevant learning outcomes for each skill using vector similarity.

**Implementation**:
- Use [`PrismaCourseLearningOutcomeRepository.findLosBySkills()`](src/modules/course/repositories/prisma-course-learning-outcome.repository.ts:31)
- Configure embedding parameters (dimension, threshold, topN)
- Apply filters (campus, faculty, academic year, GenEd status)

**Output Structure**:
```typescript
interface LORetrievalResult {
  querySkill: string;
  retrievedLOs: Array<{
    id: string;
    originalName: string;
    cleanedName: string;
    similarityScore: number;
    metadata: Record<string, any>;
  }>;
  retrievalConfig: {
    embeddingConfiguration: object;
    threshold: number;
    topN: number;
    filters: {
      campusId?: string;
      facultyId?: string;
      isGenEd?: boolean;
      academicYearSemesters?: Array<{
        academicYear: number;
        semesters: number[];
      }>;
    };
  };
  evaluatedAt: string;
}
```

**Persistence**:
- Save as JSON files in `data/evaluation/lo-retrieval/`
- File naming pattern: `lo-retrieval-{timestamp}.json`
- Include evaluation metadata and input parameters

### Step 3: Learning Outcome Evaluation

**Purpose**: Evaluate relevance of each retrieved LO against the query skill using LLM with rubric.

**Implementation**:
- Use LLM to score LO relevance on 0-1 scale
- Apply structured rubric for consistent evaluation
- Generate detailed reasoning for each score

**Evaluation Rubric**:
```typescript
interface LOEvaluationRubric {
  relevanceScore: number; // 0-1 scale
  reasoning: string;
  criteria: {
    skillAlignment: number; // How well LO aligns with skill
    practicalApplication: number; // Practical applicability
    complexityMatch: number; // Complexity level matching
    measurability: number; // How measurable the outcome is
  };
}
```

**Output Structure**:
```typescript
interface LOEvaluationResult {
  querySkill: string;
  loId: string;
  loText: string;
  evaluation: {
    relevanceScore: number;
    reasoning: string;
    rubricScores: LOEvaluationRubric;
  };
  metadata: {
    model: string;
    promptVersion: string;
    evaluatedAt: string;
    evaluationTime: number; // milliseconds
  };
}
```

**Persistence**:
- Save as JSON files in `data/evaluation/lo-evaluation/`
- File naming pattern: `lo-evaluation-{skill-hash}-{timestamp}.json`
- Batch evaluations by skill for efficient processing

### Step 4: Course Retrieval

**Purpose**: Retrieve courses containing the evaluated learning outcomes.

**Implementation**:
- Use [`PrismaCourseRepository.findCourseByLearningOutcomeIds()`](src/modules/course/repositories/prisma-course.repository.ts:295)
- Map LO IDs to parent courses
- Include course metadata and offerings

**Output Structure**:
```typescript
interface CourseRetrievalResult {
  loId: string;
  courses: Array<{
    id: string;
    subjectCode: string;
    subjectName: string;
    campusId: string;
    facultyId: string;
    isGenEd: boolean;
    courseOfferings: Array<{
      academicYear: number;
      semester: number;
    }>;
    courseLearningOutcomes: Array<{
      id: string;
      originalName: string;
      cleanedName: string;
    }>;
  }>;
  retrievalConfig: {
    campusId?: string;
    facultyId?: string;
    isGenEd?: boolean;
    academicYearSemesters?: Array<{
      academicYear: number;
      semesters: number[];
    }>;
  };
  retrievedAt: string;
}
```

**Persistence**:
- Save as JSON files in `data/evaluation/course-retrieval/`
- File naming pattern: `course-retrieval-{timestamp}.json`
- Maintain reference to LO evaluation results

### Step 5: Course-Level Aggregation

**Purpose**: Aggregate LO-level evaluations to course-level relevance scores.

**Implementation**:
- For each course, aggregate relevance scores of its LOs
- Use maximum function: `course_relevance = max(lo1_score, lo2_score, ...)`
- Provide detailed breakdown for analysis

**Aggregation Function**:
```typescript
interface CourseAggregationResult {
  courseId: string;
  courseInfo: {
    subjectCode: string;
    subjectName: string;
    campusId: string;
    facultyId: string;
  };
  querySkill: string;
  aggregatedScore: number; // max of LO scores
  aggregationMethod: 'maximum';
  loBreakdown: Array<{
    loId: string;
    loText: string;
    relevanceScore: number;
    reasoning: string;
  }>;
  metadata: {
    totalLOsEvaluated: number;
    evaluationTimestamp: string;
    aggregationTimestamp: string;
  };
}
```

**Final Output Structure**:
```typescript
interface CourseSkillEvaluationResults {
  evaluationRun: {
    id: string;
    timestamp: string;
    config: {
      skillSet: SkillRepresentativeSet;
      loRetrievalConfig: object;
      evaluationConfig: object;
      aggregationMethod: string;
    };
  };
  results: {
    skill: string;
    courses: CourseAggregationResult[];
  }[];
  summary: {
    totalSkills: number;
    totalCoursesEvaluated: number;
    averageRelevanceScore: number;
    evaluationDuration: number; // milliseconds
  };
}
```

**Persistence**:
- Save as JSON files in `data/evaluation/course-skill-evaluation/`
- File naming pattern: `evaluation-{run-id}-{timestamp}.json`
- Include comprehensive metadata for traceability

## File Organization

```
data/evaluation/
├── lo-retrieval/
│   ├── lo-retrieval-{timestamp}.json
├── lo-evaluation/
│   ├── lo-evaluation-{skill-hash}-{timestamp}.json
├── course-retrieval/
│   ├── course-retrieval-{timestamp}.json
└── course-skill-evaluation/
    ├── evaluation-{run-id}-{timestamp}.json
    ├── latest-evaluation.json
```

## Evaluation Configuration

### Default Parameters
- **Embedding Dimension**: 768 (e5-small)
- **Similarity Threshold**: 0.75
- **Top N Results**: 10 per skill
- **Evaluation Model**: GPT-4-mini
- **Aggregation Method**: Maximum

### Configurable Options
- Embedding model and dimensions
- Similarity thresholds
- Number of results per skill
- Evaluation rubric criteria
- Aggregation functions (max, avg, weighted)

## Quality Assurance

### Validation Checks
1. **Skill Set Validation**: Ensure skills are properly formatted and diverse
2. **LO Retrieval Validation**: Verify retrieved LOs meet similarity thresholds
3. **Evaluation Consistency**: Check LLM evaluation consistency across runs
4. **Data Integrity**: Ensure all references and IDs are valid

### Metrics Collection
- Retrieval precision and recall
- Evaluation time per component
- LLM token usage and costs
- Aggregation score distributions
- Error rates and edge cases

## Implementation Notes

### Error Handling
- Implement retry mechanisms for LLM API failures
- Log and handle missing LOs or courses gracefully
- Validate JSON structure before persistence

### Performance Considerations
- Batch LO evaluations to optimize LLM API calls
- Cache embedding vectors for repeated evaluations
- Use streaming for large result sets
- Implement parallel processing where possible

### Extensibility
- Design interfaces to support new evaluation methods
- Allow plugin architecture for custom rubrics
- Support multiple aggregation functions
- Enable comparative evaluation between different configurations

## Future Enhancements

1. **Skill Generator Integration**: Connect with future skill-generator-evaluation module
2. **Advanced Aggregation**: Implement weighted aggregation based on LO importance
3. **Temporal Analysis**: Track evaluation changes over time
4. **Multi-Modal Evaluation**: Incorporate course descriptions and prerequisites
5. **Feedback Loop**: Use evaluation results to improve retrieval algorithms