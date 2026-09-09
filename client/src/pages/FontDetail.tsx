import { useFont, useToggleFavorite } from "@/hooks/use-fonts";
import { Sidebar } from "@/components/Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Heart, Download, Info, Code, Plus, Globe, Copy, Tag as TagIcon, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFontTags, useAddFontTag, useRemoveFontTag, useAutoTagFont, useAiTagFont } from "@/hooks/use-tags";
import { getTagBadgeStyle } from "@/lib/tag-styles";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [, params] = useRoute("/fonts/:family");
  const familyName = decodeURIComponent(params?.family || "");
  const { data: font, isLoading } = useFont(familyName);
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { mutate: addToCollection } = useAddFontToCollection();
  const { data: collections } = useCollections();
  const { toast } = useToast();

  const { data: fontTags = [], isLoading: isLoadingTags } = useFontTags(familyName);
  const { mutate: addFontTag, isPending: isAddingTag } = useAddFontTag(familyName);
  const { mutate: removeFontTag } = useRemoveFontTag(familyName);
  const { mutate: autoTag, isPending: isAutoTagging } = useAutoTagFont(familyName);
  const { mutate: aiTag, isPending: isAiTagging } = useAiTagFont(familyName);

  const handleAiTag = () => {
    aiTag(undefined, {
      onSuccess: (res: any) => {
        toast({ title: res.message || t("fontDetail.aiTagSuccess") });
      },
      onError: (err: any) => {
        toast({ title: err.message || "AI failed", variant: "destructive" });
      }
    });
  };
  const [newTagName, setNewTagName] = useState("");

  const PRESET_SUGGESTIONS = [
    "黑体", "宋体", "楷体", "圆体", "书法手写", "卡通可爱", "艺术海报", "等宽字体", "可变字体"
  ];

  const unassignedPresets = useMemo(() => {
    const currentNames = new Set(fontTags.map((t: FontTagWithDetails) => t.name.toLowerCase()));
    return PRESET_SUGGESTIONS.filter(p => !currentNames.has(p.toLowerCase()));
  }, [fontTags]);

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
      toast({ title: "复制失败", variant: "destructive" });
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

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative border-r border-border">
        {/* Detail Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title={t("fontDetail.backToList")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold font-display">{font.family}</h1>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
              {t("fontDetail.stylesCount", { count: font.faces.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToggleFavorite}>
              <Heart className={cn("w-4 h-4 mr-2", font.isFavorite && "fill-current")} />
              {font.isFavorite ? t("fontDetail.favorited") : t("fontDetail.favorite")}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("fontDetail.addToCollectionBtn")}
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
              <Button size="sm" asChild>
                <a href={`/fonts-static/${font.faces[0].file.urlKey}/${font.faces[0].file.filename}`} download>
                  <Download className="w-4 h-4 mr-2" />
                  {t("fontDetail.download")}
                </a>
              </Button>
            )}

            <ThemeSwitcher variant="icon" />
            <LanguageSwitcher variant="icon" />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          <div className="max-w-4xl mx-auto p-8 space-y-12">
            {/* Interactive Preview Controls */}
            <div className="grid grid-cols-2 gap-8 items-end border-b border-border/50 pb-8">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {t("fontDetail.previewTextLabel")}
                </label>
                <input 
                  type="text" 
                  value={customPreview}
                  onChange={(e) => setCustomPreview(e.target.value)}
                  className="bg-secondary/50 px-4 py-2 rounded-lg text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary border border-border"
                  placeholder={t("common.previewPlaceholder")}
                />
              </div>
              <div className="flex items-center gap-6">
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

            <div className="space-y-16 py-8">
              {font.faces.map((face: FontFaceWithFile) => (
                <div key={face.id} className="space-y-4 group">
                  <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                    <span className="font-medium uppercase tracking-widest">{face.subfamily}</span>
                  </div>
                  <p 
                    style={{ 
                      fontFamily: `'Font-${face.id}', sans-serif`,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.2
                    }}
                    className="break-words outline-none text-foreground"
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

      {/* Right Sidebar - Inspector */}
      <aside className="w-80 h-full flex flex-col bg-card border-l border-border shrink-0">
        <Tabs defaultValue="info" className="flex flex-col h-full">
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur">
            <TabsList className="grid grid-cols-3 w-full bg-secondary/30">
              <TabsTrigger value="info" className="text-xs">
                <Info className="w-3.5 h-3.5 mr-1.5" />
                {t("fontDetail.tabInfo")}
              </TabsTrigger>
              <TabsTrigger value="download" className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {t("fontDetail.tabFiles")}
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs">
                <Code className="w-3.5 h-3.5 mr-1.5" />
                {t("fontDetail.tabCode")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <TabsContent value="info" className="mt-0 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">{t("fontDetail.about")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("fontDetail.aboutDesc", { family: font.family })}
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t("fontDetail.metadata")}
                </h3>
                <div className="grid grid-cols-1 gap-4">
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
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5" />
                    {t("fontDetail.tags")}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAutoTag}
                      disabled={isAutoTagging || isAiTagging}
                      className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                      title={t("fontDetail.reanalyzeTags")}
                    >
                      <Sparkles className={cn("w-3 h-3 text-primary", isAutoTagging && "animate-spin")} />
                      <span>{t("fontDetail.reanalyzeTags")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAiTag}
                      disabled={isAutoTagging || isAiTagging}
                      className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                      title={t("fontDetail.aiTag")}
                    >
                      <Sparkles className={cn("w-3 h-3 text-amber-500", isAiTagging && "animate-spin")} />
                      <span>{t("fontDetail.aiTag")}</span>
                    </Button>
                  </div>
                </div>

                {/* Tag Badges */}
                <div className="flex flex-wrap gap-2">
                  {fontTags.map((tag: FontTagWithDetails) => (
                    <div
                      key={tag.id}
                      className={cn(
                        "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all shadow-xs",
                        getTagBadgeStyle(tag.color)
                      )}
                    >
                      <span>{tag.name}</span>
                      {tag.source === "rule" && (
                        <span className="text-[10px] opacity-60 font-mono tracking-tighter">
                          ({t("fontDetail.ruleSource")})
                        </span>
                      )}
                      {tag.source === "ai" && (
                        <span className="text-[10px] opacity-80 text-amber-500 font-mono tracking-tighter">
                          ({t("fontDetail.aiSource")})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => tag.tagId && handleRemoveTag(tag.tagId)}
                        className="opacity-40 group-hover:opacity-100 hover:text-destructive hover:scale-110 transition-all ml-0.5 p-0.5 rounded cursor-pointer"
                        title={t("fontDetail.deleteTag")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {fontTags.length === 0 && !isLoadingTags && (
                    <p className="text-xs text-muted-foreground italic py-1">
                      {t("fontDetail.noTags")}
                    </p>
                  )}
                </div>

                {/* Suggested Preset Tags */}
                {unassignedPresets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {t("fontDetail.suggestedTags")}:
                    </span>
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
                  <pre className="p-4 rounded-lg bg-secondary/50 text-[11px] font-mono text-foreground overflow-x-auto border border-border">
                    {`@font-face {
  font-family: '${font.family}';
  src: url('/fonts-static/${font.faces[0]?.file.urlKey}/${font.faces[0]?.file.filename}');
  font-weight: normal;
  font-style: normal;
}`}
                  </pre>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground">
                    <Code className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  {t("fontDetail.cssUsage")}
                </h4>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-secondary/50 text-[11px] font-mono text-foreground border border-border">
                    {`body {
  font-family: '${font.family}', sans-serif;
}`}
                  </pre>
                </div>
              </section>
            </TabsContent>
          </div>
          
          <div className="p-6 border-t border-border mt-auto flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("fontDetail.licenseTitle")}
              </span>
            </div>
            {font.faces[0] && (
              <Button className="w-full h-11" size="lg" asChild>
                <a href={`/fonts-static/${font.faces[0].file.urlKey}/${font.faces[0].file.filename}`} download>
                  <Download className="w-4 h-4 mr-2" />
                  {t("fontDetail.downloadFamily")}
                </a>
              </Button>
            )}
          </div>
        </Tabs>
      </aside>
    </div>
  );
}
