import { NextRequest, NextResponse } from "next/server";
import { generateOutline } from "@/lib/gemini";
import { saveZine, type StoredZine } from "@/lib/storage";
import { generateZineId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, style = "punk-zine", tone = "rebellious" } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Generate the 8-page outline using Gemini
    const pages = await generateOutline(topic.trim(), style, tone);

    if (!pages || pages.length !== 8) {
      return NextResponse.json(
        { error: "Failed to generate complete outline" },
        { status: 500 }
      );
    }

    // Create a new zine ID
    const id = generateZineId();
    const now = new Date().toISOString();

    // Save initial zine metadata
    const zine: StoredZine = {
      id,
      topic: topic.trim(),
      style,
      tone,
      outline: pages,
      pages: [], // Will be populated as images are generated
      createdAt: now,
      updatedAt: now,
    };

    await saveZine(zine);

    return NextResponse.json({
      id,
      topic: topic.trim(),
      style,
      tone,
      outline: pages,
    });
  } catch (error) {
    console.error("Outline generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate outline" },
      { status: 500 }
    );
  }
}
