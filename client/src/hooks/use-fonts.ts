import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertFavorite, type InsertCollectionItem, type SystemStats } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export interface FontFilters {
  q?: string;
  collectionId?: string;
  tagId?: string;
  tagIds?: string[];
  favorites?: string;
  sort?: string;
  pageSize?: number;
}

export interface FontPageResult {
  items: any[];
  total: number;
}

// GET /api/fonts (Infinite Query for continuous scrolling)
export function useInfiniteFonts(filters?: FontFilters) {
  const pageSize = filters?.pageSize || 50;
  return useInfiniteQuery<FontPageResult>({
    queryKey: ["/api/fonts", "infinite", {
      ...filters,
      tagIds: filters?.tagIds ? [...filters.tagIds].sort() : undefined
    }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (filters?.q) params.append("q", filters.q);
      if (filters?.collectionId) params.append("collectionId", filters.collectionId);
      if (filters?.tagIds && filters.tagIds.length > 0) {
        params.append("tagIds", filters.tagIds.join(","));
      } else if (filters?.tagId) {
        params.append("tagId", filters.tagId);
      }
      if (filters?.favorites) params.append("favorites", filters.favorites);
      if (filters?.sort) params.append("sort", filters.sort);
      params.append("page", String(pageParam));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/fonts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fonts");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + (page.items?.length || 0), 0);
      if (loadedCount < (lastPage.total || 0)) {
        return allPages.length + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// GET /api/fonts (Classic single-page query)
export function useFonts(filters?: FontFilters & { page?: number }) {
  return useQuery<FontPageResult>({
    queryKey: ["/api/fonts", "single", {
      ...filters,
      tagIds: filters?.tagIds ? [...filters.tagIds].sort() : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.append("q", filters.q);
      if (filters?.collectionId) params.append("collectionId", filters.collectionId);
      if (filters?.tagIds && filters.tagIds.length > 0) {
        params.append("tagIds", filters.tagIds.join(","));
      } else if (filters?.tagId) {
        params.append("tagId", filters.tagId);
      }
      if (filters?.favorites) params.append("favorites", filters.favorites);
      if (filters?.sort) params.append("sort", filters.sort);
      if (filters?.page) params.append("page", String(filters.page));
      if (filters?.pageSize) params.append("pageSize", String(filters.pageSize));
      
      const res = await fetch(`/api/fonts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fonts");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// GET /api/fonts/:family
export function useFont(family: string) {
  return useQuery({
    queryKey: ["/api/fonts", "detail", family],
    queryFn: async () => {
      const res = await fetch(`/api/fonts/${encodeURIComponent(family)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch font details");
      return res.json();
    },
    enabled: !!family,
  });
}

// POST /api/rescan
export function useRescanFonts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rescan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fonts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

// POST /api/favorites/toggle
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertFavorite) => {
      const res = await apiRequest("POST", "/api/favorites/toggle", data);
      return res.json() as Promise<{ favorite?: any; isFavorite: boolean }>;
    },
    onSuccess: (data, variables) => {
      if (variables.targetType === "family") {
        queryClient.setQueryData(
          ["/api/fonts", "detail", variables.targetId],
          (old: any) => (old ? { ...old, isFavorite: data.isFavorite } : old)
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/fonts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}


// GET /api/stats
export function useStats() {
  return useQuery<SystemStats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
