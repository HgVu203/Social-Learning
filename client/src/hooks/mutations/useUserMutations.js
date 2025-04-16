import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { USER_QUERY_KEYS } from "../queries/useUserQueries";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData) => {
      const response = await axiosService.patch("/users/profile", userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me() });
    },
  });
};

export const useUpdateProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const response = await axiosService.patch(
        "/users/profile-picture",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me() });
    },
  });
};

export const useUpdateCoverPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const response = await axiosService.patch(
        "/users/cover-photo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me() });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (passwordData) => {
      const response = await axiosService.post(
        "/auth/change-password",
        passwordData
      );
      return response.data;
    },
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await axiosService.post(`/users/${userId}/follow`);
      return { userId, ...response.data };
    },
    onSuccess: (data) => {
      const { userId } = data;
      // Invalidate the specific user's data
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.detail(userId),
      });
      // Invalidate current user's data
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me() });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await axiosService.post(`/users/${userId}/unfollow`);
      return { userId, ...response.data };
    },
    onSuccess: (data) => {
      const { userId } = data;
      // Invalidate the specific user's data
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.detail(userId),
      });
      // Invalidate current user's data
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me() });
    },
  });
};

// Combined hook that exports all mutations
export const useUserMutations = () => {
  return {
    updateProfile: useUpdateProfile(),
    updateProfilePicture: useUpdateProfilePicture(),
    updateCoverPhoto: useUpdateCoverPhoto(),
    changePassword: useChangePassword(),
    followUser: useFollowUser(),
    unfollowUser: useUnfollowUser(),
  };
};

export default useUserMutations;
