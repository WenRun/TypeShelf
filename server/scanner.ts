import { storage } from "./storage";
import { InsertFontFile, InsertFontFace } from "@shared/schema";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as fontkit from "fontkit";
import { cleanFontString, isCorruptedFontString, resolveFontFamilyFromBuffer } from "./font-utils";

// Fontkit types are tricky, using any for now
type FontKitFont = any; 

export class Scanner {
  private isScanning = false;

  async scanAll() {
    if (this.isScanning) return;
    this.isScanning = true;
    console.log("Starting full scan...");
    try {
      const fontsDir = path.resolve('fonts');
      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }
      await this.scanDirectory(fontsDir);
    } catch (err) {
      console.error("Error during full scan:", err);
    } finally {
      this.isScanning = false;
      console.log("Scan complete.");
    }
  }

  async scanDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;

    const files = this.getFilesRecursively(dirPath);
    for (const file of files) {
      await this.processFile(file, dirPath);
    }

    // Clean up stale database records for font files that no longer exist on disk
    try {
      const existingFiles = await storage.getFontFiles();
      const currentFilesSet = new Set(files);
      for (const ef of existingFiles) {
        if (!currentFilesSet.has(ef.fullPath) || !fs.existsSync(ef.fullPath)) {
          await storage.deleteFontFile(ef.id);
        }
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up stale font files:', cleanupErr);
    }
  }

  getFilesRecursively(dir: string): string[] {
    let results: string[] = [];
    try {
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
          results = results.concat(this.getFilesRecursively(file));
        } else { 
          results.push(file);
        }
      });
    } catch (e) {
      console.error("Error scanning dir", dir, e);
    }
    return results;
  }

  async processFile(fullPath: string, rootPath: string = path.resolve('fonts')) {
    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
    if (!['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(ext)) return;

    // Check if exists
    const existing = await storage.getFontFileByPath(fullPath);
    const stat = fs.statSync(fullPath);
    
    // Optimize: if mtime and size match, skip parsing
    if (existing && existing.sizeBytes === stat.size && existing.mtimeMs === stat.mtimeMs) {
      return; 
    }

    try {
      const buffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha1').update(buffer).digest('hex');
      
      // Fontkit parsing
      let fonts: FontKitFont[] = [];
      try {
        const f = fontkit.openSync(fullPath);
        if (f.fonts) {
          fonts = f.fonts; // Collection
        } else {
          fonts = [f];
        }
      } catch (e) {
        console.error("Failed to parse font", fullPath, e);
        return;
      }

      // Create File Record
      if (existing) {
        await storage.deleteFontFile(existing.id);
      }

      const urlKey = hash.substring(0, 12) + '-' + path.basename(fullPath).replace(/[^a-zA-Z0-9.-]/g, '_');

      const fontFile: InsertFontFile = {
        fullPath,
        relPath: path.relative(rootPath, fullPath),
        filename: path.basename(fullPath),
        ext,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        sha1: hash,
        urlKey: urlKey
      };

      const createdFile = await storage.createFontFile(fontFile);

      // Create Faces with smart name resolution and sanitization
      let fontIdx = 0;
      for (const f of fonts) {
        const fallbackName = path.parse(fullPath).name || "Unknown Font";

        let familyName: string | undefined;
        if (!isCorruptedFontString(f.familyName)) {
          familyName = cleanFontString(f.familyName);
        }
        if (!familyName) {
          familyName = resolveFontFamilyFromBuffer(buffer, fontIdx, fallbackName);
        }

        const subfamilyName = cleanFontString(f.subfamilyName) || "Regular";

        let fullName: string | undefined;
        if (!isCorruptedFontString(f.fullName)) {
          fullName = cleanFontString(f.fullName);
        }
        if (!fullName) {
          fullName = familyName;
        }

        const rawPostscript = cleanFontString(f.postscriptName);
        const postscriptName = rawPostscript || familyName.replace(/[^a-zA-Z0-9-]/g, '');

        const face: InsertFontFace = {
          fontFileId: createdFile.id,
          family: familyName,
          subfamily: subfamilyName,
          postscriptName: postscriptName,
          weight: f['usWeightClass'] || 400,
          italic: f['italicAngle'] !== 0,
          stretch: f['usWidthClass']?.toString(),
          version: cleanFontString(f.version ? String(f.version) : undefined) || undefined,
          fullName: fullName
        };
        await storage.createFontFace(face);
        fontIdx++;
      }

      for (const f of fonts) {
        const fam = cleanFontString(f.familyName);
        if (fam) await storage.autoTagFonts(fam);
      }

    } catch (err) {
      console.error("Error processing file", fullPath, err);
    }
  }
}

export const scanner = new Scanner();
