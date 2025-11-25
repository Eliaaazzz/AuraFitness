import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getSavedRecipes,
  getSavedWorkouts,
  saveRecipe,
  saveWorkout,
  uploadRecipeImage,
  uploadWorkoutImage,
} from './api';
import { RecipeCard, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard, SavedWorkout, SavedRecipe } from '@/types';

const mutationKeys = {
  uploadWorkout: ['upload', 'workout'] as const,
  uploadRecipe: ['upload', 'recipe'] as const,
  saveWorkout: (userId?: string, id?: string) => ['save', 'workout', userId, id] as const,
  saveRecipe: (userId?: string, id?: string) => ['save', 'recipe', userId, id] as const,
};

const queryKeys = {
  savedWorkouts: (userId?: string) => ['workouts', 'saved', userId] as const,
  savedRecipes: (userId?: string) => ['recipes', 'saved', userId] as const,
};

export const useUploadWorkout = () =>
  useMutation<WorkoutCard[], Error, { uri: string; metadata?: UploadWorkoutPayload }>({
    mutationKey: mutationKeys.uploadWorkout,
    mutationFn: (payload) => uploadWorkoutImage(payload.uri, payload.metadata),
  });

export const useUploadRecipe = () =>
  useMutation<RecipeCard[], Error, { uri: string; payload?: UploadRecipePayload }>({
    mutationKey: mutationKeys.uploadRecipe,
    mutationFn: (payload) => uploadRecipeImage(payload.uri, payload.payload),
  });

export const useSaveWorkout = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<SavedWorkout, Error, string>({
    mutationKey: mutationKeys.saveWorkout(userId),
    mutationFn: (workoutId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveWorkout(workoutId, userId);
    },
    onSuccess: (savedWorkout) => {
      if (!userId) return;
      queryClient.setQueryData<SavedWorkout[]>(queryKeys.savedWorkouts(userId), (existing = []) => {
        if (existing.find((item) => item.id === savedWorkout.id)) {
          return existing;
        }
        return [savedWorkout, ...existing];
      });
    },
  });
};

export const useSaveRecipe = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<SavedRecipe, Error, string>({
    mutationKey: mutationKeys.saveRecipe(userId),
    mutationFn: (recipeId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveRecipe(recipeId, userId);
    },
    onSuccess: (savedRecipe) => {
      if (!userId) return;
      queryClient.setQueryData<SavedRecipe[]>(queryKeys.savedRecipes(userId), (existing = []) => {
        if (existing.find((item) => item.id === savedRecipe.id)) {
          return existing;
        }
        return [savedRecipe, ...existing];
      });
    },
  });
};

export const useSavedWorkouts = (userId?: string) =>
  useQuery<SavedWorkout[], Error>({
    queryKey: queryKeys.savedWorkouts(userId),
    enabled: !!userId,
    queryFn: () => getSavedWorkouts(userId),
  });

export const useSavedRecipes = (userId?: string) =>
  useQuery<SavedRecipe[], Error>({
    queryKey: queryKeys.savedRecipes(userId),
    enabled: !!userId,
    queryFn: () => getSavedRecipes(userId),
  });
