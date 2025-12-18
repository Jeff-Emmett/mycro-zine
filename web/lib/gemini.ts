import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface PageOutline {
  pageNumber: number;
  type: string;
  title: string;
  keyPoints: string[];
  imagePrompt: string;
}

export interface ZineOutline {
  id: string;
  topic: string;
  style: string;
  tone: string;
  pages: PageOutline[];
  createdAt: string;
}

const STYLE_PROMPTS: Record<string, string> = {
  "punk-zine": "xerox-style high contrast black and white, DIY cut-and-paste collage aesthetic, hand-drawn typography, punk rock zine style, grainy texture, photocopied look",
  "minimal": "clean minimalist design, lots of white space, modern sans-serif typography, simple geometric shapes, subtle gradients",
  "collage": "layered mixed media collage, vintage photographs, torn paper edges, overlapping textures, eclectic composition",
  "retro": "1970s aesthetic, earth tones, groovy psychedelic typography, halftone dot patterns, vintage illustration style",
  "academic": "clean infographic style, annotated diagrams, data visualization, technical illustration, educational layout",
};

const TONE_PROMPTS: Record<string, string> = {
  "rebellious": "defiant anti-establishment energy, provocative bold statements, raw and unfiltered",
  "playful": "whimsical fun light-hearted energy, humor and wit, bright positive vibes",
  "informative": "educational and factual, clear explanations, structured information",
  "poetic": "lyrical and metaphorical, evocative imagery, emotional depth",
};

export async function generateOutline(
  topic: string,
  style: string,
  tone: string
): Promise<PageOutline[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are creating an 8-page mycro-zine (mini DIY zine that folds from a single sheet of paper).

Topic: ${topic}
Visual Style: ${style} - ${STYLE_PROMPTS[style] || STYLE_PROMPTS["punk-zine"]}
Tone: ${tone} - ${TONE_PROMPTS[tone] || TONE_PROMPTS["rebellious"]}

Create a detailed outline for all 8 pages. Each page should have a distinct purpose:
- Page 1: Cover (eye-catching title and central image)
- Page 2: Introduction (hook the reader, set the stage)
- Pages 3-6: Main content (key concepts, stories, visuals)
- Page 7: Resources or deeper dive
- Page 8: Call to action (what reader should do next)

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "pages": [
    {
      "pageNumber": 1,
      "type": "cover",
      "title": "Short punchy title",
      "keyPoints": ["Main visual concept", "Tagline or subtitle"],
      "imagePrompt": "Detailed prompt for generating the page image including style elements"
    }
  ]
}

Make each imagePrompt detailed and specific to the ${style} visual style. Include concrete visual elements, composition details, and mood descriptors.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = response;
  if (response.includes("```")) {
    const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1];
    }
  }

  const parsed = JSON.parse(jsonStr.trim());
  return parsed.pages;
}

export async function generatePageImage(
  pageOutline: PageOutline,
  style: string,
  tone: string,
  feedback?: string
): Promise<string> {
  // Use Gemini's image generation (Imagen 3 via Gemini API)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS["punk-zine"];
  const toneDesc = TONE_PROMPTS[tone] || TONE_PROMPTS["rebellious"];

  let imagePrompt = `Create a single page for a mini-zine (approximately 825x1275 pixels aspect ratio, portrait orientation).

Page ${pageOutline.pageNumber}: ${pageOutline.title}
Type: ${pageOutline.type}
Key elements: ${pageOutline.keyPoints.join(", ")}

Visual style: ${styleDesc}
Mood/tone: ${toneDesc}

Specific requirements:
${pageOutline.imagePrompt}

The image should be a complete, self-contained page that could be printed. Include any text as part of the design in a ${style} typography style.`;

  if (feedback) {
    imagePrompt += `\n\nUser feedback for refinement: ${feedback}`;
  }

  // For now, return a placeholder - we'll integrate actual image generation
  // The actual implementation will use either Gemini's native image gen or RunPod

  // Generate with Gemini 2.0 Flash which supports image generation
  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `Generate an image: ${imagePrompt}` }]
      }],
      generationConfig: {
        // Note: Image generation config would go here when available
      }
    });

    // Check if response contains image data
    const response = result.response;

    // For text model fallback, return a description
    // In production, this would use imagen or other image gen API
    return `data:text/plain;base64,${Buffer.from(response.text()).toString('base64')}`;
  } catch (error) {
    console.error("Image generation error:", error);
    throw new Error("Failed to generate page image");
  }
}

export async function regeneratePageWithFeedback(
  currentOutline: PageOutline,
  feedback: string,
  style: string,
  tone: string
): Promise<{ updatedOutline: PageOutline; imageUrl: string }> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // First, update the outline based on feedback
  const prompt = `You are refining a zine page based on user feedback.

Current page outline:
${JSON.stringify(currentOutline, null, 2)}

User feedback: "${feedback}"

Style: ${style}
Tone: ${tone}

Update the page outline to incorporate this feedback. Keep the same page number and type, but update title, keyPoints, and imagePrompt as needed.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "pageNumber": ${currentOutline.pageNumber},
  "type": "${currentOutline.type}",
  "title": "Updated title",
  "keyPoints": ["Updated point 1", "Updated point 2"],
  "imagePrompt": "Updated detailed image prompt"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  let jsonStr = response;
  if (response.includes("```")) {
    const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1];
    }
  }

  const updatedOutline = JSON.parse(jsonStr.trim()) as PageOutline;

  // Generate new image with updated outline
  const imageUrl = await generatePageImage(updatedOutline, style, tone, feedback);

  return { updatedOutline, imageUrl };
}
