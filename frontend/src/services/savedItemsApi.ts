/**
 * Saved Items API
 * Handles saving and retrieving saved workouts and recipes
 */

import { api } from './apiClient';
import type { SavedWorkout, SavedRecipe } from '@/types';

/**
 * Save a workout to user's library
 */
export async function saveWorkout(workoutId: string, userId: string): Promise<SavedWorkout> {
  const response = await api.post<SavedWorkout>(`/api/v1/workouts/${workoutId}/save`, {
    userId,
  });
  return response;
}

/**
 * Save a recipe to user's library
 */
export async function saveRecipe(recipeId: string, userId: string): Promise<SavedRecipe> {
  const response = await api.post<SavedRecipe>(`/api/v1/recipes/${recipeId}/save`, {
    userId,
  });
  return response;
}

/**
 * Get all saved workouts for a user
 */
export async function getSavedWorkouts(userId?: string): Promise<SavedWorkout[]> {
  if (!userId) {
    return [];
  }
  const response = await api.get<SavedWorkout[]>(`/api/v1/workouts/saved?userId=${userId}`);
  return response;
}

/**
 * Get all saved recipes for a user
 */
export async function getSavedRecipes(userId?: string): Promise<SavedRecipe[]> {
  if (!userId) {
    return [];
  }
  const response = await api.get<SavedRecipe[]>(`/api/v1/recipes/saved?userId=${userId}`);
  return response;
}
