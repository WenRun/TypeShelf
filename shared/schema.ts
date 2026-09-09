import { pgTable, text, serial, integer, boolean, timestamp, uuid, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  status: text("status").notNull().default("ok"), // 'ok' | 'missing' | 'error'
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fontFiles = pgTable("font_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: 'cascade' }),
  fullPath: text("full_path").notNull(),
  relPath: text("rel_path").notNull(),
  filename: text("filename").notNull(),
  ext: text("ext").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  mtimeMs: bigint("mtime_ms", { mode: "number" }).notNull(),
  sha1: text("sha1").notNull(),
  urlKey: text("url_key").notNull().unique(), // Stable key for serving
  duplicateGroupKey: text("duplicate_group_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fontFaces = pgTable("font_faces", {
  id: uuid("id").primaryKey().defaultRandom(),
  fontFileId: uuid("font_file_id").references(() => fontFiles.id, { onDelete: 'cascade' }),
  family: text("family").notNull(),
  subfamily: text("subfamily").notNull(),
  postscriptName: text("postscript_name"),
  weight: integer("weight"),
  italic: boolean("italic").default(false),
  stretch: text("stretch"),
  version: text("version"),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type").notNull(), // 'family' | 'face' | 'file'
  targetId: text("target_id").notNull(),     // Family Name or UUID
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color"), // e.g. blue, amber, emerald, pink, purple, orange, indigo, cyan, violet, slate
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fontTags = pgTable("font_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  family: text("family").notNull(),
  tagId: uuid("tag_id").references(() => tags.id, { onDelete: 'cascade' }),
  source: text("source").notNull().default("user"), // 'rule' | 'user' | 'ai'
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectionItems = pgTable("collection_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").references(() => collections.id, { onDelete: 'cascade' }),
  targetType: text("target_type").notNull(), // 'family' | 'face' | 'file'
  targetId: text("target_id").notNull(),     // Family Name or UUID
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const categoriesRelations = relations(categories, ({ many }) => ({
  fontFiles: many(fontFiles),
}));

export const fontFilesRelations = relations(fontFiles, ({ one, many }) => ({
  category: one(categories, {
    fields: [fontFiles.categoryId],
    references: [categories.id],
  }),
  faces: many(fontFaces),
}));

export const fontFacesRelations = relations(fontFaces, ({ one }) => ({
  file: one(fontFiles, {
    fields: [fontFaces.fontFileId],
    references: [fontFiles.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(collectionItems),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  fontTags: many(fontTags),
}));

export const fontTagsRelations = relations(fontTags, ({ one }) => ({
  tag: one(tags, {
    fields: [fontTags.tagId],
    references: [tags.id],
  }),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
}));

// === ZOD SCHEMAS ===

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFontFileSchema = createInsertSchema(fontFiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFontFaceSchema = createInsertSchema(fontFaces).omit({ id: true, createdAt: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertFontTagSchema = createInsertSchema(fontTags).omit({ id: true, createdAt: true });

export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({ id: true, createdAt: true });

// === TYPES ===

export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type FontFile = typeof fontFiles.$inferSelect;
export type FontFace = typeof fontFaces.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertFontFile = z.infer<typeof insertFontFileSchema>;
export type InsertFontFace = z.infer<typeof insertFontFaceSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Tag = typeof tags.$inferSelect;
export type FontTag = typeof fontTags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertFontTag = z.infer<typeof insertFontTagSchema>;

export type FontTagWithDetails = FontTag & {
  name: string;
  color?: string | null;
  isSystem?: boolean | null;
};

export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;

// Helper for type-safe API responses
export const api = {} as any;
export const buildUrl = (path: string, params: Record<string, string | number> = {}) => {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return url;
};

// === AI SETTINGS ===

export const DEFAULT_AI_SYSTEM_PROMPT = `你是一位精通视觉艺术、平面设计和中英文字体排版的资深字体专家。
你的任务是根据字体的名称、字重家族、物理文件路径等特征，全面分析其视觉风格与应用场景。

请严格提炼 3 到 4 个高价值的中文分类标签，必须覆盖以下两个维度：
1. 【基础字形类别】（必须且只能输出 1 个）：
   请从以下基础门类中选择最精准的 1 项：黑体、宋体、楷体、仿宋、圆体、书法手写、美术创意、等宽字体。
2. 【视觉风格与应用场景】（输出 2 到 3 个）：
   参考：现代极简、复古国风、商务办公、二次元可爱、电商海报、大标题字、正文排版、科技科幻、硬朗工业、童趣卡通、优雅文秀、潮酷街头、包装设计、影视字幕 等。

严格返回规则：
1. 必须输出合法 JSON 对象，格式如下，禁止输出任何 Markdown 格式或额外说明文字：
{"tags": ["基础类别", "风格或场景1", "风格或场景2"], "reason": "30字以内的设计分析理由"}
2. 每个标签长度在 2 到 8 个汉字，不要加 # 符号。`;

export interface AiSettings {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  systemPrompt?: string;
}

export const insertAiSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.string().default("openai"),
  baseUrl: z.string().min(1, "Base URL is required"),
  apiKey: z.string().default(""),
  model: z.string().min(1, "Model name is required"),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  systemPrompt: z.string().optional().default(DEFAULT_AI_SYSTEM_PROMPT),
});

export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
