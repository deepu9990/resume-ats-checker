import type { AnalysisResult } from "@/lib/types";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type AnalyzeBody = {
  resumeText: string;
  jobDescription: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const { resumeText, jobDescription } = body || {};

    if (!resumeText || !jobDescription) {
      return new Response("Both resumeText and jobDescription are required.", {
        status: 400,
      });
    }

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        "Google Generative AI API key is missing. Please check your environment configuration.",
        { status: 500 }
      );
    }

    const model = google("gemini-1.5-flash");

    const system =
      "You are an expert technical recruiter and resume screener. " +
      "Compare a resume to a job description and score the match objectively. " +
      "Only respond with a single valid JSON object matching the required schema. " +
      "No prose, no markdown, no code fences.";

    const prompt = `
Required JSON schema (no additional keys):
{
  "score": number between 0 and 100,
  "strengths": string[],
  "missingSkills": string[],
  "suggestions": string[]
}

Instructions:
- Score based on relevance of skills, experience, tools, and responsibilities.
- strengths: concrete and specific matches.
- missingSkills: important skills from the job description that are not clearly present in the resume.
- suggestions: actionable, brief improvements to increase the score.
- Output ONLY the JSON object and ensure it is strictly valid JSON.

Resume:
"""
${resumeText}
"""

Job Description:
"""
${jobDescription}
"""
`;

    const { text } = await generateText({
      model,
      system,
      prompt,
    });

    const parsed = safeParseJSON(text);
    if (!parsed) {
      return new Response("AI returned non-JSON content. Please try again.", {
        status: 502,
      });
    }

    const validated = sanitizeAndValidate(parsed);
    if (!validated.ok) {
      return new Response(`Invalid AI JSON: ${validated.error}`, {
        status: 502,
      });
    }

    const result: AnalysisResult = validated.value;
    return Response.json(result);
  } catch (err: any) {
    const msg = err?.message ?? "Failed to analyze.";
    return new Response(msg, { status: 500 });
  }
}

function safeParseJSON(raw: string): unknown | null {
  // Strip code fences if present
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}$/m);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeAndValidate(
  obj: any
): { ok: true; value: AnalysisResult } | { ok: false; error: string } {
  if (typeof obj !== "object" || obj === null)
    return { ok: false, error: "Not an object" };

  let { score, strengths, missingSkills, suggestions } =
    obj as Partial<AnalysisResult>;

  // Coerce and validate score
  if (typeof score !== "number" || Number.isNaN(score)) {
    return { ok: false, error: "score must be a number" };
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Normalize arrays
  const normArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => String(x)).filter((s) => s.trim().length > 0)
      : [];

  strengths = normArray(strengths);
  missingSkills = normArray(missingSkills);
  suggestions = normArray(suggestions);

  return {
    ok: true,
    value: {
      score,
      strengths,
      missingSkills,
      suggestions,
    },
  };
}
