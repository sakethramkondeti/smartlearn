import fs from "fs";
import path from "path";
import Groq from "groq-sdk";

/**
 * Universal AI client for Cognix using official Groq SDK.
 */

// Helper to ensure env variables from .env.local are accessible
function getEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(new RegExp(`^${key}=([^\\r\\n]+)`, "m"));
      if (match) return match[1].trim();
    }
  } catch {}

  return undefined;
}

export function isAIConfigured(): boolean {
  return Boolean(
    getEnv("GROQ_API_KEY") ||
    getEnv("NVIDIA_API_KEY") ||
    getEnv("NVAPI_KEY") ||
    getEnv("GEMINI_API_KEY") ||
    getEnv("OPENAI_API_KEY")
  );
}

/**
 * Call the configured AI provider (Groq SDK, NVIDIA, Gemini, or OpenAI)
 */
export async function callAI(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const groqKey = getEnv("GROQ_API_KEY");
  const nvidiaKey = getEnv("NVIDIA_API_KEY") || getEnv("NVAPI_KEY");
  const geminiKey = getEnv("GEMINI_API_KEY");
  const openaiKey = getEnv("OPENAI_API_KEY");

  // 1. Official Groq SDK (Ultra-fast LPU inference)
  if (groqKey) {
    const model = getEnv("GROQ_MODEL") || "openai/gpt-oss-120b";
    const groq = new Groq({ apiKey: groqKey });

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_completion_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response returned from Groq SDK");
    }
    return content;
  }

  // 2. NVIDIA NIM
  if (nvidiaKey) {
    const model = getEnv("NVIDIA_MODEL") || "meta/llama-3.3-70b-instruct";
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${nvidiaKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NVIDIA API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in NVIDIA response: " + JSON.stringify(data));
    }
    return content;
  }

  // 3. Google Gemini
  if (geminiKey) {
    const model = getEnv("GEMINI_MODEL") || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text in Gemini response: " + JSON.stringify(data));
    }
    return text;
  }

  // 4. OpenAI
  if (openaiKey) {
    const model = getEnv("OPENAI_MODEL") || "gpt-4o-mini";
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  throw new Error(
    "No AI API key configured. Add GROQ_API_KEY to your .env.local file."
  );
}

export const callGemini = callAI;

/**
 * Parse JSON from LLM response, stripping markdown code fences if present.
 */
export function parseGeminiJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return JSON.parse(cleaned) as T;
}
