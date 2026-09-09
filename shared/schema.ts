import { pgTable, text, serial, integer, boolean, timestamp, uuid, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

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

export const fontFilesRelations = relations(fontFiles, ({ many }) => ({
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

export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFontFileSchema = createInsertSchema(fontFiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFontFaceSchema = createInsertSchema(fontFaces).omit({ id: true, createdAt: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertFontTagSchema = createInsertSchema(fontTags).omit({ id: true, createdAt: true });

export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({ id: true, createdAt: true });

// === TYPES ===

export type Collection = typeof collections.$inferSelect;
export type FontFile = typeof fontFiles.$inferSelect;
export type FontFace = typeof fontFaces.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;

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

请输出两类分类标签：

1. 【核心正式分类】(tags，精选 3 到 4 个最核心分类，将自动添加为该字体的正式分类)：
   - 必须包含至少 1 个【基础字形门类】：从 黑体、宋体、楷体、仿宋、圆体、书法手写、等宽字体 等中选择最匹配的项；
   - 提炼 2 到 3 个最契合的【主视觉风格与应用场景】（例如：现代极简、复古国风、商务办公、二次元可爱、电商海报、大标题字 等）。
2. 【延伸推荐候选】(suggestions，提炼 5 到 8 个精准细分标签，将替换界面下方的推荐标签供用户点击挑选)：
   - 深入挖掘该字体其他潜在的细分风格、调性氛围、行业领域与排版搭配（例如：文创周边、日式和风、文艺清新、影视字幕、游戏UI、包装设计、儿童绘本、硬朗工业、潮流街头、封面排版、诗意随性 等）。

严格返回规则：

1. 必须输出合法 JSON 对象，格式如下，禁止输出任何 Markdown 格式或额外说明文字：
   {
   "tags": ["基础字形门类", "核心风格1", "核心场景2"],
   "suggestions": ["细分候选1", "细分候选2", "细分场景3", "细分场景4", "排版搭配5"],
   "reason": "30字以内的设计分析理由"
   }
2. 每个标签长度在 2 到 6 个汉字，不要加 # 符号。`;

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

export interface SystemStats {
  totalFonts: number;
  totalFavorites: number;
}
