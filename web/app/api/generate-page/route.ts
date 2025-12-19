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
    // Note: This uses the MCP-style generation - in production, we'd call the Gemini API directly
    const imageBase64 = await generateImageWithGemini(fullPrompt);

    // Save the page image
    const imagePath = await savePageImage(zineId, pageNumber, imageBase64);

    // Update zine metadata
    zine.pages[pageNumber - 1] = imagePath;
    zine.updatedAt = new Date().toISOString();
    await saveZine(zine);

    return NextResponse.json({
      pageNumber,
      imageUrl: `/api/zine/${zineId}/image/p${pageNumber}.png`,
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

async function generateImageWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Primary: Use Nano Banana Pro (gemini-2.0-flash-exp-image-generation)
  // This provides highest quality image generation with advanced text rendering
  try {
    const nanoBananaResult = await generateWithNanoBananaPro(prompt, apiKey);
    if (nanoBananaResult) {
      console.log("✅ Generated image with Nano Banana Pro");
      return nanoBananaResult;
    }
  } catch (error) {
    console.error("Nano Banana Pro error, trying fallback:", error);
  }

  // Fallback: Try Imagen 3
  try {
    const imagenResult = await generateWithImagen3(prompt, apiKey);
    if (imagenResult) {
      console.log("✅ Generated image with Imagen 3");
      return imagenResult;
    }
  } catch (error) {
    console.error("Imagen 3 error, trying final fallback:", error);
  }

  // Final fallback: Gemini 2.0 Flash experimental
  return await generateWithGemini2Flash(prompt, apiKey);
}

// Nano Banana Pro - highest quality, up to 4K, excellent text rendering
async function generateWithNanoBananaPro(prompt: string, apiKey: string): Promise<string | null> {
  // Nano Banana Pro uses gemini-2.0-flash-exp-image-generation model
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          // 3:4 aspect ratio for zine pages (portrait)
          // Resolution hint for higher quality output
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Nano Banana Pro API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      return part.inlineData.data;
    }
  }

  return null;
}

// Imagen 3 fallback
async function generateWithImagen3(prompt: string, apiKey: string): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4", // Portrait for zine pages
          safetyFilterLevel: "BLOCK_ONLY_HIGH",
          personGeneration: "ALLOW_ADULT",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Imagen 3 API error:", response.status, errorText);
    return null;
  }

  const data = await response.json();

  if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
    return data.predictions[0].bytesBase64Encoded;
  }

  return null;
}

// Gemini 2.0 Flash experimental fallback
async function generateWithGemini2Flash(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
          responseModalities: ["IMAGE", "TEXT"],
          responseMimeType: "image/png",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini 2.0 Flash error:", response.status, errorText);
    return createPlaceholderImage(prompt);
  }

  const data = await response.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      console.log("✅ Generated image with Gemini 2.0 Flash");
      return part.inlineData.data;
    }
  }

  // If no image, create placeholder
  return createPlaceholderImage(prompt);
}

async function createPlaceholderImage(prompt: string): Promise<string> {
  // Create a simple placeholder image using sharp
  const sharp = (await import("sharp")).default;

  const svg = `
    <svg width="825" height="1275" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <rect x="20" y="20" width="785" height="1235" fill="white" stroke="black" stroke-width="3"/>
      <text x="412" y="600" text-anchor="middle" font-family="Courier New" font-size="24" font-weight="bold">
        [IMAGE PLACEHOLDER]
      </text>
      <text x="412" y="650" text-anchor="middle" font-family="Courier New" font-size="14">
        ${prompt.slice(0, 50)}...
      </text>
      <text x="412" y="700" text-anchor="middle" font-family="Courier New" font-size="12" fill="#666">
        Image generation in progress
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return buffer.toString("base64");
}
