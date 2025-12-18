import { NextRequest, NextResponse } from "next/server";
import { getZine, saveZine } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zineId } = body;

    if (!zineId) {
      return NextResponse.json(
        { error: "Missing zineId" },
        { status: 400 }
      );
    }

    // Get existing zine
    const zine = await getZine(zineId);
    if (!zine) {
      return NextResponse.json(
        { error: "Zine not found" },
        { status: 404 }
      );
    }

    // Update the timestamp to mark it as "saved"
    zine.updatedAt = new Date().toISOString();
    await saveZine(zine);

    // Return the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zine.jeffemmett.com";
    const shareUrl = `${baseUrl}/z/${zineId}`;

    return NextResponse.json({
      success: true,
      id: zineId,
      shareUrl,
    });
  } catch (error) {
    console.error("Save zine error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save zine" },
      { status: 500 }
    );
  }
}
