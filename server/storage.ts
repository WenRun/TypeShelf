import { cleanFontString, isCorruptedFontString } from "./font-utils";
import * as fs from "fs";
import * as path from "path";
import { 
  type Category, type InsertCategory,
  type Collection, type InsertCollection,
  type FontFile, type InsertFontFile,
  type FontFace, type InsertFontFace,
  type Favorite, type InsertFavorite,
  type CollectionItem, type InsertCollectionItem,
  type Tag, type InsertTag,
  type FontTag, type InsertFontTag,
  type FontTagWithDetails,
  type AiSettings,
  DEFAULT_AI_SYSTEM_PROMPT
} from "@shared/schema";
import { classifyFont, getTagColor, PRESET_TAGS } from "./classifier";

// File paths
const DATA_DIR = path.resolve("data");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const COLLECTIONS_FILE = path.join(DATA_DIR, "collections.json");
const FONT_FILES_FILE = path.join(DATA_DIR, "font_files.json");
const FONT_FACES_FILE = path.join(DATA_DIR, "font_faces.json");
const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");
const COLLECTION_ITEMS_FILE = path.join(DATA_DIR, "collection_items.json");
const TAGS_FILE = path.join(DATA_DIR, "tags.json");
const FONT_TAGS_FILE = path.join(DATA_DIR, "font_tags.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const AI_SUGGESTIONS_FILE = path.join(DATA_DIR, "ai_suggestions.json");

export interface IStorage {
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<Category | undefined>;

  getCollections(): Promise<(Collection & { count: number })[]>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, updates: Partial<Collection>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  getCollection(id: string): Promise<Collection | undefined>;
  
  addCollectionItem(item: InsertCollectionItem): Promise<CollectionItem>;
  removeCollectionItem(collectionId: string, targetType: string, targetId: string): Promise<void>;
  getCollectionFonts(collectionId: string, limit: number, offset: number): Promise<{ items: string[], total: number }>;

  getFavorites(): Promise<Favorite[]>;
  toggleFavorite(favorite: InsertFavorite): Promise<{ favorite?: Favorite, isFavorite: boolean }>;

  createFontFile(file: InsertFontFile): Promise<FontFile>;
  getFontFileByPath(fullPath: string): Promise<FontFile | undefined>;
  getFontFileByUrlKey(urlKey: string): Promise<FontFile | undefined>;
  createFontFace(face: InsertFontFace): Promise<FontFace>;
  
  searchFonts(params: any): Promise<{ items: any[], total: number }>;
  getFontFamily(family: string): Promise<any | undefined>;
  deleteFontFile(id: string): Promise<void>;
  deleteFontFileByPath(fullPath: string): Promise<void>;
  getTags(): Promise<(Tag & { count: number })[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  getFontTags(family: string): Promise<FontTagWithDetails[]>;
  addFontTag(family: string, tagName: string, source?: string): Promise<FontTagWithDetails>;
  removeFontTag(family: string, tagId: string): Promise<void>;
  autoTagFonts(family?: string): Promise<void>;
  reload(): Promise<void>;
  getAiSettings(): Promise<AiSettings>;
  saveAiSettings(settings: Partial<AiSettings>): Promise<AiSettings>;
  getAiSuggestions(family: string): Promise<{ suggestions: string[]; reason?: string } | undefined>;
  saveAiSuggestions(family: string, suggestions: string[], reason?: string): Promise<void>;
  getAllDataForExport(): Promise<any>;
}

export class JsonStorage implements IStorage {
  private categories: Category[] = [];
  private collections: Collection[] = [];
  private fontFiles: FontFile[] = [];
  private fontFaces: FontFace[] = [];
  private favorites: Favorite[] = [];
  private collectionItems: CollectionItem[] = [];
  private tags: Tag[] = [];
  private fontTags: FontTag[] = [];
  private aiSuggestions: Record<string, { suggestions: string[]; reason?: string }> = {};
  private aiSettings: AiSettings = {
    enabled: false,
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    model: "deepseek-chat",
    temperature: 0.3,
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  };

  constructor() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    this.load();
  }

  private load() {
    this.categories = this.readJson(CATEGORIES_FILE, []);
    this.collections = this.readJson(COLLECTIONS_FILE, []);
    this.fontFiles = this.readJson(FONT_FILES_FILE, []);
    this.fontFaces = this.readJson(FONT_FACES_FILE, []).map((f: any) => {
      let family = cleanFontString(f.family) || 'Unknown Font';
      if (family.toLowerCase() === 'pur' || isCorruptedFontString(family)) {
        const file = this.fontFiles.find((fl: any) => fl.id === f.fontFileId);
        if (file && file.filename) {
          family = file.filename.replace(/\.[^/.]+$/, '');
        }
      }
      const fullName = (cleanFontString(f.fullName) && f.fullName.toLowerCase() !== 'pur') ? cleanFontString(f.fullName) : family;
      return {
        ...f,
        family,
        subfamily: cleanFontString(f.subfamily) || 'Regular',
        fullName,
        postscriptName: cleanFontString(f.postscriptName) || null,
        version: cleanFontString(f.version) || null,
      };
    });
    this.favorites = this.readJson(FAVORITES_FILE, []);
    this.collectionItems = this.readJson(COLLECTION_ITEMS_FILE, []);
    this.tags = this.readJson(TAGS_FILE, []);
    this.fontTags = this.readJson(FONT_TAGS_FILE, []);
    this.aiSuggestions = this.readJson(AI_SUGGESTIONS_FILE, {});
    const defaultAiSettings: AiSettings = {
      enabled: Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY),
      provider: (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes("deepseek")) ? "deepseek" : "openai",
      baseUrl: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      systemPrompt: process.env.AI_SYSTEM_PROMPT || DEFAULT_AI_SYSTEM_PROMPT,
    };
    const savedSettings = this.readJson(SETTINGS_FILE, {});
    this.aiSettings = { ...defaultAiSettings, ...savedSettings };
    if (!this.aiSettings.systemPrompt) {
      this.aiSettings.systemPrompt = DEFAULT_AI_SYSTEM_PROMPT;
    }
    if (this.fontFaces.length > 0 && this.fontTags.length === 0) {
      this.autoTagFonts();
    }
  }

  private readJson(file: string, fallback: any) {
    if (!fs.existsSync(file)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return fallback;
    }
  }

  async reload(): Promise<void> {
    this.load();
  }

  private save() {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(this.categories, null, 2));
    fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(this.collections, null, 2));
    fs.writeFileSync(FONT_FILES_FILE, JSON.stringify(this.fontFiles, null, 2));
    fs.writeFileSync(FONT_FACES_FILE, JSON.stringify(this.fontFaces, null, 2));
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(this.favorites, null, 2));
    fs.writeFileSync(COLLECTION_ITEMS_FILE, JSON.stringify(this.collectionItems, null, 2));
    fs.writeFileSync(TAGS_FILE, JSON.stringify(this.tags, null, 2));
    fs.writeFileSync(FONT_TAGS_FILE, JSON.stringify(this.fontTags, null, 2));
    fs.writeFileSync(AI_SUGGESTIONS_FILE, JSON.stringify(this.aiSuggestions, null, 2));
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.aiSettings, null, 2));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return [...this.categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const created: Category = { 
      ...category, 
      id: crypto.randomUUID(), 
      status: category.status || "ok",
      lastError: category.lastError || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.categories.push(created);
    this.save();
    return created;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Not found");
    this.categories[idx] = { ...this.categories[idx], ...updates, updatedAt: new Date() };
    this.save();
    return this.categories[idx];
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    this.fontFiles = this.fontFiles.filter(f => f.categoryId !== id);
    this.save();
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.find(c => c.id === id);
  }

  // Collections
  async getCollections(): Promise<(Collection & { count: number })[]> {
    return this.collections.map(c => ({
      ...c,
      count: this.collectionItems.filter(i => i.collectionId === c.id).length
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const created: Collection = { 
      ...collection, 
      id: crypto.randomUUID(), 
      description: collection.description || null,
      color: collection.color || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.collections.push(created);
    this.save();
    return created;
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    const idx = this.collections.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Not found");
    this.collections[idx] = { ...this.collections[idx], ...updates, updatedAt: new Date() };
    this.save();
    return this.collections[idx];
  }

  async deleteCollection(id: string): Promise<void> {
    console.log(`Deleting collection: ${id}`);
    const originalLength = this.collections.length;
    this.collections = this.collections.filter(c => c.id !== id);
    
    console.log(`Collections length before: ${originalLength}, after: ${this.collections.length}`);

    // Explicitly delete all items associated with this collection
    this.collectionItems = this.collectionItems.filter(i => i.collectionId !== id);
    this.save();
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    return this.collections.find(c => c.id === id);
  }

  // Collection Items
  async addCollectionItem(item: InsertCollectionItem): Promise<CollectionItem> {
    const existing = this.collectionItems.find(i => 
      i.collectionId === item.collectionId && 
      i.targetType === item.targetType && 
      i.targetId === item.targetId
    );
    if (existing) return existing;
    const created: CollectionItem = { 
      ...item, 
      id: crypto.randomUUID(), 
      collectionId: item.collectionId || null,
      createdAt: new Date() 
    };
    this.collectionItems.push(created);
    this.save();
    return created;
  }

  async removeCollectionItem(collectionId: string, targetType: string, targetId: string): Promise<void> {
    this.collectionItems = this.collectionItems.filter(i => 
      !(i.collectionId === collectionId && i.targetType === targetType && i.targetId === targetId)
    );
    this.save();
  }

  async getCollectionFonts(collectionId: string, limit: number, offset: number): Promise<{ items: string[], total: number }> {
    const items = this.collectionItems
      .filter(i => i.collectionId === collectionId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
        return dateB - dateA;
      });
    return {
      items: items.slice(offset, offset + limit).map(i => i.targetId),
      total: items.length
    };
  }

  // Favorites
  async getFavorites(): Promise<Favorite[]> {
    return [...this.favorites].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      return dateB - dateA;
    });
  }

  async toggleFavorite(favorite: InsertFavorite): Promise<{ favorite?: Favorite, isFavorite: boolean }> {
    const idx = this.favorites.findIndex(f => 
      f.targetType === favorite.targetType && f.targetId === favorite.targetId
    );
    if (idx !== -1) {
      this.favorites.splice(idx, 1);
      this.save();
      return { isFavorite: false };
    } else {
      const created: Favorite = { ...favorite, id: crypto.randomUUID(), createdAt: new Date() };
      this.favorites.push(created);
      this.save();
      return { favorite: created, isFavorite: true };
    }
  }

  // Fonts
  async createFontFile(file: InsertFontFile): Promise<FontFile> {
    const created: FontFile = { 
      ...file, 
      id: crypto.randomUUID(), 
      categoryId: file.categoryId || null,
      duplicateGroupKey: file.duplicateGroupKey || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.fontFiles.push(created);
    this.save();
    return created;
  }

  async getFontFileByPath(fullPath: string): Promise<FontFile | undefined> {
    return this.fontFiles.find(f => f.fullPath === fullPath);
  }

  async getFontFileByUrlKey(urlKey: string): Promise<FontFile | undefined> {
    return this.fontFiles.find(f => f.urlKey === urlKey);
  }

  async createFontFace(face: InsertFontFace): Promise<FontFace> {
    let family = cleanFontString(face.family) || 'Unknown Font';
    if (family.toLowerCase() === 'pur' || isCorruptedFontString(family)) {
      const file = this.fontFiles.find((fl: any) => fl.id === face.fontFileId);
      if (file && file.filename) {
        family = file.filename.replace(/\.[^/.]+$/, '');
      }
    }
    const subfamily = cleanFontString(face.subfamily) || 'Regular';
    const postscriptName = cleanFontString(face.postscriptName) || null;
    const rawFullName = cleanFontString(face.fullName);
    const fullName = (rawFullName && rawFullName.toLowerCase() !== 'pur') ? rawFullName : family;
    const version = cleanFontString(face.version) || null;

    const created: FontFace = { 
      ...face, 
      family,
      subfamily,
      id: crypto.randomUUID(), 
      fontFileId: face.fontFileId || null,
      postscriptName,
      weight: face.weight || null,
      italic: face.italic || false,
      stretch: face.stretch || null,
      version,
      fullName,
      createdAt: new Date() 
    };
    this.fontFaces.push(created);
    this.save();
    return created;
  }

  async deleteFontFile(id: string): Promise<void> {
    this.fontFiles = this.fontFiles.filter(f => f.id !== id);
    this.fontFaces = this.fontFaces.filter(f => f.fontFileId !== id);
    this.save();
  }

  async deleteFontFileByPath(fullPath: string): Promise<void> {
    const file = this.fontFiles.find(f => f.fullPath === fullPath);
    if (file) await this.deleteFontFile(file.id);
  }

  async searchFonts(params: any): Promise<{ items: any[], total: number }> {
    let results = this.fontFaces.map(face => ({
      face,
      file: this.fontFiles.find(f => f.id === face.fontFileId)!
    })).filter(r => r.file);

    if (params.q) {
      const rawQ = String(params.q).toLowerCase().trim();
      const isTagPrefix = rawQ.startsWith("#");
      const cleanQ = isTagPrefix ? rawQ.slice(1).trim() : rawQ;

      const matchingTagIds = new Set(
        this.tags.filter(t => t.name.toLowerCase().includes(cleanQ)).map(t => t.id)
      );
      const matchingTagFamilies = new Set(
        this.fontTags.filter(ft => Boolean(ft.tagId && matchingTagIds.has(ft.tagId))).map(ft => ft.family)
      );

      if (isTagPrefix) {
        results = results.filter(r => (r.face?.family ? matchingTagFamilies.has(r.face.family) : false));
      } else {
        results = results.filter(r => 
          (r.face?.family && r.face.family.toLowerCase().includes(cleanQ)) || 
          (r.face?.subfamily && r.face.subfamily.toLowerCase().includes(cleanQ)) || 
          (r.file?.filename && r.file.filename.toLowerCase().includes(cleanQ)) ||
          (r.face?.family ? matchingTagFamilies.has(r.face.family) : false)
        );
      }
    }

    if (params.categoryId) {
      results = results.filter(r => r.file.categoryId === params.categoryId);
    }

    if (params.tagId) {
      const taggedFamilies = new Set(this.fontTags.filter(ft => ft.tagId === params.tagId).map(ft => ft.family));
      results = results.filter(r => taggedFamilies.has(r.face.family));
    }

    const favs = this.favorites.filter(f => f.targetType === 'family');
    const favFamilies = new Set(favs.map(f => f.targetId));

    if (params.favorites) {
      results = results.filter(r => favFamilies.has(r.face.family));
    }

    if (params.collectionId) {
      const colFamilies = new Set(this.collectionItems.filter(i => i.collectionId === params.collectionId && i.targetType === 'family').map(i => i.targetId));
      results = results.filter(r => colFamilies.has(r.face.family));
    }

    const grouped = new Map<string, any[]>();
    for (const { face, file } of results) {
      const famName = face.family || (file && file.filename ? file.filename.replace(/\.[^/.]+$/, '') : 'Unknown Font');
      if (!grouped.has(famName)) grouped.set(famName, []);
      grouped.get(famName)!.push({ ...face, family: famName, file });
    }

    const familyTagsMap = new Map<string, { id: string; name: string; color: string | null }[]>();
    for (const ft of this.fontTags) {
      const tag = this.tags.find(t => t.id === ft.tagId);
      if (tag) {
        if (!familyTagsMap.has(ft.family)) familyTagsMap.set(ft.family, []);
        familyTagsMap.get(ft.family)!.push({ id: tag.id, name: tag.name, color: tag.color });
      }
    }

    let families = Array.from(grouped.entries()).map(([family, faces]) => ({ 
      family, 
      faces,
      isFavorite: favFamilies.has(family),
      tags: familyTagsMap.get(family) || []
    }));
    
    if (params.sort === 'name_asc') {
      families.sort((a, b) => (a.family || '').localeCompare(b.family || ''));
    } else {
      families.sort((a, b) => {
        const dateA = Math.max(...a.faces.map(f => {
          const d = f.createdAt;
          return d instanceof Date ? d.getTime() : new Date(d as any).getTime() || 0;
        }));
        const dateB = Math.max(...b.faces.map(f => {
          const d = f.createdAt;
          return d instanceof Date ? d.getTime() : new Date(d as any).getTime() || 0;
        }));
        return dateB - dateA;
      });
    }

    return {
      items: families.slice(params.offset, params.offset + params.limit),
      total: families.length
    };
  }

  async getFontFamily(family: string): Promise<any | undefined> {
    const faces = this.fontFaces
      .filter(f => (f.family || '') === family)
      .map(face => ({ ...face, file: this.fontFiles.find(f => f.id === face.fontFileId)! }))
      .filter(r => r.file);

    if (faces.length === 0) return undefined;

    const collections = this.collectionItems
      .filter(i => i.targetType === 'family' && i.targetId === family)
      .map(i => i.collectionId);

    const tags = await this.getFontTags(family);
    const aiMeta = this.aiSuggestions[family] || null;

    return { family, faces, collections, tags, aiMeta };
  }

  // Tags
  async getTags(): Promise<(Tag & { count: number })[]> {
    const counts = new Map<string, number>();
    for (const ft of this.fontTags) {
      if (ft.tagId) {
        counts.set(ft.tagId, (counts.get(ft.tagId) || 0) + 1);
      }
    }
    return this.tags
      .map(t => ({
        ...t,
        count: counts.get(t.id) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const cleanName = tag.name.trim();
    const existing = this.tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;

    const created: Tag = {
      id: crypto.randomUUID(),
      name: cleanName,
      color: tag.color || getTagColor(cleanName),
      isSystem: tag.isSystem ?? false,
      createdAt: new Date(),
    };
    this.tags.push(created);
    this.save();
    return created;
  }

  async deleteTag(id: string): Promise<void> {
    this.tags = this.tags.filter(t => t.id !== id);
    this.fontTags = this.fontTags.filter(ft => ft.tagId !== id);
    this.save();
  }

  async getFontTags(family: string): Promise<FontTagWithDetails[]> {
    const matches = this.fontTags.filter(ft => ft.family === family);
    return matches
      .map(ft => {
        const tag = this.tags.find(t => t.id === ft.tagId);
        return {
          ...ft,
          name: tag ? tag.name : "未知标签",
          color: tag ? tag.color : null,
          isSystem: tag ? Boolean(tag.isSystem) : false,
        };
      })
      .filter(t => t.name !== "未知标签");
  }

  async addFontTag(family: string, tagName: string, source: string = "user"): Promise<FontTagWithDetails> {
    const cleanName = tagName.trim();
    if (!cleanName) throw new Error("Tag name cannot be empty");

    let tag = this.tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (!tag) {
      tag = {
        id: crypto.randomUUID(),
        name: cleanName,
        color: getTagColor(cleanName),
        isSystem: false,
        createdAt: new Date(),
      };
      this.tags.push(tag);
    }

    let fontTag = this.fontTags.find(ft => ft.family === family && ft.tagId === tag.id);
    if (!fontTag) {
      fontTag = {
        id: crypto.randomUUID(),
        family,
        tagId: tag.id,
        source: source || "user",
        createdAt: new Date(),
      };
      this.fontTags.push(fontTag);
      this.save();
    }

    return {
      ...fontTag,
      name: tag.name,
      color: tag.color,
      isSystem: Boolean(tag.isSystem),
    };
  }

  async removeFontTag(family: string, tagId: string): Promise<void> {
    this.fontTags = this.fontTags.filter(ft => !(ft.family === family && ft.tagId === tagId));
    this.save();
  }

  async autoTagFonts(targetFamily?: string): Promise<void> {
    for (const preset of PRESET_TAGS) {
      if (!this.tags.some(t => t.name === preset.name)) {
        this.tags.push({
          id: crypto.randomUUID(),
          name: preset.name,
          color: preset.color,
          isSystem: true,
          createdAt: new Date(),
        });
      }
    }

    const familiesToTag = targetFamily
      ? [targetFamily]
      : Array.from(new Set(this.fontFaces.map(f => f.family).filter(Boolean)));

    let hasChanges = false;

    for (const family of familiesToTag) {
      const faces = this.fontFaces.filter(f => f.family === family);
      if (faces.length === 0) continue;
      const files = faces
        .map(f => this.fontFiles.find(fl => fl.id === f.fontFileId))
        .filter(Boolean) as FontFile[];

      const existingFontTags = this.fontTags.filter(ft => ft.family === family);
      const ruleTags = classifyFont(family, faces, files);

      for (const rTag of ruleTags) {
        let tag = this.tags.find(t => t.name.toLowerCase() === rTag.name.toLowerCase());
        if (!tag) {
          tag = {
            id: crypto.randomUUID(),
            name: rTag.name,
            color: rTag.color,
            isSystem: true,
            createdAt: new Date(),
          };
          this.tags.push(tag);
          hasChanges = true;
        }

        if (!existingFontTags.some(ft => ft.tagId === tag.id)) {
          this.fontTags.push({
            id: crypto.randomUUID(),
            family,
            tagId: tag.id,
            source: "rule",
            createdAt: new Date(),
          });
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      this.save();
    }
  }


  async getAiSettings(): Promise<AiSettings> {
    return { ...this.aiSettings };
  }

  async saveAiSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
    this.aiSettings = {
      ...this.aiSettings,
      ...settings,
    };
    this.save();
    return { ...this.aiSettings };
  }

  async getAiSuggestions(family: string): Promise<{ suggestions: string[]; reason?: string } | undefined> {
    return this.aiSuggestions[family];
  }

  async saveAiSuggestions(family: string, suggestions: string[], reason?: string): Promise<void> {
    this.aiSuggestions[family] = { suggestions, reason };
    this.save();
  }

  async getAllDataForExport(): Promise<any> {
    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      categories: this.categories,
      collections: this.collections,
      collectionItems: this.collectionItems,
      fontFiles: this.fontFiles,
      fontFaces: this.fontFaces,
      favorites: this.favorites,
      tags: this.tags,
      fontTags: this.fontTags,
      settings: {
        enabled: this.aiSettings.enabled,
        provider: this.aiSettings.provider,
        baseUrl: this.aiSettings.baseUrl,
        model: this.aiSettings.model,
        systemPrompt: this.aiSettings.systemPrompt,
      },
    };
  }
}

export const storage = new JsonStorage();
