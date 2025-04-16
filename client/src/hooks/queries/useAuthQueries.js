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
        if (!tokenService.getToken()) {
          console.log("Không có token, bỏ qua kiểm tra phiên đăng nhập");
          return { success: false, data: null };
        }

        console.log("Checking auth session");
        const response = await axiosService.get("/auth/check");
        console.log("Auth session response:", response.data);
        return response.data;
      } catch (error) {
        // Return null instead of throwing error
        if (error.response?.status === 401) {
          console.log("Auth session failed - Unauthorized");
          return { success: false, data: null };
        }
        console.error("Error checking auth session:", error);
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Chỉ kích hoạt khi có token
    enabled: !!tokenService.getToken(),
  });
};
