import { apiFetch, parseApiError } from './api';

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

export async function searchNutrition(
  token: string,
  query: string
): Promise<NutritionFood[]> {
  const params = new URLSearchParams({ q: query, pageSize: '10' });
  const response = await apiFetch(
    `/nutrition/search?${params.toString()}`,
    { method: 'GET' },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  const body = (await response.json()) as { foods: NutritionFood[] };
  return body.foods ?? [];
}
