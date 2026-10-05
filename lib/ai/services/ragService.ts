import { getAIProvider } from "../provider";

/**
 * Model 1: Source Ingestion & RAG Extraction Engine
 *
 * Responsibilities:
 * - Extract text from uploaded PDF/document files
 * - Parse and scrape syllabus/article URLs and YouTube lecture references
 * - Semantic chunking into optimal context windows
 * - AI Knowledge distillation: Extracts key topics, formulas, prerequisite dependencies
 * - Build ordered topic flowchart for Model 2 curriculum synthesis
 */

export interface SourceChunk {
  id: string;
  sourceTitle: string;
  sourceType: "file" | "url" | "document";
  content: string;
  chapterOrTopic?: string;
  tokensEstimate: number;
}

export interface ExtractedUnit {
  title: string;
  subtopics: string[];
  formulas: string[];
}

export interface ExtractedKnowledgeContext {
  summary: string;
  keyTopics: string[];
  keyFormulas: string[];
  units: ExtractedUnit[];
  chunks: SourceChunk[];
  fullTextPreview: string;
}

export class RAGService {
  /**
  /**
   * Strips null bytes (\0, \u0000) and dangerous binary control characters
   * that PostgreSQL text/varchar columns strictly reject (code 22021).
   */
  static cleanString(str: string): string {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/\0/g, "")
      .replace(/\u0000/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
  }

  /**
   * Filter out noisy preamble content from PDF text:
   * - Pages that are nearly empty (< 100 chars after trim)
   * - Sections that are clearly cover/meta: copyright, preface, TOC, acknowledgements
   * - Hyphenated line-breaks from PDF reflow
   * - Running headers (short repeated lines at top of each page)
   * - Decorative separator lines (===, ---, ***)
   * - Bare page numbers and single-word lines
   */
  static filterPDFNoise(rawText: string): string {
    const noiseHeadings = [
      /^(table of contents|contents)\s*$/im,
      /^(copyright|©|all rights reserved)/im,
      /^(preface|foreword|acknowledgements?|dedication)\s*$/im,
      /^(about the author|about this book)\s*$/im,
      /^(index)\s*$/im,
      /^(bibliography|references)\s*$/im,
    ];

    // First pass: sanitize null bytes & control chars, rejoin hyphenated line-breaks from PDF reflow
    let text = RAGService.cleanString(rawText).replace(/-\n([a-z])/g, "$1");

    // Remove decorative separator lines
    text = text.replace(/^[\s=\-_*•~]{4,}\s*$/gm, "");

    const pageSegments = text.split(/\f|\n{4,}/);

    // Detect running headers: lines < 60 chars that appear identically on 3+ pages
    const lineFrequency = new Map<string, number>();
    pageSegments.forEach((seg) => {
      const firstLine = seg.trim().split("\n")[0]?.trim() || "";
      if (firstLine.length > 0 && firstLine.length < 60) {
        lineFrequency.set(firstLine, (lineFrequency.get(firstLine) || 0) + 1);
      }
    });
    const runningHeaders = new Set(
      [...lineFrequency.entries()].filter(([, count]) => count >= 3).map(([line]) => line)
    );

    const contentPages = pageSegments.filter((segment) => {
      const trimmed = segment.trim();
      if (trimmed.length < 100) return false;
      const firstLines = trimmed.slice(0, 300).toLowerCase();
      for (const noisePattern of noiseHeadings) {
        if (noisePattern.test(firstLines)) return false;
      }
      return true;
    });

    const cleanedPages = contentPages.map((page) => {
      return page
        .split("\n")
        .filter((line) => {
          const t = line.trim();
          // Remove bare page numbers
          if (/^\d+$/.test(t)) return false;
          // Remove very short lines
          if (t.length < 4) return false;
          // Remove running headers
          if (runningHeaders.has(t)) return false;
          // Remove pure separator lines
          if (/^[\-=_*]{3,}$/.test(t)) return false;
          return true;
        })
        .join("\n");
    });

    return cleanedPages.join("\n\n");
  }

