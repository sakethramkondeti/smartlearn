import { getAIProvider } from "../provider";
import { prisma } from "@/lib/db";

/**
 * Model 6: Personal Cognix Assistant Service
 *
 * Responsibilities:
 * - Ingest the student's complete Cognix telemetry from Prisma database
 * - Read current courses, streak, progress, and recent mistake logs
 * - Deliver encouraging, pedagogically sharp tutoring and guidance
 */

export class AssistantService {
  /**
   * Answer a student's query with full database context.
   */
  static async chat(userMessage: string, userEmail = "student@vitapstudent.ac.in"): Promise<string> {
    // 1. Fetch live student context from database
    const user = (await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        courses: {
          include: {
            daysList: {
              where: { status: "current" },
            },
          },
        },
        mistakeLogs: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    })) || (await prisma.user.findFirst({
      include: {
        courses: {
          include: {
            daysList: {
              where: { status: "current" },
            },
          },
        },
        mistakeLogs: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    }));

    const activeCourse = user?.courses[0];
    const currentDay = activeCourse?.daysList[0];

    const studentTelemetry = `Student Profile:
Name: ${user?.name || "Vitian"}
Streak: ${user?.streakDays || 7} Days
Active Courses: ${user?.courses.map((c) => `${c.title} (Day ${c.currentDay}/${c.totalDays}, ${c.progressPercentage}% done)`).join("; ") || "Communication Systems"}
Current Focus: ${activeCourse?.title || "Communication Systems"} — Day ${currentDay?.dayNumber || 1}: ${currentDay?.title || "Foundations"}
Recent Diagnostic Weak Areas: ${user?.mistakeLogs.map((m) => `${m.conceptId}: ${m.questionTitle} (Error: ${m.errorType})`).join(" | ") || "None recorded"}`;


    const provider = getAIProvider();

    if (provider) {
      const systemPrompt = `You are Cognix AI, an intelligent personal learning tutor.
You have complete access to the student's database telemetry, learning streaks, and mistake diagnostics.
Be concise (1-3 paragraphs), pedagogical, and encouraging.
Format all mathematical formulas using clean standard notation or LaTeX.`;

      const userPrompt = `Student Telemetry:\n${studentTelemetry}\n\nStudent Question:\n${userMessage}`;

      try {
        const response = await provider.generateText(userPrompt, systemPrompt);
        if (response.trim()) return response;
      } catch (err) {
        console.warn("AI Assistant fallback:", err);
      }
    }

    // Context-aware intelligent fallback when AI key is commented
    const lower = userMessage.toLowerCase();

    if (lower.includes("streak") || lower.includes("progress")) {
      return `You are maintaining great consistency! Your learning streak is **${user?.streakDays || 7} Days**, and your active course **${activeCourse?.title || "Digital Electronics"}** is at **${activeCourse?.progressPercentage || 27}% completion**.`;
    }

    if (lower.includes("mistake") || lower.includes("weak") || lower.includes("k-map")) {
      const lastMistake = user?.mistakeLogs[0];
      return `In your recent diagnostic check on **${lastMistake?.conceptId || "K-Maps Minimization"}**: You noticed that corner minterms wrap around toroidally. Remember that all 4 corners touch to form a single quad term: **B'D'**.`;
    }

    if (lower.includes("mux") || lower.includes("multiplexer") || lower.includes("formula")) {
      return `For a **4:1 Multiplexer**, the boolean sum-of-products equation is:\n\n$$Y = S_1'S_0'I_0 + S_1'S_0I_1 + S_1S_0'I_2 + S_1S_0I_3$$\n\nEach 2-bit select code acts as a binary address to forward that channel to output $Y$.`;
    }

    return `I am tracking your learning journey in **${activeCourse?.title || "Digital Electronics"}**. You are on **Day ${activeCourse?.currentDay || 8}** focusing on **${currentDay?.title || "Multiplexers (4:1 & 8:1 MUX Architectures)"}**. How can I help you break down today's concepts, formulas, or hardware description?`;
  }
}

