import { useQuery } from "@tanstack/react-query";
import { makeRequestWithRetry } from "../services/axiosService";

export const GROUP_QUERY_KEYS = {
  all: ["groups"],
  lists: () => [...GROUP_QUERY_KEYS.all, "list"],
  list: (filters) => [...GROUP_QUERY_KEYS.lists(), filters],
  details: () => [...GROUP_QUERY_KEYS.all, "detail"],
  detail: (id) => [...GROUP_QUERY_KEYS.details(), id],
  members: (id) => [...GROUP_QUERY_KEYS.detail(id), "members"],
  basicInfo: (id) => [...GROUP_QUERY_KEYS.detail(id), "basic"],
};

// Các hook tối ưu cho thao tác với groups
export const useGroupQueries = {
  // Lấy danh sách nhóm
  useGroups: (filters = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.list(filters),
      queryFn: async () => {
        try {
          const params = new URLSearchParams();

          if (filters.search) params.append("search", filters.search);
          if (filters.tag) params.append("tag", filters.tag);
          if (filters.page) params.append("page", filters.page);
          if (filters.limit) params.append("limit", filters.limit);

          const response = await makeRequestWithRetry(
            `/groups?${params.toString()}`,
            { method: "GET" },
            2
          );
          return response.data;
        } catch (error) {
          console.error("Error fetching groups:", error);
          throw error;
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },

  // Lấy thông tin cơ bản của nhóm - API tối ưu
  useGroupBasicInfo: (groupId) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.basicInfo(groupId),
      queryFn: async () => {
        if (!groupId) return null;

        const startTime = Date.now();
        try {
          const response = await makeRequestWithRetry(
            `/groups/${groupId}/basic`,
            { method: "GET" },
            2
          );
          console.log(
            `Group basic info fetched in ${Date.now() - startTime}ms`
          );
          return response.data;
        } catch (error) {
          console.error(`Error fetching group basic info: ${error.message}`);
          throw error;
        }
      },
      enabled: !!groupId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },

  // Lấy danh sách thành viên nhóm - API tối ưu
  useGroupMembers: (groupId, options = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.members(groupId),
      queryFn: async () => {
        if (!groupId) return { data: { members: [] } };

        const startTime = Date.now();
        try {
          const response = await makeRequestWithRetry(
            `/groups/${groupId}/members`,
            { method: "GET" },
            2
          );
          console.log(`Group members fetched in ${Date.now() - startTime}ms`);
          return response.data;
        } catch (error) {
          console.error(`Error fetching group members: ${error.message}`);
          throw error;
        }
      },
      enabled: !!groupId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      ...options,
    });
  },

  // Lấy tất cả thông tin của nhóm (fallback cho API không tối ưu)
  useGroup: (groupId) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.detail(groupId),
      queryFn: async () => {
        if (!groupId) return null;

        try {
          const response = await makeRequestWithRetry(
            `/groups/${groupId}`,
            { method: "GET" },
            2
          );
          return response.data;
        } catch (error) {
          console.error(`Error fetching group details: ${error.message}`);
          throw error;
        }
      },
      enabled: !!groupId,
    });
  },
};

// Export các hàm truy vấn riêng lẻ để dễ sử dụng
export const useGroups = (filters) => useGroupQueries.useGroups(filters);
export const useGroupBasicInfo = (groupId) =>
  useGroupQueries.useGroupBasicInfo(groupId);
export const useGroupMembers = (groupId, options) =>
  useGroupQueries.useGroupMembers(groupId, options);
export const useGroup = (groupId) => useGroupQueries.useGroup(groupId);

export default useGroupQueries;
