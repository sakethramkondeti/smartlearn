import { NextResponse } from "next/server";
import { callGemini, parseGeminiJSON } from "@/lib/gemini";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function POST(req: Request) {
  try {
    const { dayTitle, topics, courseTitle, dayNumber } = await req.json();

    const systemPrompt = `You are Cognix AI Assessment Engine.
Generate exactly 3 multiple choice diagnostic questions to verify a student's mastery of the day's topics.
Questions must test true comprehension, formulas, and error diagnosis, not superficial facts.
Output STRICTLY valid JSON matching:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "explanation": "Why this option is correct and why others fail."
    }
  ]
}`;

    const userPrompt = `Generate a 3-question diagnostic quiz for:
Course: ${courseTitle || "Digital Electronics"}
Day ${dayNumber || 1}: ${dayTitle || "Multiplexers"}
Topics: ${topics ? topics.join(", ") : "Select lines rule, Boolean equations, Enable strobe"}`;

    try {
      const rawText = await callGemini(userPrompt, systemPrompt);
      const parsed = parseGeminiJSON<{ questions: QuizQuestion[] }>(rawText);
      return NextResponse.json(parsed);
    } catch (apiError: any) {
      console.warn("Gemini API not configured or failed, using robust diagnostic quiz fallback:", apiError?.message);

      const fallbackQuestions: QuizQuestion[] = [
        {
          id: 1,
          question: "How many select lines (m) are required to build a 64:1 Multiplexer?",
          options: ["4 select lines", "5 select lines", "6 select lines (since 2⁶ = 64)", "8 select lines"],
          correctIndex: 2,
          explanation: "Applying the rule 2ᵐ = N with N = 64 gives 2⁶ = 64, so exactly 6 select lines are required."
        },
        {
          id: 2,
          question: "If an active-low Enable input (EN') of a 4:1 MUX is connected to Logic 1 (+5V), what is the output Y?",
          options: [
            "Y always follows data line I₀",
            "Y is disabled and stays at logic 0 (or High-Z)",
            "Y inverts all incoming data channels",
            "The circuit enters an undefined meta-stable oscillation"
          ],
          correctIndex: 1,
          explanation: "Because the enable line is active-low (EN'), applying logic 1 disables the internal AND gates, forcing Y to 0."
        },
        {
          id: 3,
          question: "To implement an arbitrary 3-variable logic function F(A,B,C) = Σm(1,3,4,6,7) using a 4:1 MUX with A,B as select lines, what is the residue connected to I₀?",
          options: [
            "I₀ = C",
            "I₀ = C'",
            "I₀ = 0",
            "I₀ = 1"
          ],
          correctIndex: 0,
          explanation: "For AB = 00 (Channel I₀), the minterms are m(0) and m(1). Minterm 0 is absent (0) and minterm 1 is present (1). Thus when C=0, F=0; when C=1, F=1. This simplifies to I₀ = C."
        }
      ];

      return NextResponse.json({ questions: fallbackQuestions });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}

