import { NextResponse } from "next/server";
import { callGemini, parseGeminiJSON } from "@/lib/gemini";
import { CurriculumService } from "@/lib/ai/services/curriculumService";
import { ConceptNode, DayPlan } from "@/types";

export async function POST(req: Request) {
  try {
    const { title, goal, level, totalDays, minutesPerDay, sources, files } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const systemPrompt = `You are Cognix AI Course Architect & Knowledge Graph Engineer.
Given a course topic, student target goals, syllabus materials, and time budget, you decompose the subject into:
1. A rich, multi-branching Knowledge Tree (Directed Acyclic Graph - DAG) of 6 to 10 foundational Concept Nodes for an interactive flowchart.
2. A day-wise syllabus split for ${totalDays || 30} days, mapping each day to a concept, specific topics, and estimated duration.

MANDATORY TREE & GRAPH STRUCTURE (CRITICAL):
1. NEVER generate a single flat 1-line linear sequence (Node 1 -> Node 2 -> Node 3 -> Node 4). The curriculum MUST branch like a tree!
2. Structure the concepts with multiple branching tracks:
   - Root Node(s) [Level 0]: 1 foundational concept node with NO prerequisites ("prerequisites": []).
   - Parallel Branch Tracks [Level 1]: 2 or 3 distinct specialization concepts that BOTH list the Root node as their prerequisite (e.g. "prerequisites": ["root-id"]).
   - Intermediate Sub-branches [Level 2]: Concepts that deepen Level 1 tracks (e.g. "prerequisites": ["branch-a-id"]).
   - Advanced Convergence / Capstone [Level 3]: 1 or 2 advanced concepts that depend on multiple upstream branches (e.g. "prerequisites": ["branch-a-id", "branch-b-id"]).
3. Ensure prerequisite IDs strictly match the "id" of the corresponding concept in the "concepts" array.
4. Concept names MUST be specific, standard academic topic names (e.g. for Java/OOP: "Classes & Objects", "Inheritance & Method Overriding", "Polymorphism & Dynamic Dispatch", "Interfaces & Abstract Classes", "Exception Handling", "Collections Framework & Generics").
   - NEVER prefix concept names with the course title (do NOT write "${title} - Classes", write "Classes & Objects").
   - NEVER use generic placeholder names like "basics1", "basics2", "Topic 1", "XXXX", or "Core Axioms".
5. The difficulty of all content must be calibrated to the student's knowledge level: ${level || "Intermediate"}.
6. Subtopics must be distinct and progressive — each should correspond to one focused study session.

Output STRICTLY valid JSON matching this schema (NO markdown, no explanation outside JSON):
{
  "description": "Comprehensive course description",
  "category": "Domain category (e.g. Electronic Devices & Circuits, Computer Science, Applied Mathematics)",
  "concepts": [
    {
      "id": "c-unique-id",
      "name": "Specific Domain Concept Name",
      "slug": "concept-slug",
      "status": "completed" | "current" | "upcoming",
      "masteryPercentage": 0,
      "importance": "high" | "medium" | "low",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "estimatedMinutes": 90,
      "description": "What this concept teaches, grounded in the domain",
      "prerequisites": ["prerequisite-id"],
      "keyFormulas": ["Exact domain formula 1", "Exact domain formula 2"],
      "dayAssigned": 1
    }
  ],
  "daysList": [
    {
      "dayNumber": 1,
      "title": "Day Title",
      "conceptId": "matching-c-id",
      "status": "completed" | "current" | "locked",
      "topicsCovered": ["Specific Topic A", "Specific Topic B"],
      "durationMinutes": 60,
      "sourceLink": {
        "title": "Resource title",
        "source": "Source name",
        "url": "https://...",
        "duration": "15 mins"
      }
    }
  ]
}

Set concept #1 to status "current" (mastery 0%) and the rest to "upcoming". Set day #1 to status "current" and the rest to "locked".`;

    const userPrompt = `Create a complete adaptive branching knowledge tree curriculum:
Course Title: ${title}
Learning Goal: ${goal || "Master all foundational and advanced topics systematically"}
Student Knowledge Level: ${level || "Intermediate"}
Total Time Budget: ${totalDays || 30} Days, ${minutesPerDay || 60} Minutes/Day
Uploaded Syllabi/Materials: ${files && files.length > 0 ? files.join(", ") : "Standard textbook curriculum"}
Source Links / Playlists: ${sources && sources.length > 0 ? sources.join(", ") : "Curated high-yield video lectures"}

Generate a domain-accurate, multi-branching tree knowledge graph for this course with real branching prerequisites.`;

    try {
      const rawText = await callGemini(userPrompt, systemPrompt);
      const parsed = parseGeminiJSON<{
        description: string;
        category: string;
        concepts: ConceptNode[];
        daysList: DayPlan[];
      }>(rawText);

      return NextResponse.json(parsed);
    } catch (apiError: any) {
      console.warn("Gemini API not configured or failed, using CurriculumService fallback:", apiError?.message);

      // Use the CurriculumService domain-adaptive fallback (no hardcoded generic concepts)
      const curriculum = await CurriculumService.generateCurriculum({
        title,
        goal: goal || "Master all foundational and advanced topics systematically",
        level: level || "Intermediate",
        totalDays: Math.max(5, Math.min(totalDays || 30, 45)),
        minutesPerDay: minutesPerDay || 60,
        sourceContext: sources && sources.length > 0 ? `Source references: ${sources.join(", ")}` : "",
      });

      // Map GeneratedConcept[] to ConceptNode[] for frontend compatibility
      const conceptNodes: ConceptNode[] = curriculum.concepts.map((c, i) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: i === 0 ? "current" : "upcoming",
        masteryPercentage: 0,
        importance: c.importance,
        difficulty: c.difficulty,
        estimatedMinutes: c.estimatedMinutes,
        dayAssigned: c.dayAssigned,
        description: c.description,
        prerequisites: c.prerequisites,
        keyFormulas: c.keyFormulas || [],
      }));

      const daysList: DayPlan[] = curriculum.daysList.map((d, i) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        conceptId: d.conceptId,
        status: i === 0 ? "current" : "locked",
        topicsCovered: d.topicsCovered,
        durationMinutes: d.durationMinutes,
        sourceLink: {
          title: `${title} — Day ${d.dayNumber} Materials`,
          source: sources && sources[0] ? "User Linked Playlist" : "Cognix Curated Courseware",
          url: sources && sources[0] ? sources[0] : "https://youtube.com",
          duration: `${d.durationMinutes} mins`,
        },
      }));

      return NextResponse.json({
        description: curriculum.description,
        category: curriculum.category,
        concepts: conceptNodes,
        daysList,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate course" }, { status: 500 });
  }
}
