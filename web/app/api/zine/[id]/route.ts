import { NextRequest, NextResponse } from "next/server";
import { getZine, readFileAsBuffer, getPageImagePath, getPrintLayoutPath } from "@/lib/storage";
import path from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/zine/[id] - Get zine metadata
// GET /api/zine/[id]?image=p1 - Get page image
// GET /api/zine/[id]?print=true - Get print layout
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const imageParam = url.searchParams.get("image");
    const printParam = url.searchParams.get("print");

    // Serve page image
    if (imageParam) {
      const pageMatch = imageParam.match(/^p(\d)$/);
      if (!pageMatch) {
        return NextResponse.json(
          { error: "Invalid image parameter. Use p1-p8." },
          { status: 400 }
        );
      }

      const pageNumber = parseInt(pageMatch[1], 10);
      if (pageNumber < 1 || pageNumber > 8) {
        return NextResponse.json(
          { error: "Page number must be between 1 and 8" },
          { status: 400 }
        );
      }

      const imagePath = await getPageImagePath(id, pageNumber);
      if (!imagePath) {
        return NextResponse.json(
          { error: "Page image not found" },
          { status: 404 }
        );
      }

      const imageBuffer = await readFileAsBuffer(imagePath);
      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Serve print layout
    if (printParam === "true") {
      const printPath = await getPrintLayoutPath(id);
      if (!printPath) {
        return NextResponse.json(
          { error: "Print layout not found. Generate it first." },
          { status: 404 }
        );
      }

      const printBuffer = await readFileAsBuffer(printPath);
      return new NextResponse(new Uint8Array(printBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${id}_print.png"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Return zine metadata
    const zine = await getZine(id);
    if (!zine) {
      return NextResponse.json(
        { error: "Zine not found" },
        { status: 404 }
      );
    }

    // Build response with image URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const response = {
      ...zine,
      pageUrls: Array.from({ length: 8 }, (_, i) => `${baseUrl}/api/zine/${id}?image=p${i + 1}`),
      printLayoutUrl: zine.printLayout ? `${baseUrl}/api/zine/${id}?print=true` : null,
      shareUrl: `${baseUrl}/z/${id}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get zine error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get zine" },
      { status: 500 }
    );
  }
}
