import { useQuery } from '@tanstack/react-query';
import { getMealLogLeaderboard } from './api';
import type { LeaderboardPayload } from '@/types';

const leaderboardKeys = {
  mealLogs: (scope: 'weekly' | 'daily', limit: number) => ['leaderboard', 'mealLogs', scope, limit] as const,
};

export const useLeaderboard = (scope: 'weekly' | 'daily', limit: number) =>
  useQuery<LeaderboardPayload, Error>({
    queryKey: leaderboardKeys.mealLogs(scope, limit),
    queryFn: () => getMealLogLeaderboard(scope, limit),
    staleTime: 1000 * 60 * 5,
  });
