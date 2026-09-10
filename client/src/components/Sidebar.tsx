import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Type, 
  Heart, 
  LayoutGrid, 
  Plus, 
  Settings as SettingsIcon,
  Trash2,
  Tag as TagIcon,
  ChevronDown
} from "lucide-react";
import { useTags, type TagWithCount } from "@/hooks/use-tags";
import { useCollections, useCreateCollection, useDeleteCollection } from "@/hooks/use-collections";
import { useStats } from "@/hooks/use-fonts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const queryTagIds = useMemo(() => {
    const raw = searchParams.get("tags") || searchParams.get("tagIds");
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [searchParams]);
  const { data: collections } = useCollections();
  const { data: tags } = useTags();
  const { data: stats } = useStats();
  const [showAllTags, setShowAllTags] = useState(false);

  // Show tags with fonts or top presets
  const displayTags = useMemo(() => {
    if (!tags) return [];
    const activeTags = tags.filter((t: TagWithCount) => t.count > 0);
    const pool = activeTags.length > 0 ? activeTags : tags;
    return showAllTags ? pool : pool.slice(0, 6);
  }, [tags, showAllTags]);

  const hasMoreTags = (tags?.length || 0) > 6;

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <Link href="/" className="block" onClick={onNavigate}>
          <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
            {t("common.appName")}
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-8">
        {/* Main Links */}
        <div className="space-y-1">
          <NavItem href="/" icon={<Type />} label={t("sidebar.allFonts")} active={location === "/"} count={stats?.totalFonts} onClick={onNavigate} />
          <NavItem href="/favorites" icon={<Heart />} label={t("sidebar.favorites")} active={location === "/favorites"} count={stats?.totalFavorites} onClick={onNavigate} />
        </div>

        {/* Collections */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sidebar.collections")}</h3>
            <CreateCollectionDialog />
          </div>
          <div className="space-y-0.5">
            {collections?.map((col) => (
              <NavItem 
                key={col.id}
                href={`/collections/${col.id}`}
                icon={<LayoutGrid className="w-4 h-4" />}
                label={col.name}
                active={location === `/collections/${col.id}`}
                count={col.count}
                onDelete={col.id}
                deleteType="collection"
                onClick={onNavigate}
              />
            ))}
            {(!collections || collections.length === 0) && (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">{t("sidebar.noCollections")}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sidebar.tags")}</h3>
          </div>
          <div className="space-y-0.5">
            {displayTags.map((tag: TagWithCount) => (
              <NavItem 
                key={tag.id}
                href={`/tags/${tag.id}`}
                icon={<TagIcon className="w-4 h-4" />}
                label={tag.name}
                active={location === `/tags/${tag.id}` || queryTagIds.includes(tag.id)}
                count={tag.count}
                onClick={onNavigate}
              />
            ))}
            {(!tags || tags.length === 0) && (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">{t("sidebar.noTags")}</p>
            )}
            {hasMoreTags && (
              <button
                type="button"
                onClick={() => setShowAllTags(!showAllTags)}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", showAllTags && "rotate-180")} />
                <span>{showAllTags ? t("sidebar.showLessTags") : t("sidebar.showMoreTags")}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <NavItem href="/settings" icon={<SettingsIcon />} label={t("sidebar.settings")} active={location === "/settings"} onClick={onNavigate} />
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("hidden md:flex w-64 h-screen border-r border-border bg-card flex-col shrink-0 overflow-y-auto custom-scrollbar", className)}>
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col">
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  active, 
  count,
  onDelete,
  deleteType,
  onClick
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  count?: number;
  onDelete?: string;
  deleteType?: "collection";
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const { mutate: deleteCollection } = useDeleteCollection();
  const { toast } = useToast();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onDelete) return;

    if (confirm(t("sidebar.deleteConfirm"))) {
      if (deleteType === "collection") {
        deleteCollection(onDelete, {
          onSuccess: () => {
            toast({ title: t("sidebar.collectionDeleted") });
          }
        });
      }
    }
  };

  return (
    <div className="group relative flex items-center">
      <Link href={href} onClick={onClick} className={cn(
        "flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 pr-10",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}>
        <div className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
          {icon}
        </div>
        <span className="truncate flex-1">{label}</span>
        {count !== undefined && (
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded ml-auto transition-colors font-mono tabular-nums",
            active 
              ? "bg-primary/20 text-primary font-semibold" 
              : "bg-muted text-muted-foreground"
          )}>
            {count}
          </span>
        )}
      </Link>
      
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-all z-10 bg-card rounded-md shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CreateCollectionDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutate, isPending } = useCreateCollection();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    mutate({ name, description: "", color: "" }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
        toast({ title: t("sidebar.createCollection") });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" title={t("sidebar.newCollection")}>
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sidebar.newCollection")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input 
            placeholder={t("sidebar.collectionNamePlaceholder")} 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            autoFocus
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.creating") : t("sidebar.createCollection")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}