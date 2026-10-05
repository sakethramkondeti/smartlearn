import { getAIProvider } from "../provider";
import { prisma } from "@/lib/db";

/**
 * Builds a guaranteed "References & Further Reading" section
 * from the concept/topic name — completely programmatic,
 * so links are ALWAYS present regardless of AI output.
 */
function buildReferencesSection(params: {
  conceptName: string;
  courseTitle: string;
  topics: string[];
}): string {
  const { conceptName, courseTitle, topics } = params;

  // Use the first specific topic if available, else the concept name
  const primaryTopic = topics[0] || conceptName;
  const wikiSlug = (t: string) => encodeURIComponent(t.replace(/\s+/g, "_"));
  const ytSlug = (t: string) => encodeURIComponent(t + " explained tutorial");
  const gfgSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Build topic-specific Wikipedia entries
  const wikiLinks = [
    `- [${conceptName} — Wikipedia](https://en.wikipedia.org/wiki/${wikiSlug(conceptName)}) — Comprehensive overview and background`,
  ];

  // Add extra Wikipedia entry for the specific topic if different from concept
  if (primaryTopic !== conceptName) {
    wikiLinks.push(
      `- [${primaryTopic} — Wikipedia](https://en.wikipedia.org/wiki/${wikiSlug(primaryTopic)}) — Specific topic deep-dive`
    );
  }

  // Detect subject area for targeted links
  const isCS = /algorithm|data structure|programming|computer|software|coding|javascript|python|react|web/i.test(courseTitle + conceptName);
  const isMath = /calculus|linear algebra|statistics|probability|differential|integral|matrix|fourier/i.test(courseTitle + conceptName);
  const isElectronics = /electronic|circuit|semiconductor|transistor|amplifier|diode|signal|digital/i.test(courseTitle + conceptName);
  const isPhysics = /physics|quantum|electromagnetic|optics|thermodynamics|mechanics|wave/i.test(courseTitle + conceptName);

  const practiceLinks: string[] = [];

  if (isCS) {
    practiceLinks.push(
      `- [${primaryTopic} — GeeksForGeeks](https://www.geeksforgeeks.org/${gfgSlug(primaryTopic)}/) — Examples, code, and explanations`,
      `- [${conceptName} — GeeksForGeeks](https://www.geeksforgeeks.org/${gfgSlug(conceptName)}/) — Practice problems and tutorials`
    );
  } else if (isMath) {
    practiceLinks.push(
      `- [${conceptName} — Khan Academy](https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(conceptName)}) — Step-by-step video lessons`,
      `- [MIT OpenCourseWare — Mathematics](https://ocw.mit.edu/search/?q=${encodeURIComponent(conceptName)}) — University-level lecture notes and problem sets`
    );
  } else if (isElectronics) {
    practiceLinks.push(
      `- [${conceptName} — All About Circuits](https://www.allaboutcircuits.com/search/?q=${encodeURIComponent(conceptName)}) — Circuit theory and practical electronics`,
      `- [${primaryTopic} — Electronics Tutorials](https://www.electronics-tutorials.ws) — Clear diagrams and worked examples`
    );
  } else if (isPhysics) {
    practiceLinks.push(
      `- [${conceptName} — HyperPhysics](http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html) — Concept maps and physics derivations`,
      `- [MIT OpenCourseWare — Physics](https://ocw.mit.edu/search/?q=${encodeURIComponent(conceptName)}) — Lecture notes and problem sets`
    );
  } else {
    practiceLinks.push(
      `- [${conceptName} — Khan Academy](https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(conceptName)}) — Foundation-level explanations`,
      `- [${primaryTopic} — Britannica](https://www.britannica.com/search?query=${encodeURIComponent(primaryTopic)}) — Encyclopedia reference`
    );
  }

  const videoLinks = [
    `- [▶ ${primaryTopic} — YouTube](https://www.youtube.com/results?search_query=${ytSlug(primaryTopic)}) — Video lecture and visual explanations`,
    `- [▶ ${conceptName} full tutorial — YouTube](https://www.youtube.com/results?search_query=${ytSlug(conceptName + " full course")}) — In-depth course playlist`,
  ];

  return `

---

## 📚 References & Further Reading

### 🌐 Wikipedia
${wikiLinks.join("\n")}

### 📖 Study Resources
${practiceLinks.join("\n")}

### 🎬 Video Explanations
${videoLinks.join("\n")}
`;
}

