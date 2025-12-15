/**
 * MycroZine Layout Generator
 *
 * Creates a print-ready layout with all 8 pages on a single 8.5" x 11" sheet.
 * Layout: 2 columns x 4 rows (reading order: left-to-right, top-to-bottom)
 *
 * Panel size: 4.25" x 2.75" (~10.8cm x 7cm)
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 8.5" x 11" at 300 DPI = 2550 x 3300 pixels
const PAGE_WIDTH = 2550;
const PAGE_HEIGHT = 3300;

// Layout configuration: 2 columns x 4 rows
const COLS = 2;
const ROWS = 4;
const PANEL_WIDTH = Math.floor(PAGE_WIDTH / COLS);   // 1275 pixels
const PANEL_HEIGHT = Math.floor(PAGE_HEIGHT / ROWS); // 825 pixels

/**
 * Create a print-ready zine layout from 8 page images
 *
 * @param {Object} options - Layout options
 * @param {string[]} options.pages - Array of 8 page image paths (in order)
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

  // Load and resize all pages to panel size
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

  // Build composite array for all 8 pages in reading order
  const compositeImages = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const pageIndex = row * COLS + col; // 0-7
      compositeImages.push({
        input: resizedPages[pageIndex],
        left: col * PANEL_WIDTH,
        top: row * PANEL_HEIGHT
      });
    }
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
  console.log(`  Dimensions: ${PAGE_WIDTH}x${PAGE_HEIGHT} pixels (8.5"x11" @ 300 DPI)`);
  console.log(`  Panel size: ${PANEL_WIDTH}x${PANEL_HEIGHT} pixels (${COLS}x${ROWS} grid)`);

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
