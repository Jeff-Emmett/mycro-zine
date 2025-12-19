import { NextRequest, NextResponse } from "next/server";
import { getZine, saveZine, savePageImage } from "@/lib/storage";
import type { PageOutline } from "@/lib/gemini";

// Style-specific image generation prompts
const STYLE_PROMPTS: Record<string, string> = {
  "punk-zine": "xerox-style high contrast black and white, DIY cut-and-paste collage aesthetic, hand-drawn typography, punk rock zine style, grainy texture, photocopied look, bold graphic elements",
  "minimal": "clean minimalist design, lots of white space, modern sans-serif typography, simple geometric shapes, subtle gradients, elegant composition",
  "collage": "layered mixed media collage, vintage photographs, torn paper edges, overlapping textures, eclectic composition, found imagery",
  "retro": "1970s aesthetic, earth tones, groovy psychedelic typography, halftone dot patterns, vintage illustration style, warm colors",
  "academic": "clean infographic style, annotated diagrams, data visualization, technical illustration, educational layout, clear hierarchy",
};

const TONE_PROMPTS: Record<string, string> = {
  "rebellious": "defiant anti-establishment energy, provocative bold statements, raw and unfiltered, urgent",
  "playful": "whimsical fun light-hearted energy, humor and wit, bright positive vibes, joyful",
  "informative": "educational and factual, clear explanations, structured information, accessible",
  "poetic": "lyrical and metaphorical, evocative imagery, emotional depth, contemplative",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zineId, pageNumber, outline, style, tone } = body;

    if (!zineId || !pageNumber || !outline) {
      return NextResponse.json(
        { error: "Missing required fields: zineId, pageNumber, outline" },
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

    const pageOutline = outline as PageOutline;
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS["punk-zine"];
    const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS["rebellious"];

    // Build the full image generation prompt
    const fullPrompt = buildImagePrompt(pageOutline, stylePrompt, tonePrompt);

    // Generate image using Gemini Imagen API
    // Pass outline and style for styled fallback
    const imageBase64 = await generateImageWithGemini(fullPrompt, pageOutline, style);

    // Save the page image
    const imagePath = await savePageImage(zineId, pageNumber, imageBase64);

    // Update zine metadata
    zine.pages[pageNumber - 1] = imagePath;
    zine.updatedAt = new Date().toISOString();
    await saveZine(zine);

    return NextResponse.json({
      pageNumber,
      imageUrl: `/api/zine/${zineId}?image=p${pageNumber}`,
      success: true,
    });
  } catch (error) {
    console.error("Page generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate page" },
      { status: 500 }
    );
  }
}

function buildImagePrompt(outline: PageOutline, stylePrompt: string, tonePrompt: string): string {
  return `Create a single zine page image (portrait orientation, 825x1275 pixels aspect ratio).

PAGE ${outline.pageNumber}: "${outline.title}"
Type: ${outline.type}

Content to visualize:
${outline.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Visual Style: ${stylePrompt}
Mood/Tone: ${tonePrompt}

Detailed requirements:
${outline.imagePrompt}

IMPORTANT:
- This is a SINGLE page that will be printed
- Include any text/typography as part of the graphic design
- Fill the entire page - no blank margins
- Make it visually striking and cohesive
- The design should work in print (high contrast, clear details)`;
}

async function generateImageWithGemini(
  prompt: string,
  outline: PageOutline,
  style: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Try Gemini 2.0 Flash with image generation (Nano Banana)
  // Uses responseModalities: ["TEXT", "IMAGE"] for native image generation
  try {
    const result = await generateWithGemini2FlashImage(prompt, apiKey);
    if (result) {
      console.log("✅ Generated image with Gemini 2.0 Flash");
      return result;
    }
  } catch (error) {
    console.error("Gemini 2.0 Flash image generation error:", error);
  }

  // Fallback: Create styled placeholder with actual content
  console.log("⚠️ Using styled placeholder image for page", outline.pageNumber);
  return createStyledPlaceholder(outline, style);
}

