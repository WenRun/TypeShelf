import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Category, type InsertCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export type CategoryWithCount = Category & { count: number };

// GET /api/categories
export function useCategories() {
  return useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
  });
}

// POST /api/categories
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: InsertCategory) => {
      const res = await apiRequest("POST", "/api/categories", category);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

// DELETE /api/categories/:id
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}
