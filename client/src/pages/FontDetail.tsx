import { useFont, useToggleFavorite } from "@/hooks/use-fonts";
import { Sidebar } from "@/components/Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Link, useRoute, useLocation } from "wouter";
import { ToastAction } from "@/components/ui/toast";
import { 
  ArrowLeft, Heart, Download, Info, Code, Plus, Globe, Copy, 
  Tag as TagIcon, Sparkles, X, RefreshCw, UserPlus 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFontTags, useAddFontTag, useRemoveFontTag, useAutoTagFont, useAiTagFont } from "@/hooks/use-tags";
import { getTagBadgeStyle } from "@/lib/tag-styles";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCollections, useAddFontToCollection } from "@/hooks/use-collections";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type FontFace, type FontFile, type FontTagWithDetails } from "@shared/schema";
import { useTranslation } from "react-i18next";

type FontFaceWithFile = FontFace & { file: FontFile };

export default function FontDetail() {
  const { t } = useTranslation();
  const [match, params] = useRoute("/fonts/:family");
  const familyName = match && params ? decodeURIComponent(params.family) : "";
  const { data: font, isLoading } = useFont(familyName);
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: collections } = useCollections();
  const { mutate: addToCollection } = useAddFontToCollection();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: fontTags = [], isLoading: isLoadingTags } = useFontTags(familyName);
  const { mutate: addFontTag, isPending: isAddingTag } = useAddFontTag(familyName);
  const { mutate: removeFontTag } = useRemoveFontTag(familyName);
  const { mutate: autoTag, isPending: isAutoTagging } = useAutoTagFont(familyName);
  const { mutate: aiTag, isPending: isAiTagging } = useAiTagFont(familyName);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSystemPresets, setShowSystemPresets] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    if (font?.aiMeta?.suggestions && Array.isArray(font.aiMeta.suggestions)) {
      setAiSuggestions(font.aiMeta.suggestions);
    }
  }, [font?.aiMeta?.suggestions]);

  const handleAiTag = () => {
    aiTag(undefined, {
      onSuccess: (res: any) => {
        if (res.status === "fallback_rule") {
          toast({
            title: res.message || t("fontDetail.aiTagFallback"),
            description: t("fontDetail.aiTagFallbackDesc"),
            action: (
              <ToastAction
                altText={t("fontDetail.goToSettings")}
                onClick={() => setLocation("/settings")}
                className="hover:bg-primary hover:text-primary-foreground shrink-0 cursor-pointer"
              >
                {t("fontDetail.goToSettings")}
              </ToastAction>
            ),
          });
        } else {
          if (Array.isArray(res.suggestions)) {
            setAiSuggestions(res.suggestions);
          }
          toast({
            title: res.message || t("fontDetail.aiTagSuccess"),
            description: res.aiReason || (res.generatedTags?.length ? `${t("fontDetail.tags")}: ${res.generatedTags.join(", ")}` : undefined),
          });
        }
      },
      onError: (err: any) => {
        toast({ title: err.message || "AI failed", variant: "destructive" });
      }
    });
  };
  const [newTagName, setNewTagName] = useState("");

  const PRESET_SUGGESTIONS = [
    "黑体", "宋体", "楷体", "仿宋", "圆体", "书法手写", "美术创意", "卡通可爱", "艺术海报", "等宽字体", "可变字体"
  ];

  const unassignedAiSuggestions = useMemo(() => {
    const currentNames = new Set(fontTags.map((t: FontTagWithDetails) => t.name.toLowerCase()));
    return aiSuggestions.filter(s => !currentNames.has(s.toLowerCase()));
  }, [fontTags, aiSuggestions]);

  const unassignedPresets = useMemo(() => {
    const currentNames = new Set([
      ...fontTags.map((t: FontTagWithDetails) => t.name.toLowerCase()),
      ...unassignedAiSuggestions.map(s => s.toLowerCase()),
    ]);
    return PRESET_SUGGESTIONS.filter(p => !currentNames.has(p.toLowerCase()));
  }, [fontTags, unassignedAiSuggestions]);

  const handleAddTag = (name: string, source: string = "user") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addFontTag({ name: trimmed, source }, {
      onSuccess: () => {
        setNewTagName("");
        toast({ title: t("fontDetail.tagAdded") });
      },
      onError: (err: any) => {
        toast({ title: err.message || "Failed to add tag", variant: "destructive" });
      }
    });
  };

  const handleRemoveTag = (tagId: string) => {
    removeFontTag(tagId, {
      onSuccess: () => {
        toast({ title: t("fontDetail.tagRemoved") });
      }
    });
  };

  const handleAutoTag = () => {
    autoTag(undefined, {
      onSuccess: () => {
        toast({ title: t("fontDetail.reanalyzed") });
      }
    });
  };

  const fontFiles = useMemo(() => {
    if (!font?.faces) return [];
    const map = new Map<string, FontFile>();
    font.faces.forEach((f: FontFaceWithFile) => {
      if (f.file) {
        const key = f.file.id || f.file.fullPath || f.file.filename;
        if (!map.has(key)) {
          map.set(key, f.file);
        }
      }
    });
    return Array.from(map.values());
  }, [font]);

  const copyToClipboard = (text: string, successMsg: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: successMsg });
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  };

  const fallbackCopy = (text: string, successMsg: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({ title: successMsg });
    } catch {
      toast({ title: t("fontDetail.copyFailed"), variant: "destructive" });
    }
  };

  const [customPreview, setCustomPreview] = useState("");
  const previewText = customPreview.trim() ? customPreview : t("fontDetail.previewDefault");
  const [fontSize, setFontSize] = useState([64]);

  const handleToggleFavorite = () => {
    toggleFavorite({ targetType: "family", targetId: familyName }, {
      onSuccess: () => {
        toast({ title: t("fontDetail.updatedFavorites") });
      }
    });
  };

  const handleAddToCollection = (collectionId: string, collectionName: string) => {
    addToCollection({ collectionId, targetType: "family", targetId: familyName }, {
      onSuccess: () => {
        toast({ title: t("fontCard.addedToCollection", { family: familyName, name: collectionName }) });
      }
    });
  };

  // Inject styles for all faces
  useEffect(() => {
    if (!font?.faces) return;
    
    const style = document.createElement('style');
    let css = '';
    
    font.faces.forEach((face: FontFaceWithFile) => {
      const url = `/fonts-static/${face.file.urlKey}/${face.file.filename}`;
      css += `
        @font-face {
          font-family: 'Font-${face.id}';
          src: url('${url}');
        }
      `;
    });
    
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [font]);

  if (isLoading || !font) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const firstFace = font.faces?.[0];
  const webIntegrationCode = `@font-face {
  font-family: '${font.family}';
  src: url('/fonts-static/${firstFace?.file?.urlKey || ""}/${firstFace?.file?.filename || ""}');
  font-weight: normal;
  font-style: normal;
}`;

  const cssUsageCode = `body {
  font-family: '${font.family}', sans-serif;
}`;

  const renderInspectorContent = () => (
    <Tabs defaultValue="info" className="flex flex-col h-full overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border bg-card/50 backdrop-blur shrink-0">
        <TabsList className="grid grid-cols-3 w-full bg-secondary/30">
          <TabsTrigger value="info" className="text-xs">
            <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{t("fontDetail.tabInfo")}</span>
          </TabsTrigger>
          <TabsTrigger value="download" className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{t("fontDetail.tabFiles")}</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            <Code className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{t("fontDetail.tabCode")}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <TabsContent value="info" className="mt-0 space-y-6 sm:space-y-8">
          <section className="space-y-3 sm:space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("fontDetail.metadata")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="bg-secondary/20 p-3 rounded-lg border border-border/50">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  {t("fontDetail.family")}
                </span>
                <span className="text-sm font-medium">{font.family}</span>
              </div>
              <div className="bg-secondary/20 p-3 rounded-lg border border-border/50">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  {t("fontDetail.styles")}
                </span>
                <span className="text-sm font-medium">
                  {t("fontDetail.totalStyles", { count: font.faces.length })}
                </span>
              </div>

              {fontFiles.length === 1 && (
                <>
                  <div className="bg-secondary/20 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                        {t("fontDetail.fileName")}
                      </span>
                      <button
                        onClick={() => copyToClipboard(fontFiles[0].filename, t("fontDetail.fileNameCopied"))}
                        className="p-1 -mr-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title={t("fontDetail.copy")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-medium font-mono break-all select-all block">
                      {fontFiles[0].filename}
                    </span>
                  </div>

                  <div className="bg-secondary/20 p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                        {t("fontDetail.relativePath")}
                      </span>
                      <button
                        onClick={() => copyToClipboard((fontFiles[0].relPath || fontFiles[0].filename).replace(/\\/g, '/'), t("fontDetail.pathCopied"))}
                        className="p-1 -mr-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title={t("fontDetail.copy")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-medium font-mono text-muted-foreground/90 break-all select-all block leading-relaxed">
                      {(fontFiles[0].relPath || fontFiles[0].filename).replace(/\\/g, '/')}
                    </span>
                  </div>
                </>
              )}

              {fontFiles.length > 1 && (
                <div className="bg-secondary/20 p-3 rounded-lg border border-border/50 space-y-3">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                    {t("fontDetail.fontFilesAndPaths", { count: fontFiles.length })}
                  </span>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {fontFiles.map((file, idx) => {
                      const normalizedPath = (file.relPath || file.filename).replace(/\\/g, '/');
                      return (
                        <div key={file.id || idx} className="p-2.5 rounded-md bg-background/50 border border-border/40 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground text-xs truncate font-mono" title={file.filename}>
                              {file.filename}
                            </span>
                            <button
                              onClick={() => copyToClipboard(file.filename, t("fontDetail.fileNameCopied"))}
                              className="p-1 -mr-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title={t("fontDetail.copy")}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground/80 font-mono text-[11px] break-all select-all leading-relaxed" title={normalizedPath}>
                              {normalizedPath}
                            </span>
                            <button
                              onClick={() => copyToClipboard(normalizedPath, t("fontDetail.pathCopied"))}
                              className="p-1 -mr-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title={t("fontDetail.copy")}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                {t("fontDetail.tags")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoTag}
                  disabled={isAutoTagging || isAiTagging}
                  className="h-7 rounded-md border-border/70 bg-background/40 text-[11px] px-2 text-muted-foreground hover:text-foreground justify-center"
                  title={t("fontDetail.reanalyzeTags")}
                >
                  <RefreshCw className={cn("w-3 h-3 text-primary mr-1", isAutoTagging && "animate-spin")} />
                  <span className="truncate">{t("fontDetail.reanalyzeTags")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiTag}
                  disabled={isAutoTagging || isAiTagging}
                  className="h-7 rounded-md border-amber-500/40 bg-amber-500/5 text-[11px] px-2 text-muted-foreground hover:text-foreground justify-center hover:border-amber-500/60"
                  title={t("fontDetail.aiTag")}
                >
                  <Sparkles className={cn("w-3 h-3 text-amber-500 mr-1", isAiTagging && "animate-spin")} />
                  <span className="truncate">{t("fontDetail.aiTag")}</span>
                </Button>
              </div>
            </div>

            {/* Tag Badges */}
            <div className="flex flex-wrap gap-2">
              {fontTags.map((tag: FontTagWithDetails) => (
                <div
                  key={tag.id}
                  className={cn(
                    "group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all shadow-xs",
                    getTagBadgeStyle(tag.color)
                  )}
                >
                  <span className="whitespace-nowrap">{tag.name}</span>
                  {tag.source === "rule" && (
                    <span className="inline-flex" title={t("fontDetail.ruleSource")}>
                      <RefreshCw className="w-3 h-3 text-blue-500 dark:text-blue-300" />
                    </span>
                  )}
                  {tag.source === "ai" && (
                    <span className="inline-flex" title={t("fontDetail.aiSource")}>
                      <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-300" />
                    </span>
                  )}
                  {tag.source === "user" && (
                    <span className="inline-flex" title={t("fontDetail.userSource")}>
                      <UserPlus className="w-3 h-3 text-emerald-500 dark:text-emerald-300" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => tag.tagId && handleRemoveTag(tag.tagId)}
                    className="absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm opacity-100 sm:opacity-0 pointer-events-auto sm:pointer-events-none transition-colors sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive cursor-pointer"
                    title={t("fontDetail.deleteTag")}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {fontTags.length === 0 && !isLoadingTags && (
                <p className="text-xs text-muted-foreground italic py-1">
                  {t("fontDetail.noTags")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80">
              <span>{t("fontDetail.tagSourceLegend")}:</span>
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-blue-500 dark:text-blue-300" />
                {t("fontDetail.ruleSource")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-300" />
                {t("fontDetail.aiSource")}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserPlus className="w-3 h-3 text-emerald-500 dark:text-emerald-300" />
                {t("fontDetail.userSource")}
              </span>
            </div>

            {/* AI Tailored Candidate Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-1.5 pt-1.5 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    {t("fontDetail.aiSuggestionsTitle")}:
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {t("fontDetail.aiCandidatesCount", { count: unassignedAiSuggestions.length })}
                  </span>
                </div>
                {unassignedAiSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unassignedAiSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddTag(suggestion, "ai")}
                        disabled={isAddingTag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer shadow-2xs"
                        title={t("fontDetail.clickToAddTag", { tag: suggestion })}
                      >
                        <Plus className="w-3 h-3 opacity-80" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-md px-2.5 py-1.5">
                    {t("fontDetail.allAiSuggestionsAdded")}
                  </p>
                )}
              </div>
            )}

            {/* Standard Preset Tags */}
            {(aiSuggestions.length === 0 || showSystemPresets) && unassignedPresets.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {aiSuggestions.length > 0 ? t("fontDetail.systemPresetTags") : t("fontDetail.suggestedTags")}:
                  </span>
                  {aiSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSystemPresets((visible) => !visible)}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2 cursor-pointer"
                    >
                      {showSystemPresets ? t("fontDetail.hideSystemPresets") : t("fontDetail.showSystemPresets")}
                    </button>
                  )}
                </div>
                {aiSuggestions.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/80">{t("fontDetail.clickAiHint")}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {unassignedPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddTag(preset, "user")}
                      disabled={isAddingTag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-dashed border-border transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Tag Input */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(newTagName, "user");
                  }
                }}
                placeholder={t("fontDetail.addCustomTag")}
                className="h-8 text-xs bg-secondary/30"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!newTagName.trim() || isAddingTag}
                onClick={() => handleAddTag(newTagName, "user")}
                className="h-8 px-3 text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t("fontDetail.addTag")}
              </Button>
            </div>
          </section>

          <section className="space-y-4 pt-6 border-t border-border/70">
            <h3 className="text-sm font-semibold text-foreground">{t("fontDetail.about")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("fontDetail.aboutDesc", { family: font.family })}
            </p>
          </section>
        </TabsContent>

        <TabsContent value="download" className="mt-0 space-y-4">
          <h3 className="text-sm font-semibold mb-4">{t("fontDetail.fontFiles")}</h3>
          <div className="space-y-2">
            {font.faces.map((face: FontFaceWithFile) => (
              <div key={face.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/10 group hover:bg-secondary/20 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{face.subfamily}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">{face.file.ext} • {Math.round(face.file.sizeBytes / 1024)}KB</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`/fonts-static/${face.file.urlKey}/${face.file.filename}`} download>
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="code" className="mt-0 space-y-6">
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("fontDetail.webIntegration")}
            </h4>
            <div className="relative">
              <pre
                className="p-4 rounded-lg bg-secondary/50 text-[11px] font-mono text-foreground overflow-x-auto border border-border cursor-pointer"
                title={t("fontDetail.clickToCopy")}
                onClick={() => copyToClipboard(webIntegrationCode, t("fontDetail.codeCopied"))}
              >
                {webIntegrationCode}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                title={t("fontDetail.copy")}
                onClick={(event) => {
                  event.stopPropagation();
                  copyToClipboard(webIntegrationCode, t("fontDetail.codeCopied"));
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("fontDetail.cssUsage")}
            </h4>
            <div className="relative">
              <pre
                className="p-4 rounded-lg bg-secondary/50 text-[11px] font-mono text-foreground overflow-x-auto border border-border cursor-pointer"
                title={t("fontDetail.clickToCopy")}
                onClick={() => copyToClipboard(cssUsageCode, t("fontDetail.codeCopied"))}
              >
                {cssUsageCode}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                title={t("fontDetail.copy")}
                onClick={(event) => {
                  event.stopPropagation();
                  copyToClipboard(cssUsageCode, t("fontDetail.codeCopied"));
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </section>
        </TabsContent>
      </div>
      
      <div className="p-4 sm:p-6 border-t border-border mt-auto shrink-0 flex flex-col gap-3 sm:gap-4 bg-card">
        <div className="flex items-center gap-2 px-1">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("fontDetail.licenseTitle")}
          </span>
        </div>
        {font.faces[0] && (
          <Button className="w-full h-10 sm:h-11" size="lg" asChild>
            <a href={`/fonts-static/${font.faces[0].file.urlKey}/${font.faces[0].file.filename}`} download>
              <Download className="w-4 h-4 mr-2" />
              {t("fontDetail.downloadFamily")}
            </a>
          </Button>
        )}
      </div>
    </Tabs>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative border-r border-border">
        {/* Detail Header */}
        <header className="h-14 sm:h-16 border-b border-border bg-card/50 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link 
              href="/" 
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title={t("fontDetail.backToList")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base sm:text-xl font-bold font-display truncate max-w-[130px] xs:max-w-[200px] sm:max-w-xs md:max-w-md" title={font.family}>
              {font.family}
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground shrink-0">
              {t("fontDetail.stylesCount", { count: font.faces.length })}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
              className={cn(
                "h-8 sm:h-9 px-2 sm:px-3 transition-all duration-200",
                font.isFavorite
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={font.isFavorite ? t("fontDetail.favorited") : t("fontDetail.favorite")}
            >
              <Heart
                className={cn(
                  "w-4 h-4 sm:mr-1.5 transition-all duration-200",
                  font.isFavorite
                    ? "fill-rose-500 text-rose-500 scale-110"
                    : "text-muted-foreground"
                )}
              />
              <span className="hidden sm:inline">{font.isFavorite ? t("fontDetail.favorited") : t("fontDetail.favorite")}</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3" title={t("fontDetail.addToCollectionBtn")}>
                  <Plus className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("fontDetail.addToCollectionBtn")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {collections?.map((col: any) => (
                  <DropdownMenuItem key={col.id} onClick={() => handleAddToCollection(col.id, col.name)}>
                    {t("fontCard.addToCollection", { name: col.name })}
                  </DropdownMenuItem>
                ))}
                {(!collections || collections.length === 0) && (
                  <DropdownMenuItem disabled>{t("fontCard.noCollections")}</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {font.faces[0] && (
              <Button size="sm" className="h-8 sm:h-9 px-2 sm:px-3 hidden sm:inline-flex" asChild>
                <a href={`/fonts-static/${font.faces[0].file.urlKey}/${font.faces[0].file.filename}`} download title={t("fontDetail.download")}>
                  <Download className="w-4 h-4 sm:mr-1.5" />
                  <span>{t("fontDetail.download")}</span>
                </a>
              </Button>
            )}

            {/* Mobile Inspector Trigger */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground relative"
              onClick={() => setInspectorOpen(true)}
              title={t("fontDetail.tabInfo")}
            >
              <Info className="w-4 h-4" />
              {fontTags.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>

            <ThemeSwitcher variant="icon" />
            <LanguageSwitcher variant="icon" />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-12">
            {/* Interactive Preview Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 items-end border-b border-border/50 pb-6 sm:pb-8">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {t("fontDetail.previewTextLabel")}
                </label>
                <input 
                  type="text" 
                  value={customPreview}
                  onChange={(e) => setCustomPreview(e.target.value)}
                  className="bg-secondary/50 px-3.5 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary border border-border"
                  placeholder={t("common.previewPlaceholder")}
                />
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    <label>{t("fontDetail.fontSize")}</label>
                    <span>{fontSize}px</span>
                  </div>
                  <Slider 
                    value={fontSize} 
                    onValueChange={setFontSize} 
                    min={12} 
                    max={200} 
                    step={1}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-10 sm:space-y-16 py-4 sm:py-8">
              {font.faces.map((face: FontFaceWithFile) => (
                <div key={face.id} className="space-y-2 sm:space-y-4 group">
                  <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                    <span className="font-medium uppercase tracking-widest">{face.subfamily}</span>
                  </div>
                  <p 
                    style={{ 
                      fontFamily: `'Font-${face.id}', sans-serif`,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.2
                    }}
                    className="break-words outline-none text-foreground select-text"
                    contentEditable
                    suppressContentEditableWarning
                  >
                    {previewText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Desktop Right Sidebar - Inspector */}
      <aside className="hidden lg:flex w-80 h-full flex-col bg-card border-l border-border shrink-0">
        {renderInspectorContent()}
      </aside>

      {/* Mobile Right Drawer - Inspector Sheet */}
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="p-0 w-84 max-w-[90vw] flex flex-col h-full bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("fontDetail.tabInfo")}</SheetTitle>
          </SheetHeader>
          {renderInspectorContent()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
