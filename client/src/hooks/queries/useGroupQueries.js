import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import {
  sortGroupsByPopularity,
  createFormattedResponse,
} from "../../utils/groupUtils";

export const GROUP_QUERY_KEYS = {
  all: ["groups"],
  lists: () => [...GROUP_QUERY_KEYS.all, "list"],
  list: (filters) => [...GROUP_QUERY_KEYS.lists(), filters],
  popular: () => [...GROUP_QUERY_KEYS.all, "popular"],
  details: () => [...GROUP_QUERY_KEYS.all, "detail"],
  detail: (id) => [...GROUP_QUERY_KEYS.details(), id],
  members: () => [...GROUP_QUERY_KEYS.all, "members"],
  member: (groupId) => [...GROUP_QUERY_KEYS.members(), groupId],
};

export const useGroupQueries = {
  // Fetch groups with pagination
  useGroups: (limit = 10) => {
    return useInfiniteQuery({
      queryKey: GROUP_QUERY_KEYS.lists(),
      queryFn: async ({ pageParam = 1 }) => {
        console.log(`Fetching groups, page: ${pageParam}, limit: ${limit}`);
        try {
          const response = await axiosService.get(
            `/group?page=${pageParam}&limit=${limit}`
          );
          console.log("Groups response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching groups:", error);
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.pagination) {
          const { page, totalPages } = lastPage.pagination;
          return page < totalPages ? page + 1 : undefined;
        }
        return undefined;
      },
      keepPreviousData: true,
    });
  },

  // Fetch popular groups
  usePopularGroups: (limit = 5) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.popular(),
      queryFn: async () => {
        console.log(`Fetching popular groups, limit: ${limit}`);
        try {
          // Fetch regular groups and sort on client side
          const response = await axiosService.get(`/group?limit=${limit * 2}`);

          // Sort by member count using utility function
          const groups = response.data.data || [];
          const popularGroups = sortGroupsByPopularity(groups, limit);

          console.log("Popular groups (client-sorted):", popularGroups);

          // Format to match expected response format
          return createFormattedResponse(response.data, popularGroups);
        } catch (error) {
          console.error("Error fetching popular groups:", error);
          throw error;
        }
      },
    });
  },

  // Fetch a single group by ID
  useGroup: (groupId) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.detail(groupId),
      queryFn: async () => {
        if (!groupId) return null;
        console.log(`Fetching group detail for ID: ${groupId}`);
        try {
          const response = await axiosService.get(`/group/${groupId}`);
          console.log("Group detail response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching group detail:", error);
          throw error;
        }
      },
      enabled: !!groupId,
    });
  },

  // Fetch group members
  useGroupMembers: (groupId) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.member(groupId),
      queryFn: async () => {
        if (!groupId) return { data: [] };
        console.log(`Fetching members for group ID: ${groupId}`);
        try {
          // Get group details as members are included in group data
          const response = await axiosService.get(`/group/${groupId}`);
          console.log("Group members response:", response.data);
          // Extract members from group data
          return {
            ...response.data,
            data: response.data.data?.members || [],
          };
        } catch (error) {
          console.error("Error fetching group members:", error);
          throw error;
        }
      },
      enabled: !!groupId,
    });
  },

  // Fetch user's groups
  useUserGroups: () => {
    return useQuery({
      queryKey: [...GROUP_QUERY_KEYS.all, "user"],
      queryFn: async () => {
        console.log(`Fetching current user's groups`);
        try {
          const response = await axiosService.get(`/group?membership=user`);
          console.log("User groups response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching user groups:", error);
          throw error;
        }
      },
    });
  },
};

// Export for backward compatibility
export const useGroupById = useGroupQueries.useGroup;

export default useGroupQueries;
