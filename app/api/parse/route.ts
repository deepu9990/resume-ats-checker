import mammoth from "mammoth";
// @ts-ignore - pdf-parse/lib/pdf-parse.js doesn't have type definitions
import * as parser from "pdf-parse/lib/pdf-parse.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    console.log("Received request to parse file...");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return new Response("No file uploaded.", { status: 400 });

    console.log("Received file:", file.name, file.type);
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(ab));
    console.log(
      "Buffer length:",
      buffer.length,
      "isBuffer:",
      Buffer.isBuffer(buffer)
    );

    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const data = await parser(buffer);
      text = data.text || "";
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else {
      return new Response("Unsupported file type", { status: 400 });
    }

    text = text
      .replace(/\u0000/g, " ")
      .replace(/\s+\n/g, "\n")
      .trim();
    return Response.json({ text });
  } catch (err: any) {
    console.error(err);
    return new Response(err?.message || "Failed to parse file", {
      status: 500,
    });
  }
}
