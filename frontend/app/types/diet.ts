import type { Food } from './food';

export type Meal = {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  foods: Food[];
};

/** One client's diet for one local calendar day (one entry per day). */
export type DietEntry = {
  id: string;
  trainee_id: string;
  date: string;
  meals: Meal[];
  total_calories: number;
  total_proteins: number;
  total_carbs?: number;
  total_fats?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

/** Meals sent to the server; per-meal and daily totals are computed by the server. */
export type MealInput = {
  name: string;
  foods: Food[];
};

export type DietEntryInput = {
  trainee_id: string;
  date: string;
  meals: MealInput[];
  notes?: string;
};

export type DietEntryUpdate = {
  meals?: MealInput[];
  notes?: string;
};
