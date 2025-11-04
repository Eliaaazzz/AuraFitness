export type EquipmentType = 'bodyweight' | 'dumbbells' | 'bands' | 'kettlebell' | 'machine' | 'other';

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WorkoutCard {
  id: string;
  title: string;
  youtubeId?: string;
  durationMinutes: number;
  level: WorkoutLevel;
  equipment: EquipmentType[];
  bodyPart?: string[];
  thumbnailUrl?: string;
  channelTitle?: string;
  viewCount?: number;
  lastValidatedAt?: string;
}

export interface RecipeCard {
  id: string;
  title: string;
  imageUrl?: string;
  timeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  nutritionSummary?: Record<string, number | string>;
  tags?: string[];
}

export interface UserProfilePayload {
  heightCm?: number | null;
  weightKg?: number | null;
  bodyFatPercentage?: number | null;
  basalMetabolicRate?: number | null;
  fitnessGoal?: string | null;
  dietaryPreference?: string | null;
  allergens?: string[];
  dailyCalorieTarget?: number | null;
  dailyProteinTarget?: number | null;
  dailyCarbsTarget?: number | null;
  dailyFatTarget?: number | null;
}

export interface UserProfileResponse {
  userId: string;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  bodyFatPercentage?: number | null;
  basalMetabolicRate?: number | null;
  fitnessGoal?: string | null;
  dietaryPreference?: string | null;
  allergens?: string[];
  dailyCalorieTarget?: number | null;
  dailyProteinTarget?: number | null;
  dailyCarbsTarget?: number | null;
  dailyFatTarget?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUserResponse {
  userId: string;
  email: string;
  level: string;
  timeBucket: number;
  profile?: UserProfileResponse | null;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface UploadWorkoutPayload {
  equipment?: string[];
  level?: WorkoutLevel;
  durationMinutes?: number;
}

export interface UploadRecipePayload {
  ingredients?: string[];
}

export * from './mealPlan';
