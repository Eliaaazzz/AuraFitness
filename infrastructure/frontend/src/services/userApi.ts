import { api } from './api';
import { CurrentUserResponse, UserProfilePayload, UserProfileResponse } from '@/types';

const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  const response = await api.get<CurrentUserResponse>('/api/v1/me');
  return response.data;
};

const getProfile = async (): Promise<UserProfileResponse> => {
  const response = await api.get<UserProfileResponse>('/api/v1/me/profile');
  return response.data;
};

const upsertProfile = async (payload: UserProfilePayload): Promise<UserProfileResponse> => {
  const response = await api.put<UserProfileResponse>('/api/v1/me/profile', payload);
  return response.data;
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
