/**
 * MycroZine Prompt Templates
 *
 * Templates for generating zine content outlines and image prompts.
 * Designed for use with Gemini MCP tools.
 */

/**
 * Available zine styles
 */
export const STYLES = {
  'punk-zine': 'xerox texture, high contrast black and white with accent color highlights, DIY cut-and-paste collage, hand-drawn typography, rough edges, rebellious feel',
  'minimal': 'clean lines, lots of white space, simple geometric shapes, modern sans-serif typography, subtle gradients',
  'collage': 'layered imagery, mixed media textures, overlapping elements, vintage photographs, torn paper edges',
  'retro': '1970s aesthetic, warm earth tones, groovy typography, halftone patterns, nostalgic imagery',
  'academic': 'diagram-heavy, annotated illustrations, serif typography, reference-style layout, infographic elements'
};

/**
 * Available tones
 */
export const TONES = {
  'rebellious': 'defiant, anti-establishment, punk attitude, call to action, questioning authority',
  'playful': 'whimsical, fun, light-hearted, humorous, engaging, accessible',
  'informative': 'educational, clear explanations, factual, well-structured, easy to understand',
  'poetic': 'lyrical, metaphorical, evocative imagery, emotional resonance, artistic expression'
};

/**
 * Generate a content outline prompt for an 8-page zine
 *
 * @param {Object} options
 * @param {string} options.topic - Main topic/theme
 * @param {string} [options.style='punk-zine'] - Visual style
 * @param {string} [options.tone='rebellious'] - Tone of content
 * @param {string} [options.sourceContent] - Optional reference content
 * @returns {string} Prompt for content outline generation
 */
export function getContentOutlinePrompt({ topic, style = 'punk-zine', tone = 'rebellious', sourceContent = null }) {
  return `You are creating an 8-page mycro-zine (mini folded zine) on the topic: ${topic}

Style: ${style} | Tone: ${tone}

${sourceContent ? `Reference content:\n${sourceContent}\n` : ''}

Generate a JSON outline for 8 pages:

Page 1 (Cover): Bold title, subtitle, visual hook
Pages 2-7 (Content): Key concepts with emoji-fied, memetic explanations, hashtags
Page 8 (CTA): Call-to-action with QR code placeholders

For each page provide:
- pageNumber (1-8)
- type: "cover" | "content" | "cta"
- title: Bold headline
- subtitle: (optional) Supporting text
- keyPoints: Array of 2-4 key points with emojis
- hashtags: 2-3 relevant hashtags
- imagePrompt: Detailed prompt for ${style} style image generation

Output as JSON array.`;
}

/**
 * Generate an image prompt for a zine page
 *
 * @param {Object} options
 * @param {number} options.pageNumber - Page number (1-8)
 * @param {string} options.zineTopic - Overall zine topic
 * @param {Object} options.pageOutline - Page outline from content generation
 * @param {string} [options.style='punk-zine'] - Visual style
 * @param {string} [options.feedback] - User feedback to incorporate
 * @returns {string} Prompt for image generation
 */
export function getImagePrompt({ pageNumber, zineTopic, pageOutline, style = 'punk-zine', feedback = null }) {
  const styleDesc = STYLES[style] || STYLES['punk-zine'];

  let prompt = `Punk zine page ${pageNumber}/8 for "${zineTopic}".

${pageOutline.imagePrompt || ''}

Style: ${styleDesc}

Include text elements: ${pageOutline.title}
${pageOutline.keyPoints ? pageOutline.keyPoints.join(', ') : ''}
${pageOutline.hashtags ? `Hashtags: ${pageOutline.hashtags.join(' ')}` : ''}`;

  if (feedback) {
    prompt += `\n\nUser feedback to incorporate: ${feedback}`;
  }

  return prompt;
}

/**
 * Generate an ideation prompt to start zine planning
 *
 * @param {string} topic - Topic to brainstorm about
 * @param {string} [style='punk-zine'] - Visual style preference
 * @returns {string} Prompt for ideation brainstorming
 */
export function getIdeationPrompt(topic, style = 'punk-zine') {
  return `Let's create an 8-page mycro-zine about "${topic}" in ${style} style.

This is a mini folded zine format - think punk, DIY, memetic, shareable.

Help me brainstorm:
1. What are the key concepts to cover?
2. What's the narrative arc (intro → core content → call to action)?
3. What visual metaphors or imagery would work well?
4. What hashtags and slogans would resonate?
5. Any source URLs or references to pull from?

Let's iterate on this before generating the actual pages.`;
}

/**
 * Page templates for common zine structures
 */
export const PAGE_TEMPLATES = {
  cover: {
    type: 'cover',
    description: 'Bold title, eye-catching visual, sets the tone',
    elements: ['title', 'subtitle', 'visual hook', 'issue number (optional)']
  },
  intro: {
    type: 'content',
    description: 'What is this about? Hook the reader',
    elements: ['question or statement', 'brief explanation', 'why it matters']
  },
  concept: {
    type: 'content',
    description: 'Explain a key concept',
    elements: ['concept name', 'visual metaphor', 'key points with emojis', 'hashtag']
  },
  comparison: {
    type: 'content',
    description: 'Compare/contrast two things',
    elements: ['side by side layout', 'pros/cons', 'clear distinction']
  },
  process: {
    type: 'content',
    description: 'Step-by-step or flow',
    elements: ['numbered steps', 'arrows/flow', 'simple icons']
  },
  manifesto: {
    type: 'content',
    description: 'Statement of values/beliefs',
    elements: ['bold statements', 'call to action language', 'emotive']
  },
  resources: {
    type: 'content',
    description: 'Links, QR codes, further reading',
    elements: ['QR codes', 'URLs', 'social handles', 'book/article references']
  },
  cta: {
    type: 'cta',
    description: 'Call to action - what should reader do?',
    elements: ['action items', 'QR code', 'community links', 'hashtag', 'share prompt']
  }
};

/**
 * Suggested 8-page structures
 */
export const ZINE_STRUCTURES = {
  educational: [
    'cover',
    'intro',
    'concept',
    'concept',
    'concept',
    'process',
    'resources',
    'cta'
  ],
  manifesto: [
    'cover',
    'manifesto',
    'concept',
    'concept',
    'comparison',
    'manifesto',
    'resources',
    'cta'
  ],
  howto: [
    'cover',
    'intro',
    'process',
    'process',
    'process',
    'concept',
    'resources',
    'cta'
  ]
};

export default {
  STYLES,
  TONES,
  PAGE_TEMPLATES,
  ZINE_STRUCTURES,
  getContentOutlinePrompt,
  getImagePrompt,
  getIdeationPrompt
};
