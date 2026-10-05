import { NextResponse } from "next/server";
import { callAI, isAIConfigured } from "@/lib/gemini";

/**
 * POST /api/ai/lecture
 *
 * Returns raw Markdown (with LaTeX math) for a given course day.
 * The LectureRenderer component renders this with react-markdown + remark-math + rehype-katex.
 *
 * Supports NVIDIA NIM (meta/llama-3.3-70b-instruct, deepseek-r1, etc.), Gemini, and OpenAI.
 */
export async function POST(req: Request) {
  try {
    const { dayTitle, topics, courseTitle, dayNumber, totalDays, revisionNote } = await req.json();

    if (!isAIConfigured()) {
      return NextResponse.json({ markdown: "" });
    }

    const systemPrompt = `You are Cognix AI — an expert academic tutor and professor.
Generate high-quality, comprehensive daily lecture notes for university students.

Output format rules (STRICT):
- Return clean GitHub-Flavored Markdown only. No JSON wrappers. No meta commentary.
- Use ## for major sections, ### for sub-sections.
- For ALL mathematical expressions and circuit equations, use standard LaTeX:
  - Inline math: $...$  (e.g. $2^m = N$)
  - Display/block math: $$...$$ on its own line (e.g. $$Y = \\sum m(1, 3, 5, 7)$$)
- For code / HDL blocks, use fenced code blocks with language identifiers:
  \`\`\`verilog
  ...
  \`\`\`
- For truth tables and state tables, use GFM Markdown tables.
- Use **bold** for key concepts.
- Use > blockquotes for important notes, design tips, and warnings.
- Provide curated source / video / documentation links where applicable using [Link Title](URL).
- Ensure the formulas, code, and explanations are rigorous, clear, and complete.`;

    const userPrompt = `Generate the lecture notes for:

Course: ${courseTitle || "Digital Electronics"}
Day ${dayNumber || 1} of ${totalDays || 30}: ${dayTitle || "Multiplexers (4:1 & 8:1 MUX Architectures)"}
Topics to cover:
${(topics && Array.isArray(topics) ? topics : ["Theory & Architecture", "Boolean Equations", "HDL Implementation"]).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}
${revisionNote ? `\nPrior Mistake to Address / Revise: ${revisionNote}` : ""}

Please include:
1. Clear conceptual introduction.
2. Governing formulas and equations written in LaTeX ($$ for display equations).
3. Functional truth table or comparative state table.
4. Hardware description or software code example.
5. Key design rules & recommended reference link.`;

    const markdown = await callAI(userPrompt, systemPrompt);
    return NextResponse.json({ markdown });
  } catch (error: any) {
    console.error("Lecture API error:", error.message);
    return NextResponse.json({ markdown: "" }, { status: 200 });
  }
}
