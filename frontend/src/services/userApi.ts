import { api } from './apiClient';
import { CurrentUserResponse, UserProfilePayload, UserProfileResponse } from '@/types';

const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  return await api.get<CurrentUserResponse>('/api/v1/me');
};

const getProfile = async (): Promise<UserProfileResponse> => {
  return await api.get<UserProfileResponse>('/api/v1/me/profile');
};

const upsertProfile = async (payload: UserProfilePayload): Promise<UserProfileResponse> => {
  return await api.put<UserProfileResponse>('/api/v1/me/profile', payload);
};

const deleteProfile = async (): Promise<void> => {
  await api.delete('/api/v1/me/profile');
};

export default {
  getCurrentUser,
  getProfile,
  upsertProfile,
  deleteProfile,
};
