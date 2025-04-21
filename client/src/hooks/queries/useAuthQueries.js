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
          return { success: false, data: null };
        }
        const response = await axiosService.get("/auth/check");
        return response.data;
      } catch (error) {
        // Return null instead of throwing error
        console.log("Error checking auth session:", error);
        if (error.response?.status === 401) {
          return { success: false, data: null };
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 300000, // 5 minutes
    cacheTime: 60000, // 1 minute
  
  });
};
