import { http } from './http';

export type NutritionFood = {
  external_id: string;
  name: string;
  brand?: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  serving_desc?: string;
  per_100g: boolean;
};

/** Searches the food database (values per 100 g when `per_100g`). */
export async function searchNutrition(query: string): Promise<NutritionFood[]> {
  const res = await http.get<{ foods: NutritionFood[] }>('/nutrition/search', { query: { q: query, pageSize: 10 } });
  return res.foods ?? [];
}
