import { Link } from "wouter";
import { type FontFace, type FontFile } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Heart, Plus, FileText } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToggleFavorite } from "@/hooks/use-fonts";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useCollections, useAddFontToCollection } from "@/hooks/use-collections";
import { useToast } from "@/hooks/use-toast";

interface FontCardProps {
  family: string;
  faces: (FontFace & { file: FontFile })[];
  previewText?: string;
  isFavorite?: boolean;
  onDeleteFromCollection?: () => void;
}

export function FontCard({ family, faces, previewText, isFavorite, onDeleteFromCollection }: FontCardProps) {
  const { t } = useTranslation();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: collections } = useCollections();
  const { mutate: addToCollection } = useAddFontToCollection();
  const { toast } = useToast();
  
  const displayText = previewText || t("common.previewDefault");

  // Pick a "Regular" face for preview, or the first one available
  const previewFace = useMemo(() => {
    return faces.find(f => f.subfamily === "Regular") || faces[0];
  }, [faces]);

  // Use a unique ID based on the family and subfamily to avoid collision
  const fontStyleId = useMemo(() => `font-${family.replace(/\s+/g, '-').toLowerCase()}-${previewFace.id}`, [family, previewFace.id]);
  const fontUrl = `/fonts-static/${previewFace.file.urlKey}/${previewFace.file.filename}`;

  // Extract unique file names for display
  const fileNames = useMemo(() => {
    const names = faces
      .map(f => f.file?.filename)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [faces]);

  const displayFileName = useMemo(() => {
    if (fileNames.length === 0) return "";
    if (fileNames.length === 1) return fileNames[0];
    return `${fileNames[0]} (+${fileNames.length - 1})`;
  }, [fileNames]);

  const fullFileNamesTooltip = useMemo(() => {
    return fileNames.join("\n");
  }, [fileNames]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @font-face {
        font-family: '${fontStyleId}';
        src: url('${fontUrl}');
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [fontUrl, fontStyleId]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavorite({ targetType: "family", targetId: family });
  };

  const [open, setOpen] = useState(false);
  
  const handleAddToCollection = (collectionId: string, collectionName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCollection({ 
      collectionId, 
      targetType: "family", 
      targetId: family 
    }, {
      onSuccess: () => {
        toast({ title: t("fontCard.addedToCollection", { family, name: collectionName }) });
        setOpen(false);
      }
    });
  };

  return (
    <Link href={`/fonts/${encodeURIComponent(family)}`} className="block group">
      <div className="
        bg-card h-[280px] rounded-2xl p-6 border border-border/50
        shadow-sm group-hover:shadow-xl group-hover:border-primary/50 group-hover:-translate-y-1
        transition-all duration-300 ease-out relative flex flex-col
      ">
        {/* Actions overlay - Top Right */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          {onDeleteFromCollection ? (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteFromCollection(); }}
              className="p-2 rounded-lg bg-background/80 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground backdrop-blur-md border border-border/40 transition-colors shadow-sm"
              title={t("fontCard.removeFromCollection")}
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          ) : (
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="p-2 rounded-lg bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground backdrop-blur-md border border-border/40 transition-colors shadow-sm"
                  title={t("fontCard.addToCollection", { name: "" }).trim()}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {collections?.map(col => (
                  <DropdownMenuItem key={col.id} onClick={(e) => handleAddToCollection(col.id, col.name, e as any)}>
                    {t("fontCard.addToCollection", { name: col.name })}
                  </DropdownMenuItem>
                ))}
                {(!collections || collections.length === 0) && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("fontCard.noCollections")}</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button 
            onClick={handleToggleFavorite}
            className={cn(
              "p-2 rounded-lg backdrop-blur-md transition-colors",
              isFavorite 
                ? "bg-primary/20 text-primary hover:bg-primary/30" 
                : "bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/40 shadow-sm"
            )}
            title={isFavorite ? t("fontCard.favorited") : t("fontCard.favorite")}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </button>
        </div>

        {/* Favorite indicator always visible if favorite */}
        {isFavorite && (
          <div className="absolute top-4 right-4 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
             <Heart className="w-4 h-4 text-primary fill-primary" />
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-lg text-foreground tracking-tight">{family}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("fontCard.stylesCount", { count: faces.length })}
            </p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <p 
            className="text-3xl text-center text-foreground/90 break-words w-full line-clamp-3"
            style={{ fontFamily: `'${fontStyleId}', sans-serif` }}
          >
            {displayText}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {Array.from(new Set(faces.map(f => f.file?.ext ? f.file.ext.toUpperCase() : ""))).filter(Boolean).map(ext => (
               <span key={ext} className="text-[10px] font-mono font-medium bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground/70">
                 {ext}
               </span>
            ))}
          </div>

          {displayFileName && (
            <div 
              className="flex items-center gap-1 min-w-0 max-w-[65%] text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors font-mono"
              title={fullFileNamesTooltip}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{displayFileName}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
