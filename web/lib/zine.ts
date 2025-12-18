import path from "path";
import { getAllPagePaths, readFileAsBuffer, savePrintLayout } from "./storage";

// Dynamic import of the ES module mycro-zine library
async function importMycroZine() {
  // The mycro-zine library is in the parent directory
  const libPath = path.resolve(process.cwd(), "..", "src", "layout.mjs");

  try {
    const module = await import(libPath);
    return module;
  } catch (error) {
    console.error("Failed to import mycro-zine library:", error);
    throw new Error("Could not load mycro-zine library");
  }
}

export interface PrintLayoutOptions {
  zineId: string;
  zineName?: string;
  background?: string;
}

export async function createPrintLayoutForZine(
  options: PrintLayoutOptions
): Promise<{ filepath: string; buffer: Buffer }> {
  const { zineId, zineName = "mycrozine", background = "#ffffff" } = options;

  // Get all page image paths
  const pagePaths = await getAllPagePaths(zineId);

  if (pagePaths.length !== 8) {
    throw new Error(`Expected 8 pages, got ${pagePaths.length}`);
  }

  // Read all page images as buffers
  const pageBuffers = await Promise.all(pagePaths.map((p) => readFileAsBuffer(p)));

  // Import the layout module
  const layoutModule = await importMycroZine();

  // Create the print layout using the existing library
  // The library expects either file paths or buffers
  const outputBuffer = await layoutModule.createPrintLayout({
    pages: pageBuffers,
    zineName,
    background,
    returnBuffer: true, // We'll need to add this option to the library
  });

  // Save the print layout
  const filepath = await savePrintLayout(zineId, outputBuffer);

  return { filepath, buffer: outputBuffer };
}

// Alternative: Create print layout directly with Sharp if library doesn't support buffer return
import sharp from "sharp";

export async function createPrintLayoutDirect(
  zineId: string,
  zineName: string = "mycrozine"
): Promise<{ filepath: string; buffer: Buffer }> {
  const pagePaths = await getAllPagePaths(zineId);

  if (pagePaths.length !== 8) {
    throw new Error(`Expected 8 pages, got ${pagePaths.length}`);
  }

  // Print layout dimensions (300 DPI, 11" x 8.5")
  const PRINT_WIDTH = 3300;
  const PRINT_HEIGHT = 2550;
  const PANEL_WIDTH = 825;
  const PANEL_HEIGHT = 1275;

  // Page arrangement for proper folding:
  // Top row (rotated 180°): P1, P8, P7, P6
  // Bottom row (normal):    P2, P3, P4, P5
  const pageArrangement = [
    // Top row
    { page: 1, col: 0, row: 0, rotate: 180 },
    { page: 8, col: 1, row: 0, rotate: 180 },
    { page: 7, col: 2, row: 0, rotate: 180 },
    { page: 6, col: 3, row: 0, rotate: 180 },
    // Bottom row
    { page: 2, col: 0, row: 1, rotate: 0 },
    { page: 3, col: 1, row: 1, rotate: 0 },
    { page: 4, col: 2, row: 1, rotate: 0 },
    { page: 5, col: 3, row: 1, rotate: 0 },
  ];

  // Create base canvas
  const canvas = sharp({
    create: {
      width: PRINT_WIDTH,
      height: PRINT_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  // Prepare composites
  const composites: sharp.OverlayOptions[] = [];

  for (const { page, col, row, rotate } of pageArrangement) {
    const pageBuffer = await readFileAsBuffer(pagePaths[page - 1]);

    // Resize page to panel size, maintaining aspect ratio
    let processedPage = sharp(pageBuffer).resize(PANEL_WIDTH, PANEL_HEIGHT, {
      fit: "cover",
      position: "center",
    });

    // Rotate if needed
    if (rotate !== 0) {
      processedPage = processedPage.rotate(rotate);
    }

    const pageData = await processedPage.toBuffer();

    composites.push({
      input: pageData,
      left: col * PANEL_WIDTH,
      top: row * PANEL_HEIGHT,
    });
  }

  // Composite all pages
  const outputBuffer = await canvas.composite(composites).png().toBuffer();

  // Save the print layout
  const filepath = await savePrintLayout(zineId, outputBuffer);

  return { filepath, buffer: outputBuffer };
}

export { createPrintLayoutDirect as createZinePrintLayout };
