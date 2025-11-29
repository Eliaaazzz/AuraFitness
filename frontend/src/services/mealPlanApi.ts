import { api } from './apiClient';
import { MealPlanHistoryItem, MealPlanResponse } from '@/types/mealPlan';

const getHistory = async (userId: string, limit = 5): Promise<MealPlanHistoryItem[]> => {
  return await api.get<MealPlanHistoryItem[]>(
    `/api/v1/meal-plan/history?userId=${userId}&limit=${limit}`
  );
};

const generate = async (userId: string): Promise<MealPlanResponse> => {
  return await api.post<MealPlanResponse>('/api/v1/meal-plan/generate', {
    userId,
  });
};

const evict = async (userId: string): Promise<void> => {
  await api.post('/api/v1/meal-plan/evict', { userId });
};

export default {
  getHistory,
  generate,
  evict,
};
