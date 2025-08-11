# Resume Parser & Screener (Next.js + Gemini)

🚀 **Live Demo:** [https://resume-ats-checker-two.vercel.app/](https://resume-ats-checker-two.vercel.app/)

A full-stack web app that:
- Uploads a resume (PDF or DOCX).
- Parses it on the backend using `pdf-parse` (PDF) and `mammoth` (DOCX).
- Compares with a job description using Google Gemini (free API) via the AI SDK.
- Returns a structured JSON with score, strengths, missing skills, and suggestions.
- Displays the results with a progress bar and sections.

## Tech Stack

- Next.js App Router with Route Handlers for backend endpoints (public HTTP endpoints) [^2].
- AI SDK with Google Gemini (`@ai-sdk/google`) using `generateText` [^5].
- Tailwind CSS + shadcn/ui for UI components and responsive design.
- Server-only environment variable `GEMINI_API_KEY` [^1].

## Features

- Separate API routes:
  - `POST /api/parse` — handles file upload and parsing (PDF via `pdf-parse`, DOCX via `mammoth`).
  - `POST /api/analyze` — runs AI comparison (Gemini) and returns structured JSON.
- Strict JSON schema on server:
  ```json
  {
    "score": 0,
    "strengths": [],
    "missingSkills": [],
    "suggestions": []
  }
