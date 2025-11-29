import { api } from './apiClient';
import { MealLogResponse, NutritionSummaryResponse, NutritionInsightResponse } from '@/types/mealPlan';

export interface LogMealPayload {
  mealPlanId?: number | null;
  mealDay?: number | null;
  mealType: string;
  recipeId?: string | null;
  recipeName?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  consumedAt?: string;
  notes?: string | null;
}

const logMeal = async (userId: string, payload: LogMealPayload): Promise<MealLogResponse> => {
  return await api.post<MealLogResponse>('/api/v1/nutrition/meals', {
    userId,
    consumedAt: new Date().toISOString(),
    ...payload,
  });
};

const getDailySummary = async (userId: string, date?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (date) queryParams.append('date', date);
  return await api.get<NutritionSummaryResponse>(`/api/v1/nutrition/summary/daily?${queryParams}`);
};

const getWeeklySummary = async (userId: string, weekStart?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (weekStart) queryParams.append('weekStart', weekStart);
  return await api.get<NutritionSummaryResponse>(`/api/v1/nutrition/summary/weekly?${queryParams}`);
};

const getWeeklyInsight = async (userId: string, weekStart?: string): Promise<NutritionInsightResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (weekStart) queryParams.append('weekStart', weekStart);
  return await api.get<NutritionInsightResponse>(`/api/v1/nutrition/insights/weekly?${queryParams}`);
};

export default {
  logMeal,
  getDailySummary,
  getWeeklySummary,
  getWeeklyInsight,
};