// Gemini 2.0 Flash with native image generation (Nano Banana)
// Uses RunPod serverless proxy (US-based) to bypass geo-restrictions
async function generateWithGemini2FlashImage(prompt: string, apiKey: string): Promise<string | null> {
  // Use RunPod serverless endpoint (US-based) to bypass geo-restrictions
  const runpodEndpointId = process.env.RUNPOD_GEMINI_ENDPOINT_ID || "ntqjz8cdsth42i";
  const runpodApiKey = process.env.RUNPOD_API_KEY;

  if (!runpodApiKey) {
    console.error("RUNPOD_API_KEY not configured, falling back to direct API");
    return generateDirectGeminiImage(prompt, apiKey);
  }

  const runpodUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/runsync`;

  try {
    const response = await fetch(runpodUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runpodApiKey}`,
      },
      body: JSON.stringify({
        input: {
          api_key: apiKey,
          model: "gemini-2.0-flash-exp",
          contents: [
            {
              parts: [
                {
                  text: `Generate an image: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod API error:", response.status, errorText);
      return null;
    }

    const result = await response.json();

    // RunPod wraps the response in { output: ... }
    const data = result.output || result;

    // Check for errors
    if (data.error) {
      console.error("Gemini API error via RunPod:", data.error);
      return null;
    }

    // Extract image from Gemini response
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        console.log("✅ Generated image via RunPod proxy");
        return part.inlineData.data;
      }
    }

    console.error("No image in Gemini response via RunPod, parts:", JSON.stringify(parts).slice(0, 500));
    return null;
  } catch (error) {
    console.error("RunPod request error:", error);
    return null;
  }
}

// Fallback: Try direct Gemini API (will fail in geo-restricted regions)
async function generateDirectGeminiImage(prompt: string, apiKey: string): Promise<string | null> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Direct Gemini API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();
  if (data.error) {
    console.error("Gemini API error:", data.error);
    return null;
  }

  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      return part.inlineData.data;
    }
  }

  return null;
}

// Create styled placeholder images with actual page content
async function createStyledPlaceholder(
  outline: PageOutline,
  style: string
): Promise<string> {
  const sharp = (await import("sharp")).default;

  // Escape XML special characters
  const escapeXml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const title = escapeXml(outline.title.slice(0, 40));
  const keyPoints = outline.keyPoints.slice(0, 3).map((p) => escapeXml(p.slice(0, 50)));

  // Style-specific colors and patterns
  const styles: Record<string, { bg: string; fg: string; accent: string; pattern: string }> = {
    "punk-zine": {
      bg: "#ffffff",
      fg: "#000000",
      accent: "#ff0066",
      pattern: `<pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
        <circle cx="10" cy="10" r="2" fill="#000" opacity="0.3"/>
      </pattern>`,
    },
    minimal: {
      bg: "#fafafa",
      fg: "#333333",
      accent: "#0066ff",
      pattern: "",
    },
    collage: {
      bg: "#f5e6d3",
      fg: "#2d2d2d",
      accent: "#8b4513",
      pattern: `<pattern id="paper" patternUnits="userSpaceOnUse" width="100" height="100">
        <rect width="100" height="100" fill="#f5e6d3"/>
        <rect x="0" y="0" width="50" height="50" fill="#ebe0d0" opacity="0.5"/>
      </pattern>`,
    },
    retro: {
      bg: "#fff8dc",
      fg: "#8b4513",
      accent: "#ff6347",
      pattern: `<pattern id="halftone" patternUnits="userSpaceOnUse" width="8" height="8">
        <circle cx="4" cy="4" r="1.5" fill="#8b4513" opacity="0.2"/>
      </pattern>`,
    },
    academic: {
      bg: "#ffffff",
      fg: "#1a1a1a",
      accent: "#0055aa",
      pattern: `<pattern id="grid" patternUnits="userSpaceOnUse" width="40" height="40">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ddd" stroke-width="1"/>
      </pattern>`,
    },
  };

  const s = styles[style] || styles["punk-zine"];
  const pageNum = outline.pageNumber;
  const pageType = escapeXml(outline.type.toUpperCase());

  const svg = `
    <svg width="825" height="1275" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${s.pattern}
        <style>
          .title { font-family: 'Courier New', monospace; font-weight: bold; }
          .body { font-family: 'Courier New', monospace; }
          .accent { font-family: 'Courier New', monospace; font-weight: bold; }
        </style>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="${s.bg}"/>
      ${s.pattern ? `<rect width="100%" height="100%" fill="url(#${s.pattern.match(/id="(\w+)"/)?.[1] || "dots"})"/>` : ""}

      <!-- Border -->
      <rect x="30" y="30" width="765" height="1215" fill="none" stroke="${s.fg}" stroke-width="4"/>
      <rect x="40" y="40" width="745" height="1195" fill="none" stroke="${s.fg}" stroke-width="2"/>

      <!-- Page number badge -->
      <rect x="60" y="60" width="80" height="40" fill="${s.fg}"/>
      <text x="100" y="88" text-anchor="middle" class="accent" font-size="24" fill="${s.bg}">P${pageNum}</text>

      <!-- Page type -->
      <text x="765" y="90" text-anchor="end" class="body" font-size="16" fill="${s.accent}">${pageType}</text>

      <!-- Title -->
      <text x="412" y="200" text-anchor="middle" class="title" font-size="48" fill="${s.fg}">${title}</text>

      <!-- Decorative line -->
      <line x1="150" y1="240" x2="675" y2="240" stroke="${s.accent}" stroke-width="3"/>

      <!-- Key points -->
      ${keyPoints
        .map(
          (point, i) => `
        <rect x="100" y="${350 + i * 120}" width="625" height="80" fill="${s.bg}" stroke="${s.fg}" stroke-width="2" rx="5"/>
        <text x="120" y="${400 + i * 120}" class="body" font-size="20" fill="${s.fg}">${point}${point.length >= 50 ? "..." : ""}</text>
      `
        )
        .join("")}

      <!-- Generation notice -->
      <rect x="150" y="1050" width="525" height="100" fill="${s.accent}" opacity="0.1" rx="10"/>
      <text x="412" y="1090" text-anchor="middle" class="body" font-size="18" fill="${s.fg}">✨ AI Image Generation</text>
      <text x="412" y="1120" text-anchor="middle" class="body" font-size="14" fill="${s.fg}" opacity="0.7">Styled placeholder - image gen geo-restricted</text>

      <!-- Corner decorations -->
      <path d="M 30 130 L 30 30 L 130 30" fill="none" stroke="${s.accent}" stroke-width="4"/>
      <path d="M 795 130 L 795 30 L 695 30" fill="none" stroke="${s.accent}" stroke-width="4"/>
      <path d="M 30 1145 L 30 1245 L 130 1245" fill="none" stroke="${s.accent}" stroke-width="4"/>
      <path d="M 795 1145 L 795 1245 L 695 1245" fill="none" stroke="${s.accent}" stroke-width="4"/>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return buffer.toString("base64");
}

async function createPlaceholderImage(prompt: string): Promise<string> {
  // Simple fallback placeholder
  const sharp = (await import("sharp")).default;

  const svg = `
    <svg width="825" height="1275" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <rect x="20" y="20" width="785" height="1235" fill="white" stroke="black" stroke-width="3"/>
      <text x="412" y="600" text-anchor="middle" font-family="Courier New" font-size="24" font-weight="bold">
        [ZINE PAGE]
      </text>
      <text x="412" y="700" text-anchor="middle" font-family="Courier New" font-size="12" fill="#666">
        Image generation unavailable in EU region
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return buffer.toString("base64");
}
