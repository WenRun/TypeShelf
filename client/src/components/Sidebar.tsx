import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Type, 
  Heart, 
  LayoutGrid, 
  FolderOpen, 
  Plus, 
  Settings as SettingsIcon,
  Library,
  Trash2,
  ChevronRight,
  ArrowUp,
  Folder,
  Tag as TagIcon,
  Hash,
  ChevronDown
} from "lucide-react";
import { useTags, type TagWithCount } from "@/hooks/use-tags";
import { useCollections, useCreateCollection, useDeleteCollection } from "@/hooks/use-collections";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useStats } from "@/hooks/use-fonts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function Sidebar() {
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
  const { data: categories } = useCategories();
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
    <aside className="w-64 h-screen border-r border-border bg-card flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
            {t("common.appName")}
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-8">
        {/* Main Links */}
        <div className="space-y-1">
          <NavItem href="/" icon={<Type />} label={t("sidebar.allFonts")} active={location === "/"} count={stats?.totalFonts} />
          <NavItem href="/favorites" icon={<Heart />} label={t("sidebar.favorites")} active={location === "/favorites"} count={stats?.totalFavorites} />
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
              />
            ))}
            {(!collections || collections.length === 0) && (
              <p className="text-xs text-muted-foreground px-3 py-2 italic">{t("sidebar.noCollections")}</p>
            )}
          </div>
        </div>

        {/* Categories (Folders) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sidebar.folders")}</h3>
            <CreateCategoryDialog />
          </div>
          <div className="space-y-0.5">
            {categories?.map((cat) => (
              <NavItem 
                key={cat.id}
                href={`/categories/${cat.id}`}
                icon={<FolderOpen className="w-4 h-4" />}
                label={cat.name}
                active={location === `/categories/${cat.id}`}
                count={cat.count}
                onDelete={cat.id}
                deleteType="category"
              />
            ))}
            {(!categories || categories.length === 0) && (
               <p className="text-xs text-muted-foreground px-3 py-2 italic">{t("sidebar.noFolders")}</p>
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
        <NavItem href="/settings" icon={<SettingsIcon />} label={t("sidebar.settings")} active={location === "/settings"} />
      </div>
    </aside>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  active, 
  count,
  onDelete,
  deleteType
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  count?: number;
  onDelete?: string;
  deleteType?: "collection" | "category";
}) {
  const { t } = useTranslation();
  const { mutate: deleteCollection } = useDeleteCollection();
  const { mutate: deleteCategory } = useDeleteCategory();
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
      } else if (deleteType === "category") {
        deleteCategory(onDelete, {
          onSuccess: () => {
            toast({ title: t("sidebar.folderRemoved") });
          }
        });
      }
    }
  };

  return (
    <div className="group relative flex items-center">
      <Link href={href} className={cn(
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
        <button className="text-muted-foreground hover:text-primary transition-colors" title={t("sidebar.newCollection")}>
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

function CreateCategoryDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const { mutate, isPending } = useCreateCategory();
  const { toast } = useToast();

  const handlePathChange = (newPath: string) => {
    setPath(newPath);
    if (!name.trim() && newPath) {
      const cleanPath = newPath.replace(/[\\/]+$/, "");
      const folderBase = cleanPath.split(/[\\/]/).pop();
      if (folderBase) setName(folderBase);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;
    
    mutate({ name, path, status: "ok" }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
        setPath("");
        toast({ title: t("sidebar.addFolder") });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-primary transition-colors" title={t("sidebar.addFolder")}>
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sidebar.addFolder")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input 
              placeholder={t("sidebar.folderNamePlaceholder")} 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
            <DirectoryPicker value={path} onChange={handlePathChange} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !path.trim()}>
              {isPending ? t("common.adding") : t("sidebar.addFolder")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DirectoryPicker({ value, onChange }: { value: string; onChange: (path: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState(value || "");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<{ name: string; path: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDir = useCallback(async (dirPath?: string) => {
    setLoading(true);
    setError("");
    try {
      const url = dirPath ? `/api/browse?path=${encodeURIComponent(dirPath)}` : "/api/browse";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to browse");
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setBrowsePath(data.currentPath || dirPath || "");
      setParentPath(data.parentPath ?? null);
    } catch (e: any) {
      setError(e.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchDir(value.trim() || undefined);
    }
  };

  const handleSelect = (dirPath: string) => {
    onChange(dirPath);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/app/fonts"
            className="pl-9 h-10 font-mono text-xs"
          />
        </div>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0 h-10">
            {t("sidebar.browse")}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Folder className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate font-mono font-medium text-foreground">{browsePath || "/"}</span>
          </div>
        </div>
        {error && (
          <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-b border-border">{error}</div>
        )}
        <ScrollArea className="h-64">
          <div className="p-1 space-y-0.5">
            {parentPath && parentPath !== browsePath && (
              <button
                type="button"
                onClick={() => fetchDir(parentPath)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors text-muted-foreground font-mono"
              >
                <ArrowUp className="w-4 h-4 text-primary" />
                <span>..</span>
              </button>
            )}
            {loading ? (
              <div className="px-2 py-6 text-xs text-muted-foreground text-center">{t("common.loading")}</div>
            ) : entries.length === 0 ? (
              <div className="px-2 py-6 text-xs text-muted-foreground text-center">{t("sidebar.emptyDirectory")}</div>
            ) : (
              entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => fetchDir(entry.path)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors text-left group"
                >
                  <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                  <span className="truncate flex-1 font-mono text-xs">{entry.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t border-border flex justify-between items-center bg-muted/20">
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[170px]">{browsePath}</span>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSelect(browsePath)}
          >
            {t("common.select")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
