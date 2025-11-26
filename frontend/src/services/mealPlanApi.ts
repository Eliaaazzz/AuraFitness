import { api } from './api';
import { MealPlanHistoryItem, MealPlanResponse } from '@/types/mealPlan';

const getHistory = async (userId: string, limit = 5): Promise<MealPlanHistoryItem[]> => {
  const response = await api.get<MealPlanHistoryItem[]>(
    '/api/v1/meal-plan/history',
    { params: { userId, limit } },
  );
  return response.data;
};

const generate = async (userId: string): Promise<MealPlanResponse> => {
  const response = await api.post<MealPlanResponse>('/api/v1/meal-plan/generate', {
    userId,
  });
  return response.data;
};

const evict = async (userId: string): Promise<void> => {
  await api.post('/api/v1/meal-plan/evict', { userId });
};

export default {
  getHistory,
  generate,
  evict,
};
