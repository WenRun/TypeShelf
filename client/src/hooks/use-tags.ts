import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Tag, type FontTagWithDetails } from "@shared/schema";

export type TagWithCount = Tag & { count: number };

// GET /api/tags
export function useTags() {
  return useQuery<TagWithCount[]>({
    queryKey: ["/api/tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// GET /api/fonts/:family/tags
export function useFontTags(family: string) {
  return useQuery<FontTagWithDetails[]>({
    queryKey: ["/api/fonts", "tags", family],
    queryFn: async () => {
      const res = await fetch(`/api/fonts/${encodeURIComponent(family)}/tags`);
      if (!res.ok) throw new Error("Failed to fetch font tags");
      return res.json();
    },
    enabled: !!family,
    staleTime: 1000 * 60 * 2,
  });
}

// POST /api/fonts/:family/tags
export function useAddFontTag(family: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; source?: string }) => {
      const res = await apiRequest("POST", `/api/fonts/${encodeURIComponent(family)}/tags`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "tags", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "detail", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });
}

// DELETE /api/fonts/:family/tags/:tagId
export function useRemoveFontTag(family: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      await apiRequest("DELETE", `/api/fonts/${encodeURIComponent(family)}/tags/${tagId}`);
      return tagId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "tags", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "detail", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });
}

// POST /api/fonts/:family/tags/auto
export function useAutoTagFont(family: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fonts/${encodeURIComponent(family)}/tags/auto`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "tags", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "detail", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });
}

// POST /api/fonts/:family/ai-tag
export function useAiTagFont(family: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fonts/${encodeURIComponent(family)}/ai-tag`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "tags", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/fonts", "detail", family] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });
}
