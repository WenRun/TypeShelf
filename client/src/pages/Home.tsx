import { Sidebar } from "@/components/Sidebar";
import { FontCard } from "@/components/FontCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useInfiniteFonts, useRescanFonts } from "@/hooks/use-fonts";
import { useRemoveFontFromCollection } from "@/hooks/use-collections";
import { Search, RefreshCw, Loader2, Tag as TagIcon, X } from "lucide-react";
import { useTags } from "@/hooks/use-tags";
import { getTagBadgeStyle } from "@/lib/tag-styles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [customPreview, setCustomPreview] = useState("");
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const previewText = customPreview.trim() ? customPreview : t("common.previewDefault");
  
  const isFavorites = location === "/favorites";
  const collectionMatch = location.match(/\/collections\/([^\/]+)/);
  const tagMatch = location.match(/\/tags\/([^\/]+)/);
  const collectionId = collectionMatch ? collectionMatch[1] : undefined;
  
  // Parse query tags (?tags=id1,id2) and route tag (/tags/:id)
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const queryTagIds = useMemo(() => {
    const raw = searchParams.get("tags") || searchParams.get("tagIds");
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [searchParams]);

  const routeTagId = tagMatch ? decodeURIComponent(tagMatch[1]) : undefined;

  const selectedTagIds = useMemo(() => {
    const set = new Set<string>(queryTagIds);
    if (routeTagId) set.add(routeTagId);
    return Array.from(set);
  }, [queryTagIds, routeTagId]);

  const { data: tags } = useTags();

  const selectedTags = useMemo(() => {
    if (!tags || selectedTagIds.length === 0) return [];
    return selectedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as typeof tags;
  }, [tags, selectedTagIds]);

  const applySelectedTags = (nextTagIds: string[]) => {
    let basePath = "/";
    if (isFavorites) {
      basePath = "/favorites";
    } else if (collectionMatch) {
      basePath = `/collections/${collectionMatch[1]}`;
    }

    if (nextTagIds.length === 0) {
      setLocation(basePath);
    } else {
      setLocation(`${basePath}?tags=${encodeURIComponent(nextTagIds.join(","))}`);
    }
  };

  const handleTagToggle = (clickedTagId: string) => {
    let next: string[];
    if (selectedTagIds.includes(clickedTagId)) {
      next = selectedTagIds.filter(id => id !== clickedTagId);
    } else {
      next = [...selectedTagIds, clickedTagId];
    }
    applySelectedTags(next);
  };

  const handleClearTags = () => {
    applySelectedTags([]);
  };
  
  const filters = {
    q: search,
    favorites: isFavorites ? "true" : undefined,
    collectionId,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
  };

  const { 
    data, 
    isLoading, 
    isFetchingNextPage, 
    hasNextPage, 
    fetchNextPage 
  } = useInfiniteFonts(filters);

  const { mutate: rescan, isPending: isRescanPending } = useRescanFonts();
  const { mutate: removeFromCollection } = useRemoveFontFromCollection();

  const handleRemoveFromCollection = (family: string) => {
    if (!collectionId) return;
    removeFromCollection({ 
      collectionId, 
      targetType: "family", 
      targetId: family 
    }, {
      onSuccess: () => {
        toast({ title: t("home.removedFromCollection", { family }) });
      }
    });
  };

  // Flatten all loaded font pages
  const allFonts = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.total ?? 0;

  // Infinite Scroll Trigger with IntersectionObserver
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trigger = loadMoreRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      rootMargin: "300px",
      threshold: 0.1,
    });

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl px-8 flex items-center justify-between shrink-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-10 bg-secondary/50 border-transparent focus:bg-background transition-all" 
              placeholder={t("common.searchPlaceholder")} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Input 
                 value={customPreview}
                 onChange={(e) => setCustomPreview(e.target.value)}
                 className="w-64 h-9 bg-transparent border-border hover:border-primary/50 focus:border-primary transition-colors text-sm"
                 placeholder={t("common.previewPlaceholder")}
               />
            </div>

            <Button 
              variant="outline" 
              size="icon"
              onClick={() => rescan()}
              disabled={isRescanPending}
              className="relative"
              title={t("home.rescan")}
            >
              <RefreshCw className={`w-4 h-4 ${isRescanPending ? "animate-spin" : ""}`} />
            </Button>

            <ThemeSwitcher variant="icon" />
            <LanguageSwitcher variant="icon" />
          </div>
        </header>

        {/* Fixed Top Section: Two-row Tag Slider + Title & Count */}
        <div className="shrink-0 px-8 pt-3.5 pb-3 border-b border-border/60 bg-background/95 backdrop-blur-sm z-10 space-y-3">
          {/* Quick Tag Filter Bar: Two rows display, horizontally scrollable when overflowing */}
          {tags && tags.length > 0 && (
            <div 
              className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1.5 custom-scrollbar"
              onWheel={(e) => {
                if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              <button
                type="button"
                onClick={handleClearTags}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer border h-7 justify-center",
                  selectedTagIds.length === 0
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <span>{t("home.allTags")}</span>
              </button>
              {tags.filter(t => t.count > 0).map((tItem) => {
                const isActive = selectedTagIds.includes(tItem.id);
                return (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => handleTagToggle(tItem.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer border h-7 justify-center select-none",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/30"
                        : cn("bg-secondary/40 hover:bg-secondary/80 text-foreground border-border/40", getTagBadgeStyle(tItem.color))
                    )}
                  >
                    <span>{tItem.name}</span>
                    <span className={cn(
                      "text-[10px] px-1 py-0.2 rounded-full",
                      isActive ? "bg-primary-foreground/20 text-primary-foreground font-semibold" : "bg-muted-foreground/15 text-muted-foreground"
                    )}>
                      {tItem.count}
                    </span>
                    {isActive && <X className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fixed Title & Count */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-medium text-foreground">
                {isFavorites ? t("home.favoritesTitle") : 
                 collectionMatch ? t("home.collectionTitle") : 
                 selectedTags.length > 0 ? (
                   selectedTags.length <= 3 
                     ? selectedTags.map(t => t.name).join(" + ")
                     : `${t("home.tagFontsTitle")} (${selectedTags.length})`
                 ) :
                 t("home.allFontsTitle")}
                <span className="ml-3 text-sm text-muted-foreground font-normal">
                  {t("home.familiesFound", { count: totalCount })}
                  {allFonts.length > 0 && totalCount > allFonts.length && (
                    <span className="ml-1 text-xs opacity-75">
                      ({t("home.loadedCount", { loaded: allFonts.length, total: totalCount })})
                    </span>
                  )}
                </span>
              </h2>

              {/* Multi-tag intersection hint badge & clear button */}
              {selectedTags.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary border border-primary/20 font-medium">
                    {t("home.multiTagsSelected", { count: selectedTags.length })}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearTags}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    {t("home.clearAllTags")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area: Only cards and infinite loader scroll */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[280px] rounded-2xl bg-card animate-pulse border border-border/50" />
              ))}
            </div>
          ) : allFonts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t("home.noFontsFound")}</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                {t("home.noFontsTip")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {allFonts.map((item: any) => (
                  <FontCard 
                    key={item.family}
                    family={item.family}
                    faces={item.faces}
                    previewText={previewText}
                    isFavorite={item.isFavorite || isFavorites} 
                    onDeleteFromCollection={collectionId ? () => handleRemoveFromCollection(item.family) : undefined}
                    tags={item.tags}
                  />
                ))}
              </div>

              {/* Infinite Scroll Load More Sentinel & Indicator */}
              {hasNextPage ? (
                <div ref={loadMoreRef} className="py-10 flex flex-col items-center justify-center gap-3">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span>{t("home.loadingMore")}</span>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fetchNextPage()}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t("home.loadMore")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground/60 border-t border-border/20 mt-8">
                  {t("home.allLoaded", { count: totalCount })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
