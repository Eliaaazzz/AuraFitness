import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getSavedRecipes,
  getSavedWorkouts,
  saveRecipe,
  saveWorkout,
  uploadRecipeImage,
  uploadWorkoutImage,
} from './api';
import { RecipeCard, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard } from '@/types';

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

export const useSaveWorkout = (userId?: string) =>
  useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.saveWorkout(userId),
    mutationFn: (workoutId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveWorkout(workoutId, userId);
    },
  });

export const useSaveRecipe = (userId?: string) =>
  useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.saveRecipe(userId),
    mutationFn: (recipeId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveRecipe(recipeId, userId);
    },
  });

export const useSavedWorkouts = (userId?: string) =>
  useQuery<WorkoutCard[], Error>({
    queryKey: queryKeys.savedWorkouts(userId),
    enabled: !!userId,
    queryFn: () => getSavedWorkouts(userId),
  });

export const useSavedRecipes = (userId?: string) =>
  useQuery<RecipeCard[], Error>({
    queryKey: queryKeys.savedRecipes(userId),
    enabled: !!userId,
    queryFn: () => getSavedRecipes(userId),
  });
