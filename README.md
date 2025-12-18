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

The output is a single PNG image arranged for traditional mini-zine folding:

```
┌──────────┬──────────┬──────────┬──────────┐
│    1↺    │    8↺    │    7↺    │    6↺    │  Top row (upside down)
│  (cover) │  (cta)   │          │          │
├──────────┼──────────┼──────────┼──────────┤
│    2     │    3     │    4     │    5     │  Bottom row (right side up)
│          │          │          │          │
└──────────┴──────────┴──────────┴──────────┘

Paper: 11" x 8.5" landscape (US Letter rotated)
Panel size: 7cm x 10.8cm (~2.76" x 4.25")
Total: 3300 x 2550 pixels at 300 DPI
```

## Folding Instructions

After printing, fold your zine:

1. **Fold in half** along the long edge (hotdog fold) - brings top row to bottom
2. **Fold in half again** along the short edge
3. **Fold once more** to create a small booklet shape
4. **Unfold completely** and lay flat
5. **Cut the center slit** - cut along the middle crease between pages 3-6 and 4-5
6. **Refold and push** - fold hotdog style, then push the ends together so the cut opens into a booklet
7. **Flatten** - pages should now be in order 1→2→3→4→5→6→7→8

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

## Web App

MycroZine includes a full web application at `zine.jeffemmett.com` that allows anyone to create zines through a browser interface.

### Features

- **Text or voice input** - Describe your zine concept naturally
- **AI-powered generation** - Gemini generates outlines and page images
- **Interactive refinement** - Adjust any page with feedback
- **Shareable links** - Share your zine with a unique URL
- **Print-ready download** - 300 DPI PNG for home printing

### Local Development

```bash
# Install web dependencies
npm run web:install

# Create .env.local in web/ directory
cp web/.env.example web/.env.local
# Edit web/.env.local and add your GEMINI_API_KEY

# Start development server
npm run web:dev
```

Visit `http://localhost:3000` to use the app locally.

### Docker Deployment

```bash
# Build and start the container
GEMINI_API_KEY=your-key docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

The docker-compose.yml includes Traefik labels for automatic HTTPS routing.

### Deployment to Netcup

1. Push to Gitea: `git push origin main`
2. SSH to Netcup: `ssh netcup`
3. Pull and deploy:
   ```bash
   cd /opt/websites/mycro-zine
   git pull
   export GEMINI_API_KEY=$(cat ~/.gemini_credentials)
   docker compose up -d --build
   ```
4. Add to Cloudflare tunnel if not already configured

## Integration with Gemini MCP

This library is designed to work with the [Gemini MCP Server](https://github.com/jeffemmett/gemini-mcp) for AI-powered content and image generation:

1. Use `getContentOutlinePrompt()` with `gemini_generate` for zine planning
2. Use `getImagePrompt()` with `gemini_generate_image` for page creation
3. Use `createPrintLayout()` to assemble the final print-ready file

## License

MIT
