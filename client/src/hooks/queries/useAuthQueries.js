import { useQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import tokenService from "../../services/tokenService";

export const AUTH_QUERY_KEYS = {
  all: ["auth"],
  user: () => [...AUTH_QUERY_KEYS.all, "user"],
  session: () => [...AUTH_QUERY_KEYS.all, "session"],
};

export const useAuthSession = () => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.session(),
    queryFn: async () => {
      try {
        // Kiểm tra xem có token không trước khi gọi API
        const token = tokenService.getToken();
        if (!token) {
          return { success: false, data: null };
        }

        // Gọi API để xác thực với server
        const response = await axiosService.get("/auth/check");
        const data = response.data;

        // Nếu server xác nhận thành công, cập nhật localStorage
        if (data.success && data.data && data.data.user) {
          const userData = data.data.user;

          // Đảm bảo token được lưu trong user object
          if (!userData.token && data.data.token) {
            userData.token = data.data.token;
          } else if (!userData.token && token) {
            userData.token = token;
          }

          // Cập nhật lại cache
          tokenService.setUser(userData);

          // Cập nhật timestamp để theo dõi thời gian truy vấn thành công gần nhất
          localStorage.setItem("auth_timestamp", Date.now().toString());
        }

        return data;
      } catch (error) {
        if (error.response?.status === 401) {
          console.log("Auth session check failed with 401 error");

          // Kiểm tra xem có đang ở trang đăng nhập không để tránh xóa token sai
          const isOnAuthPage =
            window.location.pathname.includes("/login") ||
            window.location.pathname.includes("/signup") ||
            window.location.pathname.includes("/auth");

          // Nếu không ở trang đăng nhập, xóa token để yêu cầu đăng nhập lại
          if (!isOnAuthPage) {
            tokenService.clearTokens();
          }

          return { success: false, data: null };
        }
        throw error;
      }
    },
    retry: 1, // Cho phép thử lại 1 lần nếu thất bại
    refetchOnWindowFocus: true, // Thử lại khi cửa sổ được focus để đảm bảo trạng thái mới nhất
    refetchOnMount: true,
    staleTime: 2 * 60 * 1000, // 2 phút
    cacheTime: 5 * 60 * 1000, // 5 phút
    refetchInterval: 3 * 60 * 1000, // 3 phút thay vì 5 phút
  });
};
