import { NextRequest, NextResponse } from "next/server";
import { getZine, saveZine, getPrintLayoutPath } from "@/lib/storage";
import { createZinePrintLayout } from "@/lib/zine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zineId, zineName } = body;

    if (!zineId) {
      return NextResponse.json(
        { error: "Missing zineId" },
        { status: 400 }
      );
    }

    // Verify zine exists and has all pages
    const zine = await getZine(zineId);
    if (!zine) {
      return NextResponse.json(
        { error: "Zine not found" },
        { status: 404 }
      );
    }

    // Check that all 8 pages exist
    const validPages = zine.pages.filter((p) => p && p.length > 0);
    if (validPages.length !== 8) {
      return NextResponse.json(
        { error: `Expected 8 pages, found ${validPages.length}. Please generate all pages first.` },
        { status: 400 }
      );
    }

    // Create the print layout
    const { filepath, buffer } = await createZinePrintLayout(
      zineId,
      zineName || zine.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")
    );

    // Update zine metadata
    zine.printLayout = filepath;
    zine.updatedAt = new Date().toISOString();
    await saveZine(zine);

    return NextResponse.json({
      success: true,
      printLayoutUrl: `/api/zine/${zineId}/print`,
      filename: `${zineName || "mycrozine"}_print.png`,
    });
  } catch (error) {
    console.error("Print layout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create print layout" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const zineId = url.searchParams.get("zineId");

  if (!zineId) {
    return NextResponse.json(
      { error: "Missing zineId" },
      { status: 400 }
    );
  }

  const layoutPath = await getPrintLayoutPath(zineId);
  if (!layoutPath) {
    return NextResponse.json(
      { error: "Print layout not found. Generate it first." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    exists: true,
    printLayoutUrl: `/api/zine/${zineId}/print`,
  });
}
