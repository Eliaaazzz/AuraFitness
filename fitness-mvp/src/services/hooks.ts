import { useMutation, useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';

import {
  getSavedRecipes,
  getSavedWorkouts,
  removeSavedRecipe,
  removeSavedWorkout,
  saveRecipe,
  saveWorkout,
  uploadRecipeImage,
  uploadWorkoutImage,
} from './api';
import {
  RecipeCard,
  UploadRecipePayload,
  UploadWorkoutPayload,
  WorkoutCard,
  SavedWorkout,
  SavedRecipe,
  Paginated,
  SortDirection,
  WorkoutSortOption,
  RecipeSortOption,
  WorkoutSortField,
  RecipeSortField,
} from '@/types';

export const DEFAULT_SAVED_PAGE_SIZE = 20;

const mutationKeys = {
  uploadWorkout: ['upload', 'workout'] as const,
  uploadRecipe: ['upload', 'recipe'] as const,
  saveWorkout: (userId?: string, id?: string) => ['save', 'workout', userId, id] as const,
  saveRecipe: (userId?: string, id?: string) => ['save', 'recipe', userId, id] as const,
};

export const DEFAULT_WORKOUT_SORT: WorkoutSortOption = Object.freeze({
  field: 'savedAt',
  direction: 'desc',
}) as WorkoutSortOption;

export const DEFAULT_RECIPE_SORT: RecipeSortOption = Object.freeze({
  field: 'savedAt',
  direction: 'desc',
}) as RecipeSortOption;

const queryKeys = {
  savedWorkouts: (userId?: string, size = DEFAULT_SAVED_PAGE_SIZE, sort?: WorkoutSortOption) =>
    ['workouts', 'saved', userId, size, sort?.field ?? DEFAULT_WORKOUT_SORT.field, sort?.direction ?? DEFAULT_WORKOUT_SORT.direction] as const,
  savedRecipes: (userId?: string, size = DEFAULT_SAVED_PAGE_SIZE, sort?: RecipeSortOption) =>
    ['recipes', 'saved', userId, size, sort?.field ?? DEFAULT_RECIPE_SORT.field, sort?.direction ?? DEFAULT_RECIPE_SORT.direction] as const,
};

const buildWorkoutSortParam = (option: WorkoutSortOption = DEFAULT_WORKOUT_SORT): string => {
  const fields: string[] = option.field === 'savedAt' ? ['savedAt'] : ['duration', 'savedAt'];
  return [...fields, option.direction].join(',');
};

const buildRecipeSortParam = (option: RecipeSortOption = DEFAULT_RECIPE_SORT): string => {
  const fields: string[] = option.field === 'savedAt' ? ['savedAt'] : ['time', 'savedAt'];
  return [...fields, option.direction].join(',');
};

const ensurePage = <T extends { id: string }>(
  page: Paginated<T> | undefined,
  size = DEFAULT_SAVED_PAGE_SIZE,
): Paginated<T> => {
  if (page) return page;
  return { items: [], page: 0, size, total: 0, hasNext: false };
};
const compareNumbers = (a: number, b: number, direction: SortDirection) =>
  direction === 'asc' ? a - b : b - a;

const normalizeNumericValue = (value: number | null | undefined, direction: SortDirection) => {
  if (value == null) {
    return direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return value;
};

const savedAtTimestamp = (value: string | undefined) => (value ? new Date(value).getTime() : 0);

const compareWorkouts = (a: SavedWorkout, b: SavedWorkout, option: WorkoutSortOption) => {
  if (option.field === 'duration') {
    const diff = compareNumbers(
        normalizeNumericValue(a.durationMinutes, option.direction),
        normalizeNumericValue(b.durationMinutes, option.direction),
        option.direction,
    );
    if (diff !== 0) {
      return diff;
    }
  } else {
    const diff = compareNumbers(
        savedAtTimestamp(a.savedAt),
        savedAtTimestamp(b.savedAt),
        option.direction,
    );
    if (diff !== 0) {
      return diff;
    }
  }

  const fallback = savedAtTimestamp(b.savedAt) - savedAtTimestamp(a.savedAt);
  if (fallback !== 0) {
    return fallback;
  }
  return a.title.localeCompare(b.title);
};

const compareRecipes = (a: SavedRecipe, b: SavedRecipe, option: RecipeSortOption) => {
  if (option.field === 'time') {
    const diff = compareNumbers(
        normalizeNumericValue(a.timeMinutes, option.direction),
        normalizeNumericValue(b.timeMinutes, option.direction),
        option.direction,
    );
    if (diff !== 0) {
      return diff;
    }
  } else {
    const diff = compareNumbers(
        savedAtTimestamp(a.savedAt),
        savedAtTimestamp(b.savedAt),
        option.direction,
    );
    if (diff !== 0) {
      return diff;
    }
  }

  const fallback = savedAtTimestamp(b.savedAt) - savedAtTimestamp(a.savedAt);
  if (fallback !== 0) {
    return fallback;
  }
  return a.title.localeCompare(b.title);
};

const sortWorkouts = (items: SavedWorkout[], option: WorkoutSortOption) =>
  [...items].sort((a, b) => compareWorkouts(a, b, option));

const sortRecipes = (items: SavedRecipe[], option: RecipeSortOption) =>
  [...items].sort((a, b) => compareRecipes(a, b, option));

const mergePaginatedItems = <T extends { id: string; alreadySaved?: boolean }, O>(
  existing: InfiniteData<Paginated<T>> | undefined,
  item: T,
  size: number,
  sortOption: O,
  sorter: (items: T[], option: O) => T[],
): InfiniteData<Paginated<T>> => {
  const base = existing ?? {
    pages: [ensurePage<T>(undefined, size)],
    pageParams: [0],
  };

  const pages = base.pages.length > 0 ? base.pages : [ensurePage<T>(undefined, size)];
  const [first, ...rest] = pages;
  if (first.items.some((entry) => entry.id === item.id) || item.alreadySaved) {
    return base;
  }

  const ensured = ensurePage(first, size);
  const merged = sorter([...ensured.items, item], sortOption);
  const trimmed = merged.slice(0, size);
  const total = ensured.total + 1;

  const updatedFirst: Paginated<T> = {
    ...ensured,
    items: trimmed,
    total,
    hasNext: total > ensured.size,
  };

  return {
    pages: [updatedFirst, ...rest],
    pageParams: base.pageParams.length > 0 ? base.pageParams : [0],
  };
};

const mergeWorkoutItems = (
  existing: InfiniteData<Paginated<SavedWorkout>> | undefined,
  item: SavedWorkout,
  size: number,
  sortOption: WorkoutSortOption,
) => mergePaginatedItems(existing, item, size, sortOption, sortWorkouts);

const mergeRecipeItems = (
  existing: InfiniteData<Paginated<SavedRecipe>> | undefined,
  item: SavedRecipe,
  size: number,
  sortOption: RecipeSortOption,
) => mergePaginatedItems(existing, item, size, sortOption, sortRecipes);

const removeSavedItemFromPages = <T extends { id: string }>(
  existing: InfiniteData<Paginated<T>> | undefined,
  id: string,
  size = DEFAULT_SAVED_PAGE_SIZE,
): InfiniteData<Paginated<T>> | undefined => {
  if (!existing) return existing;

  let removed = false;
  const pages = existing.pages.map((page, index) => {
    const ensured = ensurePage(page, size);
    const filtered = ensured.items.filter((entry) => entry.id !== id);
    if (filtered.length !== ensured.items.length) {
      removed = true;
      const total = Math.max(ensured.total - 1, filtered.length);
      return {
        ...ensured,
        page: ensured.page ?? index,
        items: filtered,
        total,
        hasNext: total > ((ensured.page ?? index) + 1) * ensured.size,
      };
    }
    return ensured;
  });

  if (!removed) {
    return existing;
  }

  return {
    ...existing,
    pages,
  };
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

export const useSaveWorkout = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: WorkoutSortOption = DEFAULT_WORKOUT_SORT,
) => {
  const queryClient = useQueryClient();
  const finalSort = sortOption ?? DEFAULT_WORKOUT_SORT;
  const queryKey = queryKeys.savedWorkouts(userId, pageSize, finalSort);
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
      queryClient.setQueryData<InfiniteData<Paginated<SavedWorkout>> | undefined>(
        queryKey,
        (existing) => mergeWorkoutItems(existing, savedWorkout, pageSize, finalSort),
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useSaveRecipe = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: RecipeSortOption = DEFAULT_RECIPE_SORT,
) => {
  const queryClient = useQueryClient();
  const finalSort = sortOption ?? DEFAULT_RECIPE_SORT;
  const queryKey = queryKeys.savedRecipes(userId, pageSize, finalSort);
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
      queryClient.setQueryData<InfiniteData<Paginated<SavedRecipe>> | undefined>(
        queryKey,
        (existing) => mergeRecipeItems(existing, savedRecipe, pageSize, finalSort),
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useSavedWorkouts = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: WorkoutSortOption = DEFAULT_WORKOUT_SORT,
) =>
  useInfiniteQuery<Paginated<SavedWorkout>, Error>({
    queryKey: queryKeys.savedWorkouts(userId, pageSize, sortOption),
    enabled: !!userId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    queryFn: ({ pageParam = 0 }) => getSavedWorkouts(userId, Number(pageParam), pageSize, buildWorkoutSortParam(sortOption)),
  });

export const useSavedRecipes = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: RecipeSortOption = DEFAULT_RECIPE_SORT,
) =>
  useInfiniteQuery<Paginated<SavedRecipe>, Error>({
    queryKey: queryKeys.savedRecipes(userId, pageSize, sortOption),
    enabled: !!userId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    queryFn: ({ pageParam = 0 }) => getSavedRecipes(userId, Number(pageParam), pageSize, buildRecipeSortParam(sortOption)),
  });

export const useRemoveWorkout = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: WorkoutSortOption = DEFAULT_WORKOUT_SORT,
) => {
  const queryClient = useQueryClient();
  const finalSort = sortOption ?? DEFAULT_WORKOUT_SORT;
  const queryKey = queryKeys.savedWorkouts(userId, pageSize, finalSort);
  return useMutation<boolean, Error, string>({
    mutationKey: ['remove', 'workout', userId],
    mutationFn: (workoutId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return removeSavedWorkout(workoutId, userId);
    },
    onSuccess: (removed, workoutId) => {
      if (!removed || !userId) return;
      queryClient.setQueryData<InfiniteData<Paginated<SavedWorkout>> | undefined>(
        queryKey,
        (existing) => removeSavedItemFromPages(existing, workoutId, pageSize),
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useRemoveRecipe = (
  userId?: string,
  pageSize = DEFAULT_SAVED_PAGE_SIZE,
  sortOption: RecipeSortOption = DEFAULT_RECIPE_SORT,
) => {
  const queryClient = useQueryClient();
  const finalSort = sortOption ?? DEFAULT_RECIPE_SORT;
  const queryKey = queryKeys.savedRecipes(userId, pageSize, finalSort);
  return useMutation<boolean, Error, string>({
    mutationKey: ['remove', 'recipe', userId],
    mutationFn: (recipeId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return removeSavedRecipe(recipeId, userId);
    },
    onSuccess: (removed, recipeId) => {
      if (!removed || !userId) return;
      queryClient.setQueryData<InfiniteData<Paginated<SavedRecipe>> | undefined>(
        queryKey,
        (existing) => removeSavedItemFromPages(existing, recipeId, pageSize),
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const __internals = {
  ensurePage,
  mergeWorkoutItems,
  mergeRecipeItems,
  removeSavedItemFromPages,
  buildWorkoutSortParam,
  buildRecipeSortParam,
};