/**
 * Model 3: Daily Lesson Generator Service
 *
 * Responsibilities:
 * - Generate comprehensive educational workspace lesson markdown
 * - Include LaTeX math ($$ and $), GFM tables, and source references
 * - Ensure every generation creates an immutable LessonVersion record in the database
 * - Content is cached — NOT regenerated on revisit (only on explicit "Regenerate" click)
 */

export interface LessonGenerationResult {
  markdownContent: string;
  versionNumber: number;
  totalVersions: number;
  generatedByModel: string;
  lessonId: string;
}

export class LessonService {
  /**
   * Get or generate a lesson for a specific day.
   * If versionNumber is specified, returns that specific version.
   * If regenerate is true, calls AI and saves a new LessonVersion.
   */
  static async getOrCreateLesson(params: {
    courseId: string;
    dayNumber: number;
    forceRegenerate?: boolean;
    versionNumber?: number;
  }): Promise<LessonGenerationResult> {
    const { courseId, dayNumber, forceRegenerate, versionNumber } = params;

    // Find the day plan in the database
    const dayPlan = await prisma.dayPlan.findUnique({
      where: {
        courseId_dayNumber: {
          courseId,
          dayNumber,
        },
      },
      include: {
        course: true,
        concept: true,
        lessons: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
            },
          },
        },
      },
    });

    if (!dayPlan) {
      throw new Error(`Day plan not found for course ${courseId}, Day ${dayNumber}`);
    }

    let lesson = dayPlan.lessons[0];

    // If lesson doesn't exist in DB, create it
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          courseId,
          dayPlanId: dayPlan.id,
          conceptId: dayPlan.conceptId,
          currentVersionNumber: 1,
        },
        include: {
          versions: true,
        },
      });
    }

    // If specific version is requested and exists, return it
    if (versionNumber && !forceRegenerate) {
      const requested = lesson.versions.find((v) => v.versionNumber === versionNumber);
      if (requested) {
        return {
          markdownContent: requested.markdownContent,
          versionNumber: requested.versionNumber,
          totalVersions: lesson.versions.length,
          generatedByModel: requested.generatedByModel,
          lessonId: lesson.id,
        };
      }
    }

    // ── CACHE HIT: Return existing latest version (no re-generation on revisit) ──
    if (lesson.versions.length > 0 && !forceRegenerate) {
      const latest = lesson.versions[0];
      return {
        markdownContent: latest.markdownContent,
        versionNumber: latest.versionNumber,
        totalVersions: lesson.versions.length,
        generatedByModel: latest.generatedByModel,
        lessonId: lesson.id,
      };
    }

    // ── GENERATE NEW LESSON VERSION VIA AI (Model 3: Gemini 2.5 Flash) ──
    const provider = getAIProvider("model3") || getAIProvider();
    const topics: string[] = JSON.parse(dayPlan.topicsCovered || "[]");
    const studentLevel = dayPlan.course.currentLevel || "Intermediate";

    let generatedMarkdown = "";
    const modelName = provider?.name || "Google Gemini (gemini-2.5-flash)";

    // ── FETCH USER PERFORMANCE MEMORY (last 5 completed days) ──
    let performanceDigest = "";
    try {
      const recentDays = await prisma.dayPlan.findMany({
        where: {
          courseId: dayPlan.courseId,
          dayNumber: { lt: dayPlan.dayNumber },
          status: "completed",
        },
        orderBy: { dayNumber: "desc" },
        take: 5,
        select: {
          dayNumber: true,
          title: true,
          quizScore: true,
          hasMistake: true,
          mistakeConcept: true,
          revisionNote: true,
        },
      });

      if (recentDays.length > 0) {
        const digestLines = recentDays.reverse().map((d) => {
          const scoreTag = d.quizScore !== null
            ? d.quizScore >= 70
              ? `${d.quizScore}% ✓ Mastered`
              : `${d.quizScore}% ✗ Needs review`
            : "Not attempted";
          const mistakeTag = d.hasMistake && d.mistakeConcept ? ` | Struggled: ${d.mistakeConcept}` : "";
          const revisionTag = d.revisionNote ? ` | Note: ${d.revisionNote}` : "";
          return `  Day ${d.dayNumber} (${d.title}): ${scoreTag}${mistakeTag}${revisionTag}`;
        });
        performanceDigest = `\n--- Student Performance Memory (Last ${recentDays.length} Days) ---\n${digestLines.join("\n")}\n------`;
      }
    } catch (err) {
      console.warn("Could not fetch performance memory:", err);
    }

    if (provider) {
      // Build level-adaptive pedagogical directives
      const levelDirectives = {
        Beginner: `STUDENT LEVEL: BEGINNER
━ Define every technical term clearly in plain language the first time it appears.
━ Start with a real-world analogy or everyday scenario BEFORE any mathematics.
━ Show ALL steps in derivations — never skip steps. Include unit tracking.
━ Worked examples must spell out every arithmetic step.
━ Use simple vocabulary; immediately explain any jargon in brackets.
━ After each concept, add a short "In simple words:" summary paragraph.`,

        Intermediate: `STUDENT LEVEL: INTERMEDIATE
━ Assume basic terminology is known. Focus on connecting theory to application.
━ Provide rigorous derivations showing key intermediate algebraic steps.
━ Include at least one fully solved numerical example with realistic parameter values.
━ Point out common mistakes, boundary conditions, and misconceptions to avoid.
━ Brief conceptual recaps are fine, but spend most space on analysis and worked problems.`,

        Advanced: `STUDENT LEVEL: ADVANCED
━ Assume strong domain fundamentals. Focus on proofs, derivations, and edge cases.
━ Present formal mathematical rigor; theorem-proof structure where appropriate.
━ Compare multiple analytical approaches and discuss trade-offs.
━ Include advanced worked examples with non-trivial or industry-realistic parameter choices.
━ Connect to research directions, industrial standards, or open problems where relevant.
━ Skip elementary definitions — go straight to depth.`,
      };

      const levelGuide = levelDirectives[studentLevel as keyof typeof levelDirectives] || levelDirectives.Intermediate;

      const isProgrammingOrCS = /computer science|programming|software|data structures|algorithms|python|java|c\+\+|javascript|react|web dev|backend|frontend|coding|dsa/i.test(
        `${dayPlan.course.title} ${dayPlan.course.category || ""}`
      );

      const systemPrompt = `You are Cognix AI — a world-class university professor and master educator across science, engineering, mathematics, and computing. Your lectures are celebrated for their clarity, depth, and beautiful structure.

Generate a comprehensive, deeply educational daily lecture in pure GitHub-Flavored Markdown (GFM). The output will be rendered by a React Markdown renderer with KaTeX support.

${levelGuide}

━━━ STRICT FORMATTING RULES (NON-NEGOTIABLE) ━━━

1. MATHEMATICS — Use ONLY LaTeX delimiters:
   • Display equations (formula cards): Write them as $$ equation $$ on their OWN separate lines with blank lines before and after. Do NOT wrap them in HTML.
   • Inline math: $x = 2$ or \`symbol\` backtick pills for short variable names like \`V_BE\`, \`R_C\`, \`f_c\`.
   • NEVER use <div>, <span>, <style>, or any HTML tags. Pure Markdown + LaTeX only.

2. KEYWORDS & PARAMETERS — Wrap important terms, variable names, physical constants, and key jargon in backtick inline code: \`term\`. Example: \`SNR\`, \`Modulation Index\`, \`Carrier Frequency\`, \`β\`.

3. CALLOUT BOXES — Use > blockquote syntax for:
   • Key rules and design constraints
   • Important warnings or common mistakes  
   • Core insights and takeaways
   Example: > **Rule:** The collector current is controlled by base current via \`β\`.

4. SPACING — Leave generous blank lines between sections. Each major section should feel like a dedicated chapter. Use --- horizontal rules to separate major topics.

5. SOURCE LINKS — At the END of the document, always include a "## 📚 References & Further Reading" section with:
   • At least 2–3 real Wikipedia links (https://en.wikipedia.org/wiki/...)
   • At least 1–2 real links to GeeksForGeeks, Khan Academy, MIT OpenCourseWare, or similar
   • 1 YouTube search link for a video tutorial: https://www.youtube.com/results?search_query=...
   Format links as: - [Page Title](https://url) — Brief description

6. STRUCTURE — Follow this exact section order:
   ## 🎯 Learning Objectives
   ## 1. Introduction & Intuition
   ## 2. Core Theory & Governing Equations  
   ## 3. Detailed Worked Example(s)
   ## 4. Comparison Table / Key Parameters
   ## 5. Real-World Applications
   ## 6. Common Mistakes & Traps
   ## 7. Summary & Key Takeaways
   ## 📚 References & Further Reading

${isProgrammingOrCS
  ? "7. CODE — Provide clean, runnable code examples with language-tagged fenced blocks (```python, ```cpp). Include time/space complexity notes."
  : "7. NO CODE — This is a theoretical/applied science or engineering course. NEVER include programming code blocks (Python, C++, Java, Verilog, etc.). Use mathematical derivations, equations, circuit descriptions, block diagrams in text, and analytical worked problems instead."}

ANTI-HALLUCINATION GUARD:
• Only teach concepts genuinely part of today's topics.
• Do not invent equations, standards, or paper references you are uncertain about.
• If using physical constants (c = 3×10⁸ m/s, q = 1.6×10⁻¹⁹ C), always state their value and units explicitly.
• Output ONLY pure Markdown — no JSON wrappers, no preamble like "Sure, here is..."`;

      const performanceContext = performanceDigest
        ? `\n${performanceDigest}\nUse this student history to decide whether to briefly recap prerequisites before the new material, and to adjust the depth of examples accordingly.\n`
        : "";

      const userPrompt = `Course: ${dayPlan.course.title}
Subject Category: ${dayPlan.course.category || "Engineering & Applied Sciences"}
Student Knowledge Level: ${studentLevel}
Day ${dayPlan.dayNumber} of ${dayPlan.course.totalDays}: ${dayPlan.title}
Concept Unit: ${dayPlan.concept.name}
Concept Description: ${dayPlan.concept.description}
Today's Specific Topics:
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}
${dayPlan.concept.keyFormulas ? `Key Equations from Syllabus: ${dayPlan.concept.keyFormulas}` : ""}
${dayPlan.revisionNote ? `\nPrior Diagnostic Concept to Revisit: ${dayPlan.revisionNote}` : ""}${performanceContext}

Generate the FULL, comprehensive, detailed, and spacious lecture notes for this day.
The content should be rich and thorough — a student should be able to master all of today's topics by reading this alone.
For ${studentLevel} level, this means:
${studentLevel === "Beginner" ? "- Extra analogies, simple language, all steps shown, 'In simple words' summaries after each concept." : ""}
${studentLevel === "Intermediate" ? "- Connected theory to application, complete derivations, numerical examples with realistic values." : ""}
${studentLevel === "Advanced" ? "- Deep rigor, proofs, edge cases, research connections, industry-realistic examples." : ""}`;

      try {
        generatedMarkdown = await provider.generateText(userPrompt, systemPrompt);
      } catch (err) {
        console.warn("AI generation failed in LessonService, using dynamic fallback:", err);
      }
    }

    // ── STRIP ANY RAW HTML LEFTOVERS FROM AI OUTPUT ──
    if (generatedMarkdown) {
      generatedMarkdown = generatedMarkdown
        // Remove HTML div/span/style tags but keep content inside them
        .replace(/<div[^>]*>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        // Strip any JSON wrappers if the model wrapped it
        .replace(/^```(?:json|markdown)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      // Clean up duplicate ungrounded reference headers if model generated raw text ones
      generatedMarkdown = generatedMarkdown
        .replace(/\n---\n+##\s*[📚🔗]?\s*(References|Further Reading|Bibliography)[\s\S]*$/i, "")
        .replace(/\n##\s*[📚🔗]?\s*(References|Further Reading|Bibliography)[\s\S]*$/i, "")
        .trimEnd();
    }

    // ── FALLBACK CONTENT if AI returned nothing ──
    if (!generatedMarkdown.trim()) {
      generatedMarkdown = `## 🎯 Learning Objectives

By the end of Day ${dayPlan.dayNumber}, you will understand the key principles of **${dayPlan.concept.name}** at the **${studentLevel}** level.

---

## 1. Introduction & Intuition

${dayPlan.concept.description}

---

## 2. Core Theory & Governing Equations

Today's Topics:

${topics.map((t) => `### ${t}\n\nCore theory, governing equations, and practical application.`).join("\n\n")}

---

## 7. Summary & Key Takeaways

> **Key Point:** Mastery of **${dayPlan.concept.name}** requires firm understanding of both underlying theoretical principles and practical problem-solving.`;
    }

    // ── ALWAYS APPEND PROGRAMMATIC REFERENCES SECTION ──
    // Built from topic/concept name — guaranteed to always be present
    generatedMarkdown += buildReferencesSection({
      conceptName: dayPlan.concept.name,
      courseTitle: dayPlan.course.title,
      topics,
    });

    const nextVersionNumber = lesson.versions.length + 1;

    // Save the new LessonVersion in database (Never overwrite existing versions)
    const newVersion = await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        versionNumber: nextVersionNumber,
        markdownContent: generatedMarkdown,
        generatedByModel: modelName,
      },
    });

    // Update lesson pointer
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { currentVersionNumber: nextVersionNumber },
    });

    return {
      markdownContent: newVersion.markdownContent,
      versionNumber: newVersion.versionNumber,
      totalVersions: nextVersionNumber,
      generatedByModel: newVersion.generatedByModel,
      lessonId: lesson.id,
    };
  }
}
