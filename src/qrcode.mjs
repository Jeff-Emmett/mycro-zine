/**
 * MycroZine QR Code Generator
 *
 * Generates QR codes for zine CTAs, URLs, and other content.
 * Designed to fit the punk-zine aesthetic with customizable colors.
 */

import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Default QR code options for punk-zine style
 */
const DEFAULT_OPTIONS = {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',  // QR code color
    light: '#00ff00'  // Background color (punk green)
  },
  errorCorrectionLevel: 'M'
};

/**
 * Generate a QR code image from a URL or text
 *
 * @param {Object} options - QR code options
 * @param {string} options.data - URL or text to encode
 * @param {string} [options.outputPath] - Output file path (PNG)
 * @param {number} [options.width=300] - Width in pixels
 * @param {string} [options.darkColor='#000000'] - QR code color
 * @param {string} [options.lightColor='#00ff00'] - Background color
 * @param {string} [options.errorCorrectionLevel='M'] - L, M, Q, or H
 * @returns {Promise<string|Buffer>} - File path if outputPath provided, otherwise Buffer
 */
export async function generateQRCode(options) {
  const {
    data,
    outputPath,
    width = DEFAULT_OPTIONS.width,
    darkColor = DEFAULT_OPTIONS.color.dark,
    lightColor = DEFAULT_OPTIONS.color.light,
    errorCorrectionLevel = DEFAULT_OPTIONS.errorCorrectionLevel
  } = options;

  if (!data) {
    throw new Error('QR code data is required');
  }

  const qrOptions = {
    width,
    margin: DEFAULT_OPTIONS.margin,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel
  };

  if (outputPath) {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Generate and save to file
    await QRCode.toFile(outputPath, data, qrOptions);
    console.log(`QR code generated: ${outputPath}`);
    return outputPath;
  } else {
    // Return as buffer
    return QRCode.toBuffer(data, qrOptions);
  }
}

/**
 * Generate a QR code as a data URL (for embedding in HTML/canvas)
 *
 * @param {string} data - URL or text to encode
 * @param {Object} [options] - QR code options
 * @returns {Promise<string>} - Data URL string
 */
export async function generateQRCodeDataURL(data, options = {}) {
  const {
    width = DEFAULT_OPTIONS.width,
    darkColor = DEFAULT_OPTIONS.color.dark,
    lightColor = DEFAULT_OPTIONS.color.light
  } = options;

  return QRCode.toDataURL(data, {
    width,
    margin: DEFAULT_OPTIONS.margin,
    color: {
      dark: darkColor,
      light: lightColor
    }
  });
}

/**
 * Generate multiple QR codes for a zine's CTA page
 *
 * @param {Object[]} items - Array of QR code items
 * @param {string} items[].data - URL or text to encode
 * @param {string} items[].label - Label for the QR code
 * @param {string} items[].filename - Output filename (without extension)
 * @param {string} [outputDir] - Output directory
 * @returns {Promise<Object[]>} - Array of generated QR code info
 */
export async function generateZineQRCodes(items, outputDir = path.join(__dirname, '..', 'output', 'qrcodes')) {
  await fs.mkdir(outputDir, { recursive: true });

  const results = [];

  for (const item of items) {
    const outputPath = path.join(outputDir, `${item.filename}.png`);
    await generateQRCode({
      data: item.data,
      outputPath
    });
    results.push({
      label: item.label,
      data: item.data,
      path: outputPath
    });
  }

  console.log(`Generated ${results.length} QR codes in ${outputDir}`);
  return results;
}

/**
 * Generate standard Undernet zine QR codes
 */
export async function generateUndernetQRCodes(outputDir) {
  const items = [
    {
      data: 'https://undernet.earth',
      label: 'UNDERNET.EARTH',
      filename: 'qr_undernet_earth'
    },
    {
      data: 'https://github.com/Jeff-Emmett/mycro-zine',
      label: 'PRINT MORE ZINES',
      filename: 'qr_print_zines'
    },
    {
      data: 'https://undernet.earth/template',
      label: 'BLANK TEMPLATE',
      filename: 'qr_blank_template'
    }
  ];

  return generateZineQRCodes(items, outputDir);
}

/**
 * CLI entry point
 * Usage: node qrcode.mjs <url> [--output <path>] [--color <hex>]
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
MycroZine QR Code Generator

Usage:
  node qrcode.mjs <url> [options]
  node qrcode.mjs --undernet    Generate standard Undernet zine QR codes

Options:
  --output, -o <path>    Output file path (PNG)
  --color, -c <hex>      QR code color (default: #000000)
  --bg <hex>             Background color (default: #00ff00)
  --width, -w <pixels>   Width in pixels (default: 300)

Examples:
  node qrcode.mjs https://undernet.earth -o qr_undernet.png
  node qrcode.mjs "Hello World" --color "#ff0000" --bg "#ffffff"
  node qrcode.mjs --undernet
`);
    return;
  }

  // Check for --undernet flag
  if (args.includes('--undernet')) {
    await generateUndernetQRCodes();
    return;
  }

  // Parse arguments
  let data = null;
  let outputPath = null;
  let darkColor = '#000000';
  let lightColor = '#00ff00';
  let width = 300;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--color':
      case '-c':
        darkColor = args[++i];
        break;
      case '--bg':
        lightColor = args[++i];
        break;
      case '--width':
      case '-w':
        width = parseInt(args[++i], 10);
        break;
      default:
        if (!args[i].startsWith('-')) {
          data = args[i];
        }
    }
  }

  if (!data) {
    console.error('Error: URL or text data required');
    process.exit(1);
  }

  if (!outputPath) {
    outputPath = path.join(__dirname, '..', 'output', 'qrcode.png');
  }

  await generateQRCode({
    data,
    outputPath,
    width,
    darkColor,
    lightColor
  });
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default {
  generateQRCode,
  generateQRCodeDataURL,
  generateZineQRCodes,
  generateUndernetQRCodes
};
