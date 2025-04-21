import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

export const GROUP_QUERY_KEYS = {
  all: ["groups"],
  lists: () => [...GROUP_QUERY_KEYS.all, "list"],
  list: (filters) => [...GROUP_QUERY_KEYS.lists(), filters],
  popular: () => [...GROUP_QUERY_KEYS.all, "popular"],
  details: () => [...GROUP_QUERY_KEYS.all, "detail"],
  detail: (id) => [...GROUP_QUERY_KEYS.details(), id],
  members: () => [...GROUP_QUERY_KEYS.all, "members"],
  member: (groupId) => [...GROUP_QUERY_KEYS.members(), groupId],
  myGroups: () => [...GROUP_QUERY_KEYS.all, "user"],
};

export const useGroupQueries = {
  // Fetch groups with pagination
  useGroups: (limit = 10, options = {}) => {
    return useInfiniteQuery({
      queryKey: GROUP_QUERY_KEYS.lists(),
      queryFn: async ({ pageParam = 1 }) => {
        try {
          const response = await axiosService.get(
            `/group?page=${pageParam}&limit=${limit}`
          );
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
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    });
  },

  // Fetch groups with search query
  useSearchGroups: (query, limit = 10, options = {}) => {
    return useInfiniteQuery({
      queryKey: [...GROUP_QUERY_KEYS.lists(), { search: query }],
      queryFn: async ({ pageParam = 1 }) => {
        try {
          const response = await axiosService.get(
            `/group?query=${encodeURIComponent(
              query
            )}&page=${pageParam}&limit=${limit}`
          );
          return response.data;
        } catch (error) {
          console.error("Error searching groups:", error);
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
      // Only run the query if search term is at least 2 characters
      enabled: query.length >= 2,
      ...options,
    });
  },

  // Fetch popular groups
  usePopularGroups: (limit = 5, options = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.popular(),
      queryFn: async () => {
        try {
          // Fetch groups with sort parameter for server-side sorting
          const response = await axiosService.get(
            `/group?sort=memberCount&limit=${limit}`
          );
          return response.data;
        } catch (error) {
          console.error("Error fetching popular groups:", error);
          throw error;
        }
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
      ...options,
    });
  },

  // Fetch a single group by ID
  useGroup: (groupId, options = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.detail(groupId),
      queryFn: async () => {
        if (!groupId) return null;
        try {
          const response = await axiosService.get(`/group/${groupId}`);
          return response.data;
        } catch (error) {
          console.error("Error fetching group detail:", error);
          throw error;
        }
      },
      enabled: !!groupId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      ...options,
    });
  },

  // Fetch group members
  useGroupMembers: (groupId, options = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.member(groupId),
      queryFn: async () => {
        if (!groupId) return { data: [] };
        try {
          // Get group details as members are included in group data
          const response = await axiosService.get(`/group/${groupId}`);

          // Ensure the data is properly structured
          const members = response.data.data?.members || [];

          // Return the members in a consistent format
          return {
            ...response.data,
            data: members
              .map((member) => ({
                ...member,
                id: member.user?._id || member._id,
                username: member.user?.username,
                avatar: member.user?.avatar,
              }))
              .filter((member) => member.id),
          };
        } catch (error) {
          console.error("Error fetching group members:", error);
          throw error;
        }
      },
      enabled: !!groupId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      ...options,
    });
  },

  // Fetch user's groups
  useUserGroups: (options = {}) => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.myGroups(),
      queryFn: async () => {
        try {
          const response = await axiosService.get(`/group?membership=user`);
          return response.data;
        } catch (error) {
          console.error("Error fetching user groups:", error);
          throw error;
        }
      },
      staleTime: 1000 * 30, // 30 seconds - reduced from 2 minutes for faster updates
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      ...options,
    });
  },

  // Alias useMyGroups to useUserGroups for compatibility with GroupsListPage
  useMyGroups: (options = {}) => {
    console.log("Using useMyGroups (alias for useUserGroups)");
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.myGroups(),
      queryFn: async () => {
        try {
          const response = await axiosService.get(`/group?membership=user`);
          return response.data;
        } catch (error) {
          console.error("Error fetching my groups:", error);
          throw error;
        }
      },
      staleTime: 1000 * 30, // 30 seconds
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      ...options,
    });
  },
};

// Export for backward compatibility
export const useGroupById = useGroupQueries.useGroup;

export default useGroupQueries;
