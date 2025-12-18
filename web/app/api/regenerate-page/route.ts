import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getZine, saveZine, savePageImage } from "@/lib/storage";
import type { PageOutline } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zineId, pageNumber, currentOutline, feedback, style, tone } = body;

    if (!zineId || !pageNumber || !currentOutline || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify zine exists
    const zine = await getZine(zineId);
    if (!zine) {
      return NextResponse.json(
        { error: "Zine not found" },
        { status: 404 }
      );
    }

    // Update outline based on feedback using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are refining a zine page based on user feedback.

Current page outline:
- Page Number: ${currentOutline.pageNumber}
- Type: ${currentOutline.type}
- Title: ${currentOutline.title}
- Key Points: ${currentOutline.keyPoints.join(", ")}
- Image Prompt: ${currentOutline.imagePrompt}

User feedback: "${feedback}"

Style: ${style}
Tone: ${tone}

Update the page outline to incorporate this feedback. Keep the same page number and type.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "pageNumber": ${currentOutline.pageNumber},
  "type": "${currentOutline.type}",
  "title": "Updated title if needed",
  "keyPoints": ["Updated point 1", "Updated point 2"],
  "imagePrompt": "Updated detailed image prompt incorporating the feedback"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the updated outline
    let jsonStr = response;
    if (response.includes("```")) {
      const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1];
      }
    }

    const updatedOutline = JSON.parse(jsonStr.trim()) as PageOutline;

    // Generate new image with updated outline
    // Forward to generate-page endpoint logic
    const generateResponse = await fetch(
      new URL("/api/generate-page", request.url),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zineId,
          pageNumber,
          outline: updatedOutline,
          style,
          tone,
        }),
      }
    );

    if (!generateResponse.ok) {
      throw new Error("Failed to regenerate image");
    }

    const generateResult = await generateResponse.json();

    // Update the zine outline
    zine.outline[pageNumber - 1] = updatedOutline;
    zine.updatedAt = new Date().toISOString();
    await saveZine(zine);

    return NextResponse.json({
      pageNumber,
      updatedOutline,
      imageUrl: generateResult.imageUrl,
      success: true,
    });
  } catch (error) {
    console.error("Page regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate page" },
      { status: 500 }
    );
  }
}
