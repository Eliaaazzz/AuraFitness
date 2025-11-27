/**
 * Image Recognition API
 * Handles workout and recipe image uploads and recognition
 */

import { api } from './apiClient';
import type { WorkoutCard, RecipeCard, UploadWorkoutPayload, UploadRecipePayload } from '@/types';

/**
 * Upload an image to get workout recommendations
 */
export async function uploadWorkoutImage(
  imageUri: string,
  metadata?: UploadWorkoutPayload
): Promise<WorkoutCard[]> {
  const response = await api.uploadImage<WorkoutCard[]>(
    '/api/v1/image-recognition/workout',
    imageUri,
    metadata
  );
  return response;
}

/**
 * Upload an image to get recipe recommendations
 */
export async function uploadRecipeImage(
  imageUri: string,
  payload?: UploadRecipePayload
): Promise<RecipeCard[]> {
  const response = await api.uploadImage<RecipeCard[]>(
    '/api/v1/image-recognition/recipe',
    imageUri,
    payload
  );
  return response;
}
