/**
 * MycroZine Layout Generator
 *
 * Creates a print-ready layout with all 8 pages on a single sheet.
 * Traditional 8-page mini-zine format for fold-and-cut assembly.
 *
 * Paper: Landscape 11" x 8.5" (US Letter rotated)
 * Layout: 4 columns x 2 rows
 * Panel size: 7cm x 10.8cm (~2.76" x 4.25")
 *
 * Page arrangement for proper folding:
 *   Top row (upside down):    1, 8, 7, 6
 *   Bottom row (right side up): 2, 3, 4, 5
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 11" x 8.5" at 300 DPI = 3300 x 2550 pixels (landscape)
const PAGE_WIDTH = 3300;
const PAGE_HEIGHT = 2550;

// Layout configuration: 4 columns x 2 rows
const COLS = 4;
const ROWS = 2;

// Panel size: 7cm x 10.8cm at 300 DPI
// 7cm = 2.756" = 827 pixels, 10.8cm = 4.252" = 1275 pixels
const PANEL_WIDTH = Math.floor(PAGE_WIDTH / COLS);   // 825 pixels (~7cm)
const PANEL_HEIGHT = Math.floor(PAGE_HEIGHT / ROWS); // 1275 pixels (~10.8cm)

// Page order for traditional mini-zine folding
// Top row (rotated 180°): pages 1, 8, 7, 6 (left to right)
// Bottom row (normal): pages 2, 3, 4, 5 (left to right)
const TOP_ROW_PAGES = [0, 7, 6, 5];    // 0-indexed: pages 1, 8, 7, 6
const BOTTOM_ROW_PAGES = [1, 2, 3, 4]; // 0-indexed: pages 2, 3, 4, 5

/**
 * Create a print-ready zine layout from 8 page images
 *
 * @param {Object} options - Layout options
 * @param {string[]} options.pages - Array of 8 page image paths (in order: 1-8)
 * @param {string} [options.outputPath] - Output file path (default: output/mycrozine_print.png)
 * @param {string} [options.background] - Background color (default: '#ffffff')
 * @returns {Promise<string>} - Path to generated print layout
 */
export async function createPrintLayout(options) {
  const {
    pages,
    outputPath = path.join(__dirname, '..', 'output', 'mycrozine_print.png'),
    background = '#ffffff'
  } = options;

  if (!pages || pages.length !== 8) {
    throw new Error('Exactly 8 page images are required');
  }

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Load and resize all pages to panel size (7cm x 10.8cm)
  const resizedPages = await Promise.all(
    pages.map(async (pagePath) => {
      return sharp(pagePath)
        .resize(PANEL_WIDTH, PANEL_HEIGHT, {
          fit: 'contain',
          background
        })
        .toBuffer();
    })
  );

  // Rotate top row pages 180 degrees (they need to be upside down)
  const rotatedTopPages = await Promise.all(
    TOP_ROW_PAGES.map(async (pageIndex) => {
      return sharp(resizedPages[pageIndex])
        .rotate(180)
        .toBuffer();
    })
  );

  // Build composite array with proper page arrangement
  const compositeImages = [];

  // Top row: pages 1, 8, 7, 6 (rotated 180°)
  for (let col = 0; col < COLS; col++) {
    compositeImages.push({
      input: rotatedTopPages[col],
      left: col * PANEL_WIDTH,
      top: 0
    });
  }

  // Bottom row: pages 2, 3, 4, 5 (normal orientation)
  for (let col = 0; col < COLS; col++) {
    const pageIndex = BOTTOM_ROW_PAGES[col];
    compositeImages.push({
      input: resizedPages[pageIndex],
      left: col * PANEL_WIDTH,
      top: PANEL_HEIGHT
    });
  }

  // Create the final composite image
  await sharp({
    create: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      channels: 3,
      background
    }
  })
    .composite(compositeImages)
    .png()
    .toFile(outputPath);

  console.log(`Created print layout: ${outputPath}`);
  console.log(`  Dimensions: ${PAGE_WIDTH}x${PAGE_HEIGHT} pixels (11"x8.5" landscape @ 300 DPI)`);
  console.log(`  Panel size: ${PANEL_WIDTH}x${PANEL_HEIGHT} pixels (7cm x 10.8cm)`);
  console.log(`  Layout: Top row [1↺, 8↺, 7↺, 6↺] | Bottom row [2, 3, 4, 5]`);

  return outputPath;
}

/**
 * CLI entry point
 * Usage: node layout.mjs <page1> <page2> ... <page8> [--output <path>]
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let pages = [];
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      outputPath = args[++i];
    } else if (!args[i].startsWith('-')) {
      pages.push(args[i]);
    }
  }

  if (pages.length === 0) {
    // Default: look for undernet_zine_p*.png in examples
    const exampleDir = path.join(__dirname, '..', 'examples', 'undernet');
    try {
      const files = await fs.readdir(exampleDir);
      pages = files
        .filter(f => f.match(/undernet_zine_p\d\.png/))
        .sort()
        .map(f => path.join(exampleDir, f));

      if (pages.length === 0) {
        console.log('No page images found. Usage:');
        console.log('  node layout.mjs page1.png page2.png ... page8.png [--output path]');
        console.log('  Or place 8 pages named undernet_zine_p1.png through p8.png in examples/undernet/');
        process.exit(1);
      }
    } catch (e) {
      console.log('Usage: node layout.mjs page1.png page2.png ... page8.png [--output path]');
      process.exit(1);
    }
  }

  if (pages.length !== 8) {
    console.error(`Error: Expected 8 pages, got ${pages.length}`);
    process.exit(1);
  }

  const options = { pages };
  if (outputPath) {
    options.outputPath = outputPath;
  }

  try {
    await createPrintLayout(options);
  } catch (error) {
    console.error('Error creating layout:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default createPrintLayout;
