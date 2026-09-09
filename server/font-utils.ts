import * as iconv from "iconv-lite";

export function cleanFontString(val?: any): string {
  if (!val) return "";
  return String(val).replace(/[\x00-\x1F\x7F\uFFFD]/g, "").trim();
}

export function isCorruptedFontString(val?: any): boolean {
  if (!val) return true;
  const s = String(val);
  if (s.includes("\uFFFD")) return true;
  if (/[\x00-\x1F\x7F]/.test(s)) return true;
  const cleaned = s.trim();
  if (cleaned.length === 0) return true;
  if (cleaned.toLowerCase() === "pur") return true;
  return false;
}

interface NameRecord {
  platformID: number;
  encodingID: number;
  languageID: number;
  nameID: number;
  strBuf: Buffer;
}

export function extractNamesFromBuffer(buf: Buffer, fontIndex = 0): NameRecord[] {
  try {
    const magic = buf.toString("ascii", 0, 4);
    let tableDirOffset = 0;
    if (magic === "ttcf") {
      const numFonts = buf.readUInt32BE(8);
      if (fontIndex >= numFonts) return [];
      tableDirOffset = buf.readUInt32BE(12 + fontIndex * 4);
    }

    const numTables = buf.readUInt16BE(tableDirOffset + 4);
    let nameOffset = 0;
    for (let i = 0; i < numTables; i++) {
      const tag = buf.toString("ascii", tableDirOffset + 12 + i * 16, tableDirOffset + 12 + i * 16 + 4);
      if (tag === "name") {
        nameOffset = buf.readUInt32BE(tableDirOffset + 12 + i * 16 + 8);
        break;
      }
    }
    if (!nameOffset) return [];

    const count = buf.readUInt16BE(nameOffset + 2);
    const stringOffset = nameOffset + buf.readUInt16BE(nameOffset + 4);
    const names: NameRecord[] = [];

    for (let j = 0; j < count; j++) {
      const rec = nameOffset + 6 + j * 12;
      const platformID = buf.readUInt16BE(rec);
      const encodingID = buf.readUInt16BE(rec + 2);
      const languageID = buf.readUInt16BE(rec + 4);
      const nameID = buf.readUInt16BE(rec + 6);
      const strLen = buf.readUInt16BE(rec + 8);
      const strOff = buf.readUInt16BE(rec + 10);
      if (stringOffset + strOff + strLen <= buf.length) {
        const strBuf = buf.subarray(stringOffset + strOff, stringOffset + strOff + strLen);
        names.push({ platformID, encodingID, languageID, nameID, strBuf });
      }
    }
    return names;
  } catch (e) {
    return [];
  }
}

export function resolveFontFamilyFromBuffer(buf: Buffer, fontIndex = 0, fallback = "Unknown Font"): string {
  const records = extractNamesFromBuffer(buf, fontIndex);
  const familyRecords = records.filter(r => r.nameID === 1 || r.nameID === 4);
  const candidates: { text: string; score: number }[] = [];

  for (const r of familyRecords) {
    const isFamilyName = r.nameID === 1;
    const bonus = isFamilyName ? 10 : 0;

    // 1. Windows Unicode (platform 3, encoding 1/10) or Unicode consortium (platform 0)
    if (r.platformID === 0 || (r.platformID === 3 && (r.encodingID === 1 || r.encodingID === 10))) {
      try {
        const s = cleanFontString(iconv.decode(r.strBuf, "utf-16be"));
        if (s && !isCorruptedFontString(s)) {
          const isChineseLang = [1028, 2052, 3076, 4100, 5124].includes(r.languageID);
          const hasCjk = /[\u4e00-\u9fa5]/.test(s);
          const score = (isChineseLang && hasCjk) ? 200 : (hasCjk ? 180 : (isChineseLang ? 150 : 120));
          candidates.push({ text: s, score: score + bonus });
        }
      } catch (_) {}
    }

    // 2. Winman 1990s bug: 0x00 padded before every Big5 byte
    if (r.strBuf.length >= 4 && r.strBuf[0] === 0x00 && r.strBuf[2] === 0x00) {
      try {
        const stripped = Buffer.from(r.strBuf.filter(b => b !== 0));
        const s = cleanFontString(iconv.decode(stripped, "big5"));
        if (s && /[\u4e00-\u9fa5]/.test(s) && !isCorruptedFontString(s)) {
          candidates.push({ text: s, score: 170 + bonus });
        }
      } catch (_) {}
    }

    // 3. Macintosh Big5 (platform 1, encoding 2)
    if (r.platformID === 1 && r.encodingID === 2) {
      try {
        const s = cleanFontString(iconv.decode(r.strBuf, "big5"));
        if (s && /[\u4e00-\u9fa5]/.test(s) && !isCorruptedFontString(s)) {
          candidates.push({ text: s, score: 140 + bonus });
        }
      } catch (_) {}
    }

    // 4. Macintosh GB2312 (platform 1, encoding 25)
    if (r.platformID === 1 && r.encodingID === 25) {
      try {
        const s = cleanFontString(iconv.decode(r.strBuf, "gbk"));
        if (s && /[\u4e00-\u9fa5]/.test(s) && !isCorruptedFontString(s)) {
          candidates.push({ text: s, score: 140 + bonus });
        }
      } catch (_) {}
    }

    // 5. Windows PRC GBK (platform 3, encoding 3)
    if (r.platformID === 3 && r.encodingID === 3) {
      try {
        const sUtf16 = cleanFontString(iconv.decode(r.strBuf, "utf-16be"));
        if (sUtf16 && /[\u4e00-\u9fa5]/.test(sUtf16) && !isCorruptedFontString(sUtf16)) {
          candidates.push({ text: sUtf16, score: 135 + bonus });
        }
        const sGbk = cleanFontString(iconv.decode(r.strBuf, "gbk"));
        if (sGbk && /[\u4e00-\u9fa5]/.test(sGbk) && !isCorruptedFontString(sGbk)) {
          candidates.push({ text: sGbk, score: 130 + bonus });
        }
      } catch (_) {}
    }

    // 6. Macintosh Roman (platform 1, encoding 0)
    if (r.platformID === 1 && r.encodingID === 0) {
      try {
        const s = cleanFontString(iconv.decode(r.strBuf, "macintosh"));
        if (s && !isCorruptedFontString(s)) {
          candidates.push({ text: s, score: 80 + bonus });
        }
      } catch (_) {}
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].text;
  }
  return fallback;
}
