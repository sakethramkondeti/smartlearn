import { PrismaClient } from "@prisma/client";
import {
  mockUserProfile,
  mockCourses,
  mockDigitalElectronicsDays,
  mockMistakeLogs,
} from "../data/mockData";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Cognix Database...");

  // 1. Seed Default User
  const user = await prisma.user.upsert({
    where: { email: mockUserProfile.email },
    update: {
      name: mockUserProfile.name,
      avatarUrl: mockUserProfile.avatarUrl,
      streakDays: mockUserProfile.streakDays,
      totalHoursLearned: mockUserProfile.totalHoursLearned,
      overallMasteryPercentage: mockUserProfile.overallMasteryPercentage,
      activeCoursesCount: mockUserProfile.activeCoursesCount,
    },
    create: {
      name: mockUserProfile.name,
      email: mockUserProfile.email,
      avatarUrl: mockUserProfile.avatarUrl,
      streakDays: mockUserProfile.streakDays,
      totalHoursLearned: mockUserProfile.totalHoursLearned,
      overallMasteryPercentage: mockUserProfile.overallMasteryPercentage,
      activeCoursesCount: mockUserProfile.activeCoursesCount,
      preferences: {
        create: {
          preferredDailyMinutes: 60,
          preferredTime: "06:00 PM",
          learningStyle: "visual-practice",
        },
      },
    },
  });

  console.log(`✓ User created/updated: ${user.name} (${user.email})`);

  // 2. Seed Courses
  for (const c of mockCourses) {
    const course = await prisma.course.upsert({
      where: { id: c.id },
      update: {
        title: c.title,
        category: c.category,
        goal: c.goal,
        currentLevel: c.currentLevel,
        totalDays: c.totalDays,
        currentDay: c.currentDay,
        progressPercentage: c.progressPercentage,
        minutesPerDay: c.minutesPerDay,
        preferredTime: c.preferredTime,
        currentTopic: c.currentTopic,
        nextSessionTime: c.nextSessionTime,
        nextSessionTopic: c.nextSessionTopic,
        description: c.description,
        materialsCount: c.materialsCount,
        streakDays: c.streakDays,
      },
      create: {
        id: c.id,
        userId: user.id,
        title: c.title,
        category: c.category,
        goal: c.goal,
        currentLevel: c.currentLevel,
        totalDays: c.totalDays,
        currentDay: c.currentDay,
        progressPercentage: c.progressPercentage,
        minutesPerDay: c.minutesPerDay,
        preferredTime: c.preferredTime,
        currentTopic: c.currentTopic,
        nextSessionTime: c.nextSessionTime,
        nextSessionTopic: c.nextSessionTopic,
        description: c.description,
        materialsCount: c.materialsCount,
        streakDays: c.streakDays,
      },
    });

    // Seed Concepts for Course
    for (const concept of c.concepts) {
      await prisma.conceptNode.upsert({
        where: { id: concept.id },
        update: {
          courseId: course.id,
          name: concept.name,
          slug: concept.slug,
          status: concept.status,
          masteryPercentage: concept.masteryPercentage,
          importance: concept.importance,
          difficulty: concept.difficulty,
          estimatedMinutes: concept.estimatedMinutes,
          description: concept.description,
          dayAssigned: concept.dayAssigned || null,
          keyFormulas: concept.keyFormulas ? JSON.stringify(concept.keyFormulas) : null,
        },
        create: {
          id: concept.id,
          courseId: course.id,
          name: concept.name,
          slug: concept.slug,
          status: concept.status,
          masteryPercentage: concept.masteryPercentage,
          importance: concept.importance,
          difficulty: concept.difficulty,
          estimatedMinutes: concept.estimatedMinutes,
          description: concept.description,
          dayAssigned: concept.dayAssigned || null,
          keyFormulas: concept.keyFormulas ? JSON.stringify(concept.keyFormulas) : null,
        },
      });

      // Seed Concept Edges (Prerequisites)
      if (concept.prerequisites && concept.prerequisites.length > 0) {
        for (const prereqId of concept.prerequisites) {
          const edgeId = `${prereqId}->${concept.id}`;
          await prisma.conceptEdge.upsert({
            where: { id: edgeId },
            update: {},
            create: {
              id: edgeId,
              courseId: course.id,
              fromConceptId: prereqId,
              toConceptId: concept.id,
              relationType: "prerequisite",
            },
          });
        }
      }
    }

    // Seed DaysList for Course (especially Digital Electronics)
    const daysToSeed = c.daysList || (c.id === "digital-electronics" ? mockDigitalElectronicsDays : []);
    for (const d of daysToSeed) {
      const dayPlan = await prisma.dayPlan.upsert({
        where: {
          courseId_dayNumber: {
            courseId: course.id,
            dayNumber: d.dayNumber,
          },
        },
        update: {
          title: d.title,
          conceptId: d.conceptId,
          status: d.status,
          topicsCovered: JSON.stringify(d.topicsCovered),
          durationMinutes: d.durationMinutes,
          quizScore: d.quizScore || null,
          hasMistake: d.hasMistake || false,
          mistakeConcept: d.mistakeConcept || null,
          revisionNote: d.revisionNote || null,
          sourceLinkTitle: d.sourceLink?.title || null,
          sourceLinkSource: d.sourceLink?.source || null,
          sourceLinkUrl: d.sourceLink?.url || null,
          sourceLinkDuration: d.sourceLink?.duration || null,
        },
        create: {
          courseId: course.id,
          dayNumber: d.dayNumber,
          title: d.title,
          conceptId: d.conceptId,
          status: d.status,
          topicsCovered: JSON.stringify(d.topicsCovered),
          durationMinutes: d.durationMinutes,
          quizScore: d.quizScore || null,
          hasMistake: d.hasMistake || false,
          mistakeConcept: d.mistakeConcept || null,
          revisionNote: d.revisionNote || null,
          sourceLinkTitle: d.sourceLink?.title || null,
          sourceLinkSource: d.sourceLink?.source || null,
          sourceLinkUrl: d.sourceLink?.url || null,
          sourceLinkDuration: d.sourceLink?.duration || null,
        },
      });

      // Seed Initial Lesson & Version 1 for active/completed days
      if (d.dayNumber <= 8) {
        const lesson = await prisma.lesson.upsert({
          where: { id: `lesson-${course.id}-${d.dayNumber}` },
          update: {
            currentVersionNumber: 1,
          },
          create: {
            id: `lesson-${course.id}-${d.dayNumber}`,
            courseId: course.id,
            dayPlanId: dayPlan.id,
            conceptId: d.conceptId,
            currentVersionNumber: 1,
          },
        });

        // Seed initial Version 1 content
        const defaultContent = `## ${d.title}

A foundational topic in **${course.title}**. This module covers the theoretical principles, governing mathematical logic, and practical implementation rules.

### Core Mathematical Equations

$$2^m = N \\implies m = \\log_2(N)$$

$$Y = \\sum_{i=0}^{N-1} m_i \\cdot D_i$$

### Truth Table & Logic Synthesis

| Select Lines ($S_1 S_0$) | Selected Input | Output ($Y$) |
|:---:|:---:|:---:|
| $00$ | $D_0$ | $Y = D_0$ |
| $01$ | $D_1$ | $Y = D_1$ |
| $10$ | $D_2$ | $Y = D_2$ |
| $11$ | $D_3$ | $Y = D_3$ |

\`\`\`verilog
module mux_4to1 (
  input  wire [3:0] D,
  input  wire [1:0] S,
  output reg        Y
);
  always @(*) begin
    Y = D[S];
  end
endmodule
\`\`\`

> **Important Design Rule:** Always verify active-low enable pins (EN') and pull-down logic before synthesizing combinational blocks.
`;

        await prisma.lessonVersion.upsert({
          where: {
            lessonId_versionNumber: {
              lessonId: lesson.id,
              versionNumber: 1,
            },
          },
          update: {
            markdownContent: defaultContent,
          },
          create: {
            lessonId: lesson.id,
            versionNumber: 1,
            markdownContent: defaultContent,
            generatedByModel: "openai/gpt-oss-120b",
          },
        });
      }
    }

    console.log(`✓ Course seeded: ${course.title} with concepts and day plans`);
  }

  // 3. Seed Mistake Logs
  for (const m of mockMistakeLogs) {
    await prisma.mistakeLog.create({
      data: {
        userId: user.id,
        courseId: "digital-electronics",
        conceptId: m.conceptId,
        questionTitle: m.questionTitle,
        userAnswer: m.userAnswer,
        correctAnswer: m.correctAnswer,
        errorType: m.errorType,
        severity: m.severity,
        likelyCause: m.likelyCause,
        adaptiveAction: m.adaptiveAction,
      },
    });
  }
  console.log(`✓ Seeded ${mockMistakeLogs.length} diagnostic mistake logs`);

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
