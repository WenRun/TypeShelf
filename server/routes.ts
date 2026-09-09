import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanner } from "./scanner";
import { z } from "zod";
import * as path from "path";
import * as chokidar from "chokidar";
import * as fs from "fs";
import { seed } from "./seed";
import { insertCategorySchema, insertCollectionSchema, insertCollectionItemSchema, insertFavoriteSchema, insertAiSettingsSchema, type AiSettings, DEFAULT_AI_SYSTEM_PROMPT } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed data
  await seed();
  
  // === Categories ===
  app.get("/api/categories", async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const input = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(input);
      scanner.scanCategory(cat.id, cat.path).then(() => storage.reload());
      res.status(201).json(cat);
    } catch (err) {
       res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.status(204).send();
  });

  // === Collections ===
  app.get("/api/collections", async (req, res) => {
    const cols = await storage.getCollections();
    res.json(cols);
  });

  app.post("/api/collections", async (req, res) => {
    const input = insertCollectionSchema.parse(req.body);
    const col = await storage.createCollection(input);
    res.status(201).json(col);
  });
  
  app.delete("/api/collections/:id", async (req, res) => {
    await storage.deleteCollection(req.params.id);
    res.status(204).send();
  });

  app.get("/api/collections/:id/fonts", async (req, res) => {
    const { page, pageSize } = req.query as any;
    const result = await storage.getCollectionFonts(req.params.id, Number(pageSize || 50), (Number(page || 1) - 1) * Number(pageSize || 50));
    res.json(result);
  });

  app.post("/api/collections/:id/fonts", async (req, res) => {
    const input = insertCollectionItemSchema.parse(req.body);
    const item = await storage.addCollectionItem({ ...input, collectionId: req.params.id });
    res.status(201).json(item);
  });
  
  app.delete("/api/collections/:id/fonts/:targetId", async (req, res) => {
    const { targetId } = req.params;
    const { targetType } = req.query as { targetType: string };
    await storage.removeCollectionItem(req.params.id, targetType || 'family', targetId);
    res.status(204).send();
  });

  // === Stats ===
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get stats" });
    }
  });

  // === Favorites ===
  app.get("/api/favorites", async (req, res) => {
    const favs = await storage.getFavorites();
    res.json(favs);
  });
  
  app.post("/api/favorites/toggle", async (req, res) => {
    const input = insertFavoriteSchema.parse(req.body);
    const result = await storage.toggleFavorite(input);
    res.json(result);
  });

  // === Tags ===
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get tags" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const { name, color } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Tag name is required" });
      }
      const tag = await storage.createTag({ name, color });
      res.status(201).json(tag);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete tag" });
    }
  });

  // === Fonts ===
  app.get("/api/fonts", async (req, res) => {
    try {
      const q = req.query;
      const rawTagIds = q.tagIds || q.tagId;
      let tagIds: string[] | undefined = undefined;
      if (Array.isArray(rawTagIds)) {
        tagIds = rawTagIds.map(String).filter(Boolean);
      } else if (typeof rawTagIds === 'string' && rawTagIds.trim()) {
        tagIds = rawTagIds.split(',').map(s => s.trim()).filter(Boolean);
      }

      const result = await storage.searchFonts({
          q: q.q as string,
          categoryId: q.categoryId as string,
          collectionId: q.collectionId as string,
          tagId: q.tagId as string,
          tagIds,
          favorites: q.favorites === 'true',
          types: q.types ? (q.types as string).split(',') : undefined,
          italic: q.italic === 'true',
          weightMin: q.weightMin ? Number(q.weightMin) : undefined,
          weightMax: q.weightMax ? Number(q.weightMax) : undefined,
          sort: q.sort as string,
          limit: Number(q.pageSize || 50),
          offset: (Number(q.page || 1) - 1) * Number(q.pageSize || 50)
      });
      res.json(result);
    } catch (err: any) {
      console.error("Error in GET /api/fonts:", err);
      res.status(500).json({ message: err.message || "Failed to search fonts" });
    }
  });

  app.get("/api/fonts/:family", async (req, res) => {
    try {
      const result = await storage.getFontFamily(req.params.family);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err: any) {
      console.error("Error in GET /api/fonts/:family:", err);
      res.status(500).json({ message: err.message || "Failed to get font family" });
    }
  });

  app.get("/api/fonts/:family/tags", async (req, res) => {
    try {
      const tags = await storage.getFontTags(req.params.family);
      res.json(tags);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get font tags" });
    }
  });

  app.post("/api/fonts/:family/tags", async (req, res) => {
    try {
      const { name, source } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Tag name is required" });
      }
      const fontTag = await storage.addFontTag(req.params.family, name.trim(), source || "user");
      res.status(201).json(fontTag);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to add font tag" });
    }
  });

  app.delete("/api/fonts/:family/tags/:tagId", async (req, res) => {
    try {
      await storage.removeFontTag(req.params.family, req.params.tagId);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete font tag" });
    }
  });

  app.post("/api/fonts/:family/tags/auto", async (req, res) => {
    try {
      await storage.autoTagFonts(req.params.family);
      const tags = await storage.getFontTags(req.params.family);
      res.json(tags);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to auto-tag font" });
    }
  });

  // === AI Settings ===
  app.get("/api/settings/ai", async (_req, res) => {
    try {
      const settings = await storage.getAiSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load AI settings" });
    }
  });

  app.post("/api/settings/ai", async (req, res) => {
    try {
      const parsed = insertAiSettingsSchema.parse(req.body);
      const updated = await storage.saveAiSettings(parsed);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid AI settings input" });
    }
  });

  app.post("/api/settings/ai/test", async (req, res) => {
    try {
      const current = await storage.getAiSettings();
      const testSettings: AiSettings = {
        ...current,
        ...req.body,
      };

      if (!testSettings.baseUrl) {
        return res.json({ success: false, message: "Base URL 不能为空" });
      }
      if (!testSettings.apiKey && testSettings.provider !== "ollama") {
        return res.json({ success: false, message: "API Key 不能为空" });
      }

      const endpoint = `${testSettings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (testSettings.apiKey) {
        headers["Authorization"] = `Bearer ${testSettings.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: testSettings.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an API connection test bot." },
            { role: "user", content: "Hi" }
          ],
          max_tokens: 5,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        return res.json({
          success: false,
          latencyMs,
          message: `API 响应异常 (${response.status}): ${errText.slice(0, 200)}`,
        });
      }

      await response.json();
      return res.json({
        success: true,
        latencyMs,
        message: "API 连通测试成功",
        model: testSettings.model,
      });
    } catch (err: any) {
      const isAbort = err.name === "AbortError";
      return res.json({
        success: false,
        message: isAbort ? "请求超时（12秒未响应），请检查 Base URL 是否可达" : (err.message || "连通测试失败"),
      });
    }
  });

  // === Backup Export ===
  app.get("/api/backup/export", async (_req, res) => {
    try {
      const data = await storage.getAllDataForExport();
      res.setHeader("Content-Disposition", "attachment; filename=\"runfonts_backup.json\"");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(JSON.stringify(data, null, 2));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to export data" });
    }
  });

  // === AI Smart Tagging ===
  app.post("/api/fonts/:family/ai-tag", async (req, res) => {
    try {
      const family = req.params.family;
      const aiSettings = await storage.getAiSettings();

      // Fallback if AI disabled or apiKey missing (except ollama)
      if (!aiSettings.enabled || (!aiSettings.apiKey && aiSettings.provider !== "ollama")) {
        await storage.autoTagFonts(family);
        const tags = await storage.getFontTags(family);
        return res.json({
          status: "fallback_rule",
          message: "未配置或未开启 AI 密钥，已自动应用规则库智能识别",
          tags,
        });
      }

      const font = await storage.getFontFamily(family);
      if (!font) {
        return res.status(404).json({ message: "Font family not found" });
      }

      const subfamilies = (font.faces || []).map((f: any) => f.subfamily).filter(Boolean);
      const filenames = (font.files || []).map((f: any) => f.filename).filter(Boolean);
      const relPaths = (font.files || []).map((f: any) => f.relPath).filter(Boolean);

      const systemPrompt = (aiSettings.systemPrompt && aiSettings.systemPrompt.trim()) ? aiSettings.systemPrompt.trim() : DEFAULT_AI_SYSTEM_PROMPT;

      const userPrompt = `请对以下字体进行设计风格分析：
- 字体家族名: ${family}
- 字重与样式: ${subfamilies.join(", ") || "Regular"}
- 物理文件名: ${filenames.join(", ") || "未知"}
- 文件所在路径: ${relPaths.join(", ") || "未知"}`;

      const endpoint = `${aiSettings.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (aiSettings.apiKey) {
        headers["Authorization"] = `Bearer ${aiSettings.apiKey}`;
      }

      let parsed: { tags?: string[]; suggestions?: string[]; reason?: string } | null = null;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: aiSettings.model || "gpt-4o-mini",
            temperature: aiSettings.temperature ?? 0.3,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 150)}`);
        }

        const jsonResp = await response.json();
        const content = jsonResp.choices?.[0]?.message?.content || "";

        try {
          parsed = JSON.parse(content);
        } catch {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          }
        }
      } catch (llmErr: any) {
        console.warn(`[AI Tag] LLM call failed for ${family}: ${llmErr.message}, falling back to rule classifier.`);
        await storage.autoTagFonts(family);
        const tags = await storage.getFontTags(family);
        return res.json({
          status: "fallback_rule",
          message: `AI 分析失败（${llmErr.message}），已自动降级为规则识别`,
          tags,
        });
      }

      if (!parsed || !Array.isArray(parsed.tags) || parsed.tags.length === 0) {
        await storage.autoTagFonts(family);
        const tags = await storage.getFontTags(family);
        return res.json({
          status: "fallback_rule",
          message: "大模型返回内容未能提取有效标签，已降级为规则库识别",
          tags,
        });
      }

      const generatedTags: string[] = [];
      for (const rawTag of parsed.tags) {
        const cleanTag = String(rawTag).replace(/^[#＃\s]+|[#＃\s]+$/g, "").trim();
        if (cleanTag && cleanTag.length >= 2 && cleanTag.length <= 15) {
          await storage.addFontTag(family, cleanTag, "ai");
          generatedTags.push(cleanTag);
        }
      }

      const assignedTagNames = new Set((font.tags || []).map((tag: any) => String(tag.name).toLowerCase()));

      const candidateSuggestions: string[] = [];
      if (Array.isArray(parsed.suggestions)) {
        for (const raw of parsed.suggestions) {
          const clean = String(raw).replace(/^[#＃\s]+|[#＃\s]+$/g, "").trim();
          if (clean && clean.length >= 2 && clean.length <= 15 && !assignedTagNames.has(clean.toLowerCase()) && !generatedTags.includes(clean)) {
            candidateSuggestions.push(clean);
          }
        }
      }

      await storage.saveAiSuggestions(family, candidateSuggestions, parsed.reason);

      const updatedTags = await storage.getFontTags(family);
      return res.json({
        status: "success",
        message: "AI 风格分析完成",
        tags: updatedTags,
        aiReason: parsed.reason || "已由大模型完成风格特征归类",
        generatedTags,
        suggestions: candidateSuggestions,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to AI tag font" });
    }
  });

  app.post("/api/rescan", async (req, res) => {
    scanner.scanAll().then(() => storage.reload()); 
    res.json({ message: "Scan started" });
  });

  app.post("/api/reload", async (req, res) => {
    await storage.reload();
    res.json({ message: "Storage reloaded" });
  });

  // === Directory Browser ===
  app.get("/api/browse", async (req, res) => {
    let resolved = "";
    const queryPath = (req.query.path as string)?.trim();

    if (queryPath) {
      const candidate = path.resolve(queryPath);
      if (fs.existsSync(candidate)) {
        try {
          if (fs.statSync(candidate).isDirectory()) {
            resolved = candidate;
          }
        } catch (e) {}
      }
    }

    if (!resolved) {
      const candidates = [
        path.resolve("fonts"),
        "/app/fonts",
        path.resolve("."),
        "/app",
        process.env.HOME || "",
        process.platform === "win32" ? "C:\\" : "/"
      ];

      for (const cand of candidates) {
        if (cand && fs.existsSync(cand)) {
          try {
            const stat = fs.statSync(cand);
            if (stat.isDirectory()) {
              resolved = cand;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(400).json({ message: "Path does not exist" });
    }

    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      const directories = entries
        .filter(e => e.isDirectory() && !e.name.startsWith("."))
        .map(e => ({ name: e.name, path: path.join(resolved, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parsed = path.parse(resolved);
      const isRoot = resolved === parsed.root;

      res.json({
        entries: directories,
        currentPath: resolved,
        parentPath: isRoot ? null : path.dirname(resolved),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Static Serving ===
  app.get('/fonts-static/:urlKey/:filename', async (req, res) => {
    const file = await storage.getFontFileByUrlKey(req.params.urlKey);
    if (!file) return res.status(404).send("Not found");
    
    if (fs.existsSync(file.fullPath)) {
        res.sendFile(file.fullPath);
    } else {
        res.status(404).send("File missing on disk");
    }
  });

  // Start Scanner
  scanner.scanAll().then(() => storage.reload());

  // Watcher Setup
  const categories = await storage.getCategories();
  const paths = categories.filter(c => c.status === 'ok' && fs.existsSync(c.path)).map(c => c.path);
  if (paths.length > 0) {
      const watcher = chokidar.watch(paths, { ignored: /(^|[\/\\])\../, persistent: true });
      watcher.on('add', path => {
          const cat = categories.find(c => path.startsWith(c.path));
          if (cat) scanner.processFile(path, cat.id, cat.path);
      });
      watcher.on('change', path => {
          const cat = categories.find(c => path.startsWith(c.path));
          if (cat) scanner.processFile(path, cat.id, cat.path);
      });
      watcher.on('unlink', async path => {
          await storage.deleteFontFileByPath(path);
      });
  }

  return httpServer;
}
