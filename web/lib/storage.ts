import fs from "fs/promises";
import path from "path";
import type { ZineOutline, PageOutline } from "./gemini";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "..", "data");
const ZINES_DIR = path.join(DATA_DIR, "zines");

export interface StoredZine {
  id: string;
  topic: string;
  style: string;
  tone: string;
  outline: PageOutline[];
  pages: string[]; // Paths to page images (p1.png - p8.png)
  printLayout?: string; // Path to final print layout
  createdAt: string;
  updatedAt: string;
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function saveZine(zine: StoredZine): Promise<void> {
  const zineDir = path.join(ZINES_DIR, zine.id);
  await ensureDir(zineDir);

  const metadataPath = path.join(zineDir, "metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(zine, null, 2));
}

export async function getZine(id: string): Promise<StoredZine | null> {
  try {
    const metadataPath = path.join(ZINES_DIR, id, "metadata.json");
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function savePageImage(
  zineId: string,
  pageNumber: number,
  imageData: Buffer | string
): Promise<string> {
  const zineDir = path.join(ZINES_DIR, zineId);
  const pagesDir = path.join(zineDir, "pages");
  await ensureDir(pagesDir);

  const filename = `p${pageNumber}.png`;
  const filepath = path.join(pagesDir, filename);

  if (typeof imageData === "string") {
    // Handle base64 data URL
    if (imageData.startsWith("data:")) {
      const base64Data = imageData.split(",")[1];
      await fs.writeFile(filepath, Buffer.from(base64Data, "base64"));
    } else {
      // Assume it's already base64
      await fs.writeFile(filepath, Buffer.from(imageData, "base64"));
    }
  } else {
    await fs.writeFile(filepath, imageData);
  }

  return filepath;
}

export async function getPageImagePath(zineId: string, pageNumber: number): Promise<string | null> {
  const filepath = path.join(ZINES_DIR, zineId, "pages", `p${pageNumber}.png`);
  try {
    await fs.access(filepath);
    return filepath;
  } catch {
    return null;
  }
}

export async function getAllPagePaths(zineId: string): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const pagePath = await getPageImagePath(zineId, i);
    if (pagePath) {
      paths.push(pagePath);
    }
  }
  return paths;
}

export async function savePrintLayout(zineId: string, imageData: Buffer): Promise<string> {
  const zineDir = path.join(ZINES_DIR, zineId);
  await ensureDir(zineDir);

  const filepath = path.join(zineDir, "print.png");
  await fs.writeFile(filepath, imageData);

  return filepath;
}

export async function getPrintLayoutPath(zineId: string): Promise<string | null> {
  const filepath = path.join(ZINES_DIR, zineId, "print.png");
  try {
    await fs.access(filepath);
    return filepath;
  } catch {
    return null;
  }
}

export async function readFileAsBuffer(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}

export async function readFileAsBase64(filepath: string): Promise<string> {
  const buffer = await fs.readFile(filepath);
  return buffer.toString("base64");
}

export async function listAllZines(): Promise<string[]> {
  try {
    await ensureDir(ZINES_DIR);
    const entries = await fs.readdir(ZINES_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function deleteZine(id: string): Promise<void> {
  const zineDir = path.join(ZINES_DIR, id);
  try {
    await fs.rm(zineDir, { recursive: true });
  } catch {
    // Ignore if doesn't exist
  }
}

// Get URL-safe path for serving images
export function getPublicImageUrl(zineId: string, filename: string): string {
  return `/api/zine/${zineId}/image/${filename}`;
}

export function getPrintLayoutUrl(zineId: string): string {
  return `/api/zine/${zineId}/print`;
}
