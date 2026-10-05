import { getAIProvider } from "../provider";
import { prisma } from "@/lib/db";

/**
 * Model 4: Revision Generator Service
 *
 * Responsibilities:
 * - Analyze concepts and recent diagnostic mistakes
 * - Create concise 5-minute active recall drill cards
 * - Extract key formulas and common pitfalls
 */

export interface RevisionCardData {
  title: string;
  summary: string;
  keyFormulas: string[];
  keyPoints: string[];
  mistakeTip?: string;
}

export class RevisionService {
  static async getOrCreateRevision(params: {
    courseId: string;
    dayNumber: number;
  }): Promise<RevisionCardData> {
    const { courseId, dayNumber } = params;

    const dayPlan = await prisma.dayPlan.findUnique({
      where: {
        courseId_dayNumber: {
          courseId,
          dayNumber,
        },
      },
      include: {
        concept: true,
        revisions: true,
      },
    });

    if (!dayPlan) {
      throw new Error(`Day plan not found for course ${courseId}, Day ${dayNumber}`);
    }

    // Check if revision already exists in DB
    if (dayPlan.revisions.length > 0) {
      const existing = dayPlan.revisions[0];
      return {
        title: existing.title,
        summary: existing.summary,
        keyFormulas: existing.keyFormulas ? JSON.parse(existing.keyFormulas) : [],
        keyPoints: existing.keyPoints ? JSON.parse(existing.keyPoints) : [],
        mistakeTip: existing.mistakeTarget || undefined,
      };
    }

    const provider = getAIProvider();
    let generated: RevisionCardData | null = null;

    if (provider) {
      const systemPrompt = `You are Cognix AI Revision Engine.
Generate a concise, 5-minute active recall revision card.
Return strictly valid JSON matching:
{
  "title": "Short title",
  "summary": "2-3 sentences concise summary",
  "keyFormulas": ["Formula 1", "Formula 2"],
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "mistakeTip": "Crucial mistake to avoid"
}`;

      const userPrompt = `Generate a 5-minute revision card for:
Concept: ${dayPlan.concept.name}
Description: ${dayPlan.concept.description}
${dayPlan.mistakeConcept ? `Previous Student Mistake to Address: ${dayPlan.mistakeConcept}` : ""}`;

      try {
        generated = await provider.generateJSON<RevisionCardData>(userPrompt, systemPrompt);
      } catch (err) {
        console.warn("Revision AI generation fallback:", err);
      }
    }

    if (!generated) {
      const formulas = dayPlan.concept.keyFormulas ? JSON.parse(dayPlan.concept.keyFormulas) : [];
      generated = {
        title: `Quick Revision: ${dayPlan.concept.name}`,
        summary: `Active recall overview for ${dayPlan.concept.name}. Review governing equations, fundamental definitions, and boundary conditions.`,
        keyFormulas: formulas.length > 0 ? formulas.slice(0, 2) : [],
        keyPoints: [
          `Verify all initial state assumptions and operational limits for ${dayPlan.concept.name}.`,
          `Ensure correct algebraic steps and unit consistency in numerical problems.`,
          `Cross-reference output values against standard analytical benchmarks.`,
        ],
        mistakeTip: dayPlan.mistakeConcept || `Pay close attention to boundary constraints and sign conventions in ${dayPlan.concept.name}.`,
      };
    }


    // Save in database
    await prisma.revisionNote.create({
      data: {
        courseId,
        dayPlanId: dayPlan.id,
        conceptId: dayPlan.conceptId,
        title: generated.title,
        summary: generated.summary,
        keyFormulas: JSON.stringify(generated.keyFormulas),
        keyPoints: JSON.stringify(generated.keyPoints),
        mistakeTarget: generated.mistakeTip || null,
      },
    });

    return generated;
  }
}