  /**
   * 1. Extract text from uploaded PDF buffer (with preamble noise filtering)
   */
  static async extractFromPDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
    try {
      // Dynamic import of pdf-parse for Node.js runtime compatibility
      // @ts-ignore
      const pdfParse = (await import("pdf-parse")).default || (await import("pdf-parse"));
      const data = await pdfParse(buffer);
      const rawText = RAGService.cleanString(data.text || "");
      const filteredText = RAGService.filterPDFNoise(rawText);
      return {
        text: RAGService.cleanString(filteredText || rawText),
        numPages: data.numpages || 1,
      };
    } catch (error: any) {
      console.warn("PDF Parse fallback / error:", error?.message || error);
      return {
        text: RAGService.cleanString(buffer.toString("utf-8")).slice(0, 10000),
        numPages: 1,
      };
    }
  }


  /**
   * 2. Extract content from URLs (YouTube links, documentation, web articles)
   */
  static async extractFromUrl(url: string): Promise<{ title: string; content: string }> {
    try {
      const isYouTube = /youtube\.com|youtu\.be/i.test(url);
      if (isYouTube) {
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : "video";
        return {
          title: `YouTube Video Lecture (${videoId})`,
          content: `Video Source: ${url}\nSyllabus video lecture reference covering technical concepts and problem derivations.`,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const cleanText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();

        return {
          title: url.replace(/^https?:\/\//, "").slice(0, 60),
          content: cleanText.slice(0, 15000),
        };
      }
    } catch (err) {
      console.warn(`URL extraction fallback for ${url}:`, err);
    }

    return {
      title: url.replace(/^https?:\/\//, "").slice(0, 50),
      content: `Reference URL: ${url}\nOnline educational curriculum reference material.`,
    };
  }

  /**
   * 3. Deep Structural Extractor: Parses Units, Chapters, Sections, Subtopics, and Formulas
   *
   * Handles common syllabus formats:
   *   - "UNIT I — Semiconductor Physics"
   *   - "Unit-II: Transistors"
   *   - "Module 3 — BJT Amplifiers"
   *   - "Chapter 5: Feedback"
   *   - "1.1 Energy Band Theory"
   *   - ALL-CAPS headings (4+ words)
   *   - Bold markdown headings (## or **)
   */
  static extractDocumentStructure(rawText: string): ExtractedUnit[] {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const units: ExtractedUnit[] = [];
    let currentUnit: ExtractedUnit | null = null;

    // Matches: UNIT I, UNIT-II, Unit 3, MODULE 1, Chapter 5, PART II, SECTION A
    const unitRegex = /^(?:UNIT|MODULE|CHAPTER|PART|SECTION)\s*[-–]?\s*([IVXivx0-9A-Z]+)\s*[:\-–—.]?\s*(.*)/i;
    // Matches: 1.1 Topic Name, 2.3.1 Sub-Topic
    const sectionHeaderRegex = /^(\d+(?:\.\d+)*)\s+([A-Z][A-Za-z0-9\s\-\(\)\/\&\,]{3,70})$/;
    // Matches markdown headings: ## Topic Name or **Topic Name**
    const markdownHeadingRegex = /^#{1,3}\s+(.+)$|^\*{1,2}([^*]+)\*{1,2}\s*$/;
    // ALL-CAPS lines that are likely section headings (4-10 meaningful words)
    const allCapsHeadingRegex = /^[A-Z][A-Z0-9\s\-\&\/\(\)]{15,80}$/;

    // Enhanced formula detection: LaTeX, Greek symbols, EE/Physics patterns
    const formulaRegex =
      /[=≈∝∑∫∂αβγδεζηθλμνπρσφωΩ]|V_|I_|R_|Z_|H\(s\)|F\(s\)|jω|\b(exp|log|ln|sin|cos|tan|sqrt|lim|d\/dt)\b|\^[0-9]|\b[VIRECP]\s*=/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;

      // --- Unit / Module / Chapter heading ---
      const unitMatch = trimmed.match(unitRegex);
      if (unitMatch) {
        if (currentUnit && (currentUnit.subtopics.length > 0 || currentUnit.formulas.length > 0)) {
          units.push(currentUnit);
        }
        const rawTitle = (unitMatch[2] || "").trim();
        currentUnit = {
          title:
            rawTitle.replace(/^[—\-\:\.\s]+/, "").trim() ||
            `${trimmed.match(/^[A-Za-z]+/)?.[0] || "Unit"} ${unitMatch[1]}`,
          subtopics: [],
          formulas: [],
        };
        continue;
      }

      // --- Numbered section heading (1.1 Topic Name) ---
      const sectionMatch = trimmed.match(sectionHeaderRegex);
      if (sectionMatch) {
        if (!currentUnit) {
          currentUnit = { title: "Foundations & Core Principles", subtopics: [], formulas: [] };
        }
        const topicName = sectionMatch[2].trim();
        if (!currentUnit.subtopics.includes(topicName)) {
          currentUnit.subtopics.push(topicName);
        }
        continue;
      }

      // --- Markdown headings ---
      const mdMatch = trimmed.match(markdownHeadingRegex);
      if (mdMatch) {
        const heading = (mdMatch[1] || mdMatch[2] || "").trim();
        if (heading.length >= 4 && heading.length <= 80) {
          if (!currentUnit) {
            currentUnit = { title: heading, subtopics: [], formulas: [] };
          } else if (!currentUnit.subtopics.includes(heading)) {
            currentUnit.subtopics.push(heading);
          }
          continue;
        }
      }

      // --- ALL-CAPS heading candidate ---
      if (allCapsHeadingRegex.test(trimmed) && trimmed.split(" ").length >= 3) {
        const titleCased = trimmed
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        if (!currentUnit) {
          currentUnit = { title: titleCased, subtopics: [], formulas: [] };
        } else if (!currentUnit.subtopics.includes(titleCased)) {
          currentUnit.subtopics.push(titleCased);
        }
        continue;
      }

      // --- Content lines: formulas and sub-topics ---
      if (currentUnit) {
        const segments = trimmed
          .split(/[,;•\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);

        for (const segment of segments) {
          if (formulaRegex.test(segment) && segment.length < 100) {
            if (!currentUnit.formulas.includes(segment)) {
              currentUnit.formulas.push(segment);
            }
          } else if (segment.length >= 4 && segment.length <= 90) {
            const cleanTopic = segment.replace(/^[0-9\.a-z]\.\s+/, "").replace(/^[\-\*\•\s]+/, "").trim();
            if (
              cleanTopic.length >= 4 &&
              !currentUnit.subtopics.includes(cleanTopic) &&
              // Avoid capturing prose sentences (ends with period mid-sentence)
              !/[,:]$/.test(cleanTopic)
            ) {
              currentUnit.subtopics.push(cleanTopic);
            }
          }
        }
      }
    }

    if (currentUnit && (currentUnit.subtopics.length > 0 || currentUnit.formulas.length > 0)) {
      units.push(currentUnit);
    }

    return units;
  }

  /**
   * 4. Process raw text into structured semantic context and units
   */
  static processSourceContent(
    sourceTitle: string,
    sourceType: "file" | "url" | "document",
    rawContent: string
  ): ExtractedKnowledgeContext {
    const cleanContent = rawContent.replace(/\r\n/g, "\n").trim();
    const units = RAGService.extractDocumentStructure(cleanContent);
    const paragraphs = cleanContent.split(/\n{2,}/).filter((p) => p.trim().length > 20);

    const chunks: SourceChunk[] = [];
    let currentChunk = "";
    let chunkIndex = 1;

    for (const paragraph of paragraphs) {
      if ((currentChunk + "\n\n" + paragraph).length > 1200) {
        if (currentChunk.trim()) {
          chunks.push({
            id: `chunk-${chunkIndex++}`,
            sourceTitle,
            sourceType,
            content: currentChunk.trim(),
            tokensEstimate: Math.round(currentChunk.length / 4),
          });
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `chunk-${chunkIndex++}`,
        sourceTitle,
        sourceType,
        content: currentChunk.trim(),
        tokensEstimate: Math.round(currentChunk.length / 4),
      });
    }

    // Collect all topics and formulas from the extracted units
    const keyTopics: string[] = [];
    const keyFormulas: string[] = [];

    if (units.length > 0) {
      units.forEach((u) => {
        keyTopics.push(u.title);
        u.subtopics.slice(0, 5).forEach((st) => {
          if (!keyTopics.includes(st)) keyTopics.push(st);
        });
        u.formulas.slice(0, 3).forEach((f) => {
          if (!keyFormulas.includes(f)) keyFormulas.push(f);
        });
      });
    } else {
      const headerTopics = cleanContent
        .split("\n")
        .filter((line) => line.trim().startsWith("#") || line.trim().startsWith("- ") || line.trim().startsWith("• "))
        .map((line) => line.replace(/^[#•\-\s]+/, "").trim())
        .filter((t) => t.length > 3 && t.length < 80);

      keyTopics.push(...(headerTopics.length > 0 ? headerTopics.slice(0, 15) : ["Core Foundations", "Applied Principles"]));
    }

    // Build ordered unit flowchart preview for Model 2
    let fullTextPreview = "";
    if (units.length > 0) {
      fullTextPreview = units
        .map(
          (u, i) =>
            `Unit ${i + 1}: ${u.title}\n  Topics: ${u.subtopics.slice(0, 6).join(", ")}\n  Formulas: ${u.formulas.slice(0, 3).join(" | ")}`
        )
        .join("\n\n");
    } else {
      // Fall back to raw text but intelligently trimmed from start of actual content
      const contentStart = Math.min(500, cleanContent.length);
      fullTextPreview = cleanContent.slice(contentStart, contentStart + 8000);
    }

    return {
      summary: cleanContent.slice(0, 800) + (cleanContent.length > 800 ? "..." : ""),
      keyTopics: keyTopics.slice(0, 25),
      keyFormulas: keyFormulas.slice(0, 15),
      units,
      chunks,
      fullTextPreview,
    };
  }

  /**
   * 5. AI-Powered Knowledge Distillation (Model 1 Deep RAG)
   *
   * Anti-hallucination: sends ALL extracted unit titles/subtopics (not raw text slice)
   * to the AI so it only summarizes what was actually extracted.
   */
  static async distillKnowledgeContext(params: {
    courseTitle: string;
    learningGoal: string;
    extractedText: string;
  }): Promise<{
    summary: string;
    chapters: string[];
    formulas: string[];
    keyTerms: string[];
  }> {
    const ai = getAIProvider();

    // Extract structure first so we send structured data to AI (not raw text slice)
    const units = RAGService.extractDocumentStructure(params.extractedText);
    const unitsContext =
      units.length > 0
        ? units
            .map(
              (u, i) =>
                `Unit ${i + 1}: ${u.title}\n  Subtopics: ${u.subtopics.join(", ")}\n  Formulas: ${u.formulas.join(", ")}`
            )
            .join("\n\n")
        : params.extractedText.slice(0, 12000);

    const systemPrompt = `You are Model 1: The Cognix Knowledge & Source Ingestion Engine.
Analyze the STRUCTURED source content below and distill it into precise learning concepts.

HALLUCINATION GUARD — CRITICAL RULES:
1. Only use topics, formulas, and domain vocabulary explicitly present in the source material below.
2. Do NOT invent topic names, chapter titles, or formulas that are not in the source.
3. Use the EXACT terminology from the source.
4. If the source is sparse, report what is there — do not pad with generic content.

Return ONLY a valid JSON object (no markdown, no explanation) matching this exact schema:
{
  "summary": "2-3 sentence overview of the syllabus domain based on the source",
  "chapters": ["Exact chapter/unit title 1", "Exact chapter/unit title 2"],
  "formulas": ["Exact formula 1", "Exact formula 2"],
  "keyTerms": ["Domain term 1", "Domain term 2", "Domain term 3"]
}`;

    const userPrompt = `Course: ${params.courseTitle}
Goal: ${params.learningGoal}

Structured Source Content (ALL extracted units):
${unitsContext}

Distill the core knowledge units from the above source content. Stay strictly grounded to what is in the source.`;

    if (!ai) {
      return {
        summary: `Syllabus material for ${params.courseTitle} focused on ${params.learningGoal}.`,
        chapters: units.length > 0 ? units.map((u) => u.title) : ["Core Foundations", "Applied Principles"],
        formulas: units.flatMap((u) => u.formulas),
        keyTerms: [params.courseTitle, "Fundamentals", "Applications"],
      };
    }

    try {
      const result = await ai.generateJSON<{
        summary: string;
        chapters: string[];
        formulas: string[];
        keyTerms: string[];
      }>(userPrompt, systemPrompt);

      // Validate — reject suspiciously generic results
      if (
        result &&
        Array.isArray(result.chapters) &&
        result.chapters.length > 0 &&
        !result.chapters[0].toLowerCase().includes("chapter 1")
      ) {
        return result;
      }

      throw new Error("AI returned generic/invalid chapters, using structural fallback");
    } catch (err) {
      console.warn("Model 1 AI distillation fallback:", err);
      return {
        summary: `Syllabus material for ${params.courseTitle} covering ${units.map((u) => u.title).join(", ")}.`,
        chapters: units.length > 0 ? units.map((u) => u.title) : ["Core Foundations", "Applied Principles"],
        formulas: units.flatMap((u) => u.formulas).slice(0, 10),
        keyTerms: units.flatMap((u) => u.subtopics.slice(0, 2)).slice(0, 10),
      };
    }
  }

  /**
   * 6. Build ordered topic flowchart for Model 2 curriculum synthesis.
   *    Returns a dependency-ordered list of unit → subtopic chains.
   */
  static buildTopicFlowchart(units: ExtractedUnit[]): string {
    if (units.length === 0) return "";
    return units
      .map((u, i) => {
        const prereq = i > 0 ? ` (requires: ${units[i - 1].title})` : " (entry point)";
        const topicList = u.subtopics.slice(0, 8).join(" → ");
        return `[${i + 1}] ${u.title}${prereq}\n    Learning path: ${topicList || "Core principles and applications"}`;
      })
      .join("\n\n");
  }
}
