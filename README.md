# MycroZine

A toolkit for creating print-ready **mycro-zines** - 8-page mini folded zines that fit on a single 8.5" x 11" sheet.

## What is a MycroZine?

A mycro-zine is a tiny, foldable magazine made from a single sheet of paper. When folded correctly, it creates an 8-page booklet perfect for:
- Punk zines and manifestos
- Educational mini-guides
- Event programs
- DIY instructions
- Art projects

## Features

- **Single-page print layout**: All 8 pages arranged on one 8.5" x 11" sheet (2 cols x 4 rows)
- **High-resolution output**: 300 DPI for crisp printing
- **Prompt templates**: Ready-to-use prompts for AI content/image generation
- **Multiple styles**: punk-zine, minimal, collage, retro, academic
- **US Letter & A4 support**: Works with common paper sizes

## Installation

```bash
npm install
```

## Usage

### CLI - Create Print Layout

```bash
# Using example pages
npm run example

# Or specify your own 8 pages
node src/layout.mjs page1.png page2.png page3.png page4.png page5.png page6.png page7.png page8.png

# With custom output path
node src/layout.mjs page1.png ... page8.png --output my_zine_print.png
```

### Programmatic API

```javascript
import { createPrintLayout } from 'mycro-zine';

// Create print-ready layout from 8 page images
await createPrintLayout({
  pages: [
    'page1.png', 'page2.png', 'page3.png', 'page4.png',
    'page5.png', 'page6.png', 'page7.png', 'page8.png'
  ],
  outputPath: 'my_zine_print.png',
  background: '#ffffff'
});
```

### Prompt Templates (for AI generation)

```javascript
import { getContentOutlinePrompt, getImagePrompt, STYLES, TONES } from 'mycro-zine/prompts';

// Generate content outline prompt
const outlinePrompt = getContentOutlinePrompt({
  topic: 'The Undernet',
  style: 'punk-zine',
  tone: 'rebellious',
  sourceContent: 'Reference text here...'
});

// Generate image prompt for a page
const imagePrompt = getImagePrompt({
  pageNumber: 1,
  zineTopic: 'The Undernet',
  pageOutline: {
    title: 'THE UNDERNET',
    keyPoints: ['Own your data', 'Run local servers'],
    hashtags: ['#DataSovereignty', '#Mycopunk'],
    imagePrompt: 'Bold cover with mycelial network imagery...'
  },
  style: 'punk-zine'
});
```

## Print Layout

The output is a single PNG image with all 8 pages arranged in reading order:

```
┌─────────────┬─────────────┐
│   Page 1    │   Page 2    │  Row 1
├─────────────┼─────────────┤
│   Page 3    │   Page 4    │  Row 2
├─────────────┼─────────────┤
│   Page 5    │   Page 6    │  Row 3
├─────────────┼─────────────┤
│   Page 7    │   Page 8    │  Row 4
└─────────────┴─────────────┘

Panel size: 4.25" x 2.75" (~10.8cm x 7cm)
Total: 8.5" x 11" at 300 DPI (2550 x 3300 pixels)
```

## Folding Instructions

After printing, fold your zine:

1. **Accordion fold**: Fold the paper in half horizontally (hamburger style)
2. **Fold again**: Fold in half vertically (hotdog style)
3. **One more fold**: Fold in half again
4. **Cut center**: Unfold completely, cut a slit along the center fold
5. **Push and fold**: Push through the center to create the booklet

## Examples

See the `examples/undernet/` directory for a complete 8-page zine about The Undernet project.

## Styles

| Style | Description |
|-------|-------------|
| `punk-zine` | Xerox texture, high contrast B&W, DIY collage, hand-drawn typography |
| `minimal` | Clean lines, white space, modern sans-serif, subtle gradients |
| `collage` | Layered imagery, mixed media textures, vintage photographs |
| `retro` | 1970s aesthetic, earth tones, groovy typography, halftone patterns |
| `academic` | Diagram-heavy, annotated illustrations, infographic elements |

## Integration with Gemini MCP

This library is designed to work with the [Gemini MCP Server](https://github.com/jeffemmett/gemini-mcp) for AI-powered content and image generation:

1. Use `getContentOutlinePrompt()` with `gemini_generate` for zine planning
2. Use `getImagePrompt()` with `gemini_generate_image` for page creation
3. Use `createPrintLayout()` to assemble the final print-ready file

## License

MIT
