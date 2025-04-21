import axiosService from "../../services/axiosService";
import { USER_QUERY_KEYS } from "../queries/useUserQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_QUERY_KEYS } from "../queries/useAuthQueries";
import { showSuccessToast } from "../../utils/toast";
import { userService } from "../../services/userService";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData) => {
      console.log("Updating profile with data:", userData);
      const response = await axiosService.patch(
        "/users/update-profile",
        userData
      );
      console.log("Profile update API response:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Profile update successful, invalidating queries");
      // Show success toast
      showSuccessToast("Profile updated successfully");

      // Invalidate all user profile queries
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me });

      // Also invalidate current user profile
      const userId = data?.data?._id;
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.userProfile(userId),
        });
      }

      // Invalidate auth session as user data might have changed
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session });

      // Force refetch the data
      queryClient.refetchQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEYS.session });
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
  return useMutation({
    mutationFn: async (data) => {
      const response = await axiosService.post("/auth/change-password", data);
      return response.data;
    },
    onSuccess: () => {
      showSuccessToast("Password changed successfully");
    },
  });
};

// Hàm duy nhất để xử lý cả follow/unfollow
export const useUserFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await userService.toggleFollow(userId);
      return response;
    },

    onMutate: async (userId) => {
      // Hủy các query đang chạy để tránh race condition
      await queryClient.cancelQueries({
        queryKey: USER_QUERY_KEYS.userProfile(userId),
      });
      await queryClient.cancelQueries({
        queryKey: USER_QUERY_KEYS.me,
      });

      // Lưu trạng thái trước khi update
      const previousUserProfile = queryClient.getQueryData(
        USER_QUERY_KEYS.userProfile(userId)
      );
      const previousCurrentUser = queryClient.getQueryData(USER_QUERY_KEYS.me);

      return { previousUserProfile, previousCurrentUser };
    },

    onError: (err, userId, context) => {
      // Khôi phục cache nếu có lỗi
      if (context?.previousUserProfile) {
        queryClient.setQueryData(
          USER_QUERY_KEYS.userProfile(userId),
          context.previousUserProfile
        );
      }

      if (context?.previousCurrentUser) {
        queryClient.setQueryData(
          USER_QUERY_KEYS.me,
          context.previousCurrentUser
        );
      }
    },

    onSuccess: (data, userId) => {
      if (!data || !data.success) {
        return;
      }

      // Lấy thông tin từ response
      const { isFollowing, followersCount, followingCount } = data.data || {};

      // Cập nhật cache trực tiếp với giá trị chính xác từ server
      queryClient.setQueryData(USER_QUERY_KEYS.userProfile(userId), (old) => {
        if (!old) return old;

        // Xử lý cả hai trường hợp cấu trúc dữ liệu
        if (old.data) {
          return {
            ...old,
            data: {
              ...old.data,
              isFollowing,
              followersCount,
            },
          };
        } else {
          return {
            ...old,
            isFollowing,
            followersCount,
          };
        }
      });

      // Cập nhật cache current user nếu cần
      queryClient.setQueryData(USER_QUERY_KEYS.me, (old) => {
        if (!old) return old;

        // Xử lý cả hai trường hợp cấu trúc dữ liệu
        if (old.data) {
          return {
            ...old,
            data: {
              ...old.data,
              followingCount,
            },
          };
        } else {
          return {
            ...old,
            followingCount,
          };
        }
      });

      // Invalidate queries để đảm bảo dữ liệu được refresh từ server
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.userProfile(userId),
      });
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.me,
      });
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
    userFollow: useUserFollow(), // Thay thế 3 hàm cũ bằng 1 hàm duy nhất
  };
};

export default useUserMutations;
