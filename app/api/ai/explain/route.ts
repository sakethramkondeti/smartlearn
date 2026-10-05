import { NextResponse } from "next/server";
import { callGemini, parseGeminiJSON } from "@/lib/gemini";

/**
 * POST /api/ai/explain
 *
 * Summarizes a user-selected passage from lecture content.
 * Returns a structured summary with core idea, key terms, and a memorable insight.
 */
export async function POST(req: Request) {
  try {
    const { concept, context, courseTitle } = await req.json();

    if (!concept) {
      return NextResponse.json({ error: "Concept is required" }, { status: 400 });
    }

    // Determine if this is a selection (>30 chars) or a short concept name
    const isFullSelection = concept.length > 30;

    const systemPrompt = isFullSelection
      ? `You are Cognix AI — a brilliant tutor who summarizes educational content for students.
The user has selected a passage from a lecture. Summarize it clearly and helpfully.
Structure your output STRICTLY as valid JSON matching this schema:
{
  "simpleExplanation": "A clear 2-3 sentence summary of what the selected text is saying, in simpler language. Start with the core idea.",
  "example": "A concrete example or analogy that makes this concept click, or a related calculation if applicable",
  "keyFormula": "The most important formula or expression mentioned, in LaTeX style, or null if none",
  "tip": "One key takeaway, insight, or memory trick from this passage"
}`
      : `You are Cognix AI — a brilliant tutor who explains engineering and science concepts.
Keep explanations concise (under 180 words), intuitive, and easy to grasp.
Structure your output STRICTLY as valid JSON matching this schema:
{
  "simpleExplanation": "Clear, direct conceptual breakdown in 2-3 sentences",
  "example": "A real-world or intuitive mathematical example",
  "keyFormula": "The formula in clean LaTeX style if applicable, or null",
  "tip": "One key intuition or mnemonic to remember it easily"
}`;

    const userPrompt = isFullSelection
      ? `Course: ${courseTitle || "Engineering / Science"}
Lesson Context: ${context || "Daily lecture"}

Selected passage to summarize:
"""
${concept}
"""

Provide a clear, structured summary of this passage for a student.`
      : `Course: ${courseTitle || "Computer Science / Engineering"}
Target Concept / Formula: ${concept}
Lesson Context: ${context || "Daily lecture"}

Provide a structured, easy-to-understand explanation for this concept.`;

    try {
      const rawResponse = await callGemini(userPrompt, systemPrompt);
      const parsed = parseGeminiJSON<{
        simpleExplanation: string;
        example: string;
        keyFormula: string | null;
        tip: string;
      }>(rawResponse);

      return NextResponse.json(parsed);
    } catch (apiError: any) {
      console.warn("Gemini API failed in explain route:", apiError?.message);

      // Graceful contextual fallback
      return NextResponse.json({
        simpleExplanation: `This passage discusses ${concept.substring(0, 60)}... It covers the fundamental operating principles and governing relationships between the key parameters involved.`,
        example: `Consider a practical scenario: when the input signal changes, the system responds according to the equations and constraints described above, producing a measurable output change.`,
        keyFormula: null,
        tip: `Break complex relationships down into individual components. Understand what each variable represents physically before applying any formula.`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate explanation" }, { status: 500 });
  }
}
