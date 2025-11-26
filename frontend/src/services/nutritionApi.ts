import { api } from './api';
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
  const response = await api.post<MealLogResponse>('/api/v1/nutrition/meals', {
    userId,
    consumedAt: new Date().toISOString(),
    ...payload,
  });
  return response.data;
};

const getDailySummary = async (userId: string, date?: string): Promise<NutritionSummaryResponse> => {
  const params: Record<string, string> = { userId };
  if (date) params.date = date;
  const response = await api.get<NutritionSummaryResponse>('/api/v1/nutrition/summary/daily', { params });
  return response.data;
};

const getWeeklySummary = async (userId: string, weekStart?: string): Promise<NutritionSummaryResponse> => {
  const params: Record<string, string> = { userId };
  if (weekStart) params.weekStart = weekStart;
  const response = await api.get<NutritionSummaryResponse>('/api/v1/nutrition/summary/weekly', { params });
  return response.data;
};

const getWeeklyInsight = async (userId: string, weekStart?: string): Promise<NutritionInsightResponse> => {
  const params: Record<string, string> = { userId };
  if (weekStart) params.weekStart = weekStart;
  const response = await api.get<NutritionInsightResponse>('/api/v1/nutrition/insights/weekly', {
    params,
  });
  return response.data;
};

export default {
  logMeal,
  getDailySummary,
  getWeeklySummary,
  getWeeklyInsight,
};
