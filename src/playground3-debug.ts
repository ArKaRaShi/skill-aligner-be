import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  // Retrieve all course offerings with their courses and learning outcomes, including year and semester
  const courseOfferings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      semester: true,
      academicYear: true,
      course: {
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
        },
      },
      courseLearningOutcomes: {
        select: {
          id: true,
          cloNo: true,
          cleanedCloName: true,
          hasEmbedding768: true,
          hasEmbedding1536: true,
        },
        orderBy: {
          cloNo: 'asc',
        },
      },
    },
    orderBy: [
      {
        course: {
          subjectCode: 'asc',
        },
      },
      {
        academicYear: 'desc',
      },
      {
        semester: 'desc',
      },
    ],
  });

  // Group course offerings by subject code
  const subjectCodeGroups: Record<string, typeof courseOfferings> = {};

  for (const offering of courseOfferings) {
    const subjectCode = offering.course.subjectCode;
    if (!subjectCodeGroups[subjectCode]) {
      subjectCodeGroups[subjectCode] = [];
    }
    subjectCodeGroups[subjectCode].push(offering);
  }

  console.log(
    `Found ${Object.keys(subjectCodeGroups).length} unique subject codes`,
  );
  console.log('=====================================');

  // Let's check some statistics
  let totalCourses = 0;
  let subjectCodesWithMultipleInstances = 0;
  let subjectCodesWithDifferentLOs = 0;

  const sampleSubjectCodes: string[] = [];

  // For each subject code, group by year and semester
  for (const [subjectCode, coursesInGroup] of Object.entries(
    subjectCodeGroups,
  )) {
    totalCourses += coursesInGroup.length;

    if (coursesInGroup.length > 1) {
      subjectCodesWithMultipleInstances++;

      // Collect first 10 subject codes with multiple instances for inspection
      if (sampleSubjectCodes.length < 10) {
        sampleSubjectCodes.push(subjectCode);
      }
    }

    // Group course offerings by year and semester
    const yearSemesterGroups: Record<string, typeof courseOfferings> = {};

    for (const offering of coursesInGroup) {
      const yearSemesterKey = `${offering.academicYear}-${offering.semester}`;
      if (!yearSemesterGroups[yearSemesterKey]) {
        yearSemesterGroups[yearSemesterKey] = [];
      }
      yearSemesterGroups[yearSemesterKey].push(offering);
    }

    // Collect all unique learning outcomes across all year-semester groups
    const allUniqueLOs = new Set<string>();
    const yearSemesterLOs: Record<string, Set<string>> = {};

    // First pass: collect all unique LOs and LOs per year-semester
    for (const [yearSemesterKey, coursesInYearSemester] of Object.entries(
      yearSemesterGroups,
    )) {
      yearSemesterLOs[yearSemesterKey] = new Set();

      for (const offering of coursesInYearSemester) {
        for (const clo of offering.courseLearningOutcomes) {
          const loKey = clo.cleanedCloName;
          allUniqueLOs.add(loKey);
          yearSemesterLOs[yearSemesterKey].add(loKey);
        }
      }
    }

    // Check if there are different learning outcomes across year-semester groups
    const yearSemesterKeys = Object.keys(yearSemesterLOs);
    let hasDifferentLOs = false;

    if (yearSemesterKeys.length > 1) {
      // Compare each year-semester group with the first one
      const firstGroupLOs = yearSemesterLOs[yearSemesterKeys[0]];

      for (let i = 1; i < yearSemesterKeys.length; i++) {
        const currentGroupLOs = yearSemesterLOs[yearSemesterKeys[i]];
        // Condition 1: Check if size is different
        if (firstGroupLOs.size !== currentGroupLOs.size) {
          hasDifferentLOs = true;
          break;
        }

        // Condition 2: Same size but check if LOs are different (by ID)
        // Extract LO IDs from the actual course data
        const firstGroupIds = new Set<string>();
        const currentGroupIds = new Set<string>();

        // Get course offerings for the first group
        const firstGroupCourses = yearSemesterGroups[yearSemesterKeys[0]];
        for (const offering of firstGroupCourses) {
          for (const clo of offering.courseLearningOutcomes) {
            firstGroupIds.add(clo.id);
          }
        }

        // Get course offerings for the current group
        const currentGroupCourses = yearSemesterGroups[yearSemesterKeys[i]];
        for (const offering of currentGroupCourses) {
          for (const clo of offering.courseLearningOutcomes) {
            currentGroupIds.add(clo.id);
          }
        }

        // Compare the sets of IDs
        if (
          firstGroupIds.size !== currentGroupIds.size ||
          ![...firstGroupIds].every((id) => currentGroupIds.has(id))
        ) {
          hasDifferentLOs = true;
          break;
        }
      }
    }

    if (hasDifferentLOs) {
      subjectCodesWithDifferentLOs++;
    }
  }

  console.log(`Total courses: ${totalCourses}`);
  console.log(
    `Subject codes with multiple instances: ${subjectCodesWithMultipleInstances}`,
  );
  console.log(
    `Subject codes with different learning outcomes: ${subjectCodesWithDifferentLOs}`,
  );
  console.log('=====================================');

  // Let's inspect some sample subject codes with multiple instances
  console.log('Sample subject codes with multiple instances:');
  for (const subjectCode of sampleSubjectCodes) {
    const coursesInGroup = subjectCodeGroups[subjectCode];
    console.log(
      `\nSubject Code: ${subjectCode} (${coursesInGroup.length} instances)`,
    );

    // Group by year and semester
    const yearSemesterGroups: Record<string, typeof courseOfferings> = {};
    for (const offering of coursesInGroup) {
      const yearSemesterKey = `${offering.academicYear}-${offering.semester}`;
      if (!yearSemesterGroups[yearSemesterKey]) {
        yearSemesterGroups[yearSemesterKey] = [];
      }
      yearSemesterGroups[yearSemesterKey].push(offering);
    }

    for (const [yearSemesterKey, coursesInYearSemester] of Object.entries(
      yearSemesterGroups,
    )) {
      const [year, semester] = yearSemesterKey.split('-');
      console.log(
        `  Year ${year} Semester ${semester}: ${coursesInYearSemester[0].courseLearningOutcomes.length} learning outcomes`,
      );

      // Show first learning outcome
      if (coursesInYearSemester[0].courseLearningOutcomes.length > 0) {
        const firstCLO = coursesInYearSemester[0].courseLearningOutcomes[0];
        console.log(`    First LO: ${firstCLO.cleanedCloName}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground3-debug.ts
