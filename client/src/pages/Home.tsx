import { Sidebar } from "@/components/Sidebar";
import { FontCard } from "@/components/FontCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useFonts, useRescanFonts } from "@/hooks/use-fonts";
import { useRemoveFontFromCollection } from "@/hooks/use-collections";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [customPreview, setCustomPreview] = useState("");
  const [location] = useLocation();
  const { toast } = useToast();
  
  const previewText = customPreview.trim() ? customPreview : t("common.previewDefault");
  
  const isFavorites = location === "/favorites";
  const categoryMatch = location.match(/\/categories\/([^\/]+)/);
  const collectionMatch = location.match(/\/collections\/([^\/]+)/);
  const collectionId = collectionMatch ? collectionMatch[1] : undefined;
  
  const filters = {
    q: search,
    favorites: isFavorites ? "true" : undefined,
    categoryId: categoryMatch ? categoryMatch[1] : undefined,
    collectionId,
  };

  const { data, isLoading } = useFonts(filters);
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[280px] rounded-2xl bg-card animate-pulse border border-border/50" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl font-medium text-foreground">
                  {isFavorites ? t("home.favoritesTitle") : 
                   categoryMatch ? t("home.folderFontsTitle") : 
                   collectionMatch ? t("home.collectionTitle") : t("home.allFontsTitle")}
                  <span className="ml-3 text-sm text-muted-foreground font-normal">
                    {t("home.familiesFound", { count: data?.total || 0 })}
                  </span>
                </h2>
              </div>
              
              {(!data?.items || data.items.length === 0) ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                  {data?.items.map((item: any) => (
                    <FontCard 
                      key={item.family}
                      family={item.family}
                      faces={item.faces}
                      previewText={previewText}
                      isFavorite={item.isFavorite || isFavorites} 
                      onDeleteFromCollection={collectionId ? () => handleRemoveFromCollection(item.family) : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
