import axiosService from "../../services/axiosService";
import { USER_QUERY_KEYS } from "../queries/useUserQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_QUERY_KEYS } from "../queries/useAuthQueries";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { userService } from "../../services/userService";
import { useTranslation } from "react-i18next";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userData) => {
      const response = await axiosService.patch(
        "/users/update-profile",
        userData
      );
      return response.data;
    },
    onSuccess: (data) => {
      showSuccessToast(t("profile.updateSuccess"));

      const currentUser = queryClient.getQueryData(AUTH_QUERY_KEYS.session);
      const userId = data?.data?._id || currentUser?._id;

      if (userId) {
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });

        queryClient.refetchQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
          exact: false,
        });
      }

      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session });
    },
    onError: (error) => {
      console.error("Update profile error:", error);
      const errorMessage =
        error?.response?.data?.message || t("profile.updateError");
      showErrorToast(errorMessage);
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
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me });
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
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me });
    },
  });
};

export const useChangePassword = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data) => {
      const response = await axiosService.post("/auth/change-password", data);
      return response.data;
    },
    onSuccess: () => {
      showSuccessToast(t("password.changeSuccess"));
    },
  });
};

export const useUserFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isFollowing }) => {
      let response;

      console.log("[useUserFollow] Starting mutation", { userId, isFollowing });

      // Dựa vào trạng thái follow hiện tại để gọi API phù hợp
      if (isFollowing !== undefined) {
        if (isFollowing) {
          // Nếu đang follow, gọi API unfollow
          console.log("[useUserFollow] Calling unfollowUser API");
          response = await userService.unfollowUser(userId);
        } else {
          // Nếu chưa follow, gọi API follow
          console.log("[useUserFollow] Calling followUser API");
          response = await userService.followUser(userId);
        }
      } else {
        // Nếu không xác định trạng thái, sử dụng API toggle
        console.log("[useUserFollow] Calling toggleFollow API");
        response = await userService.toggleFollow(userId);
      }
      return response;
    },
    onSuccess: (data, variables) => {
      const { userId } = variables;
      console.log(
        "[useUserFollow] Mutation successful, invalidating queries for user:",
        userId
      );

      if (userId) {
        // Xóa bộ nhớ cache của React Query
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
        });

        // Xóa bộ nhớ cache cho tất cả các query liên quan đến user
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.all,
        });

        // Force refetch dữ liệu profile ngay lập tức
        queryClient.refetchQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
          exact: false,
          type: "active",
          stale: true,
        });

        // Clear userProfileCache trong userService
        try {
          userService.clearUserCache(userId);
        } catch (err) {
          console.error("[useUserFollow] Failed to clear user cache:", err);
        }
      }
    },
    onError: (error, variables) => {
      console.error(
        "[useUserFollow] Error in mutation:",
        error,
        "Variables:",
        variables
      );
    },
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await userService.followUser(userId);
      return response;
    },
    onSuccess: (data, userId) => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
        });
      }
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await userService.unfollowUser(userId);
      return response;
    },
    onSuccess: (data, userId) => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
        });
      }
    },
  });
};

export const useUserMutations = () => {
  return {
    updateProfile: useUpdateProfile(),
    updateProfilePicture: useUpdateProfilePicture(),
    updateCoverPhoto: useUpdateCoverPhoto(),
    changePassword: useChangePassword(),
    userFollow: useUserFollow(),
    followUser: useFollowUser(),
    unfollowUser: useUnfollowUser(),
  };
};

export default useUserMutations;
