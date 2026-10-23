import type { DietEntry, DietEntryInput, DietEntryUpdate, MealInput } from '../types/diet';
import type { Food } from '../types/food';
import { ApiError, http } from './http';

/** The diet entry for one day, or null when nothing is logged yet. */
export async function getDietForDay(traineeId: string, date: string): Promise<DietEntry | null> {
  const entries = await http.get<DietEntry[]>(`/diet_entries/${encodeURIComponent(traineeId)}`, {
    query: { date, limit: 1 },
  });
  return entries[0] ?? null;
}

export function getDietEntry(id: string): Promise<DietEntry> {
  return http.get<DietEntry>(`/diet_entries/entry/${encodeURIComponent(id)}`);
}

/** Creates the day's entry and returns its id. A second entry for the same day is a 409. */
export async function createDietEntry(input: DietEntryInput): Promise<string> {
  const res = await http.post<{ id: string }>('/diet_entries', input);
  return res.id;
}

export function updateDietEntry(id: string, update: DietEntryUpdate): Promise<void> {
  return http.put<void>(`/diet_entries/${encodeURIComponent(id)}`, update);
}

export function deleteDietEntry(id: string): Promise<void> {
  return http.delete<void>(`/diet_entries/${encodeURIComponent(id)}`);
}

function mealInputs(entry: DietEntry | null): MealInput[] {
  return (entry?.meals ?? []).map((m) => ({ name: m.name, foods: m.foods }));
}

/** Applies a change to the day's meals, reading the latest entry first so nothing is overwritten. */
async function changeDay(traineeId: string, date: string, change: (meals: MealInput[]) => MealInput[]): Promise<void> {
  const current = await getDietForDay(traineeId, date);
  const meals = change(mealInputs(current)).filter((m) => m.foods.length > 0);
  if (current) {
    await updateDietEntry(current.id, { meals });
    return;
  }
  try {
    await createDietEntry({ trainee_id: traineeId, date, meals });
  } catch (e: unknown) {
    // Another device created the day's entry at the same time: apply the change to it instead.
    if (e instanceof ApiError && e.code === 'entry_exists') {
      const created = await getDietForDay(traineeId, date);
      if (created) {
        await updateDietEntry(created.id, { meals: change(mealInputs(created)).filter((m) => m.foods.length > 0) });
        return;
      }
    }
    throw e;
  }
}

/** Adds a food to a meal of a day. */
export function addFoodToDay(traineeId: string, date: string, mealName: string, food: Food): Promise<void> {
  return changeDay(traineeId, date, (meals) => {
    const existing = meals.find((m) => m.name === mealName);
    if (existing) {
      return meals.map((m) => (m.name === mealName ? { ...m, foods: [...m.foods, food] } : m));
    }
    return [...meals, { name: mealName, foods: [food] }];
  });
}

/** Removes one food (by position) from a meal of a day. */
export function removeFoodFromDay(traineeId: string, date: string, mealName: string, index: number): Promise<void> {
  return changeDay(traineeId, date, (meals) =>
    meals.map((m) => (m.name === mealName ? { ...m, foods: m.foods.filter((_, i) => i !== index) } : m))
  );
}
