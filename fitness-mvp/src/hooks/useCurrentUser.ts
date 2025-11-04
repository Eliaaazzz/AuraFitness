import { useQuery } from '@tanstack/react-query';

import userApi from '@/services/userApi';
import { CurrentUserResponse } from '@/types';

export const useCurrentUser = () =>
  useQuery<CurrentUserResponse, Error>({
    queryKey: ['current-user'],
    queryFn: userApi.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

export default useCurrentUser;
