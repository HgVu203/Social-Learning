import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosService from "../services/axiosService";

const initialState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
  userGroups: [],
  memberRequests: [],
  popularGroups: [],
  hasMore: true,
  page: 1,
  limit: 10,
  totalGroups: 0
};

// Async thunks
export const fetchGroups = createAsyncThunk(
  'group/fetchGroups',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().group;
      const { 
        page = params.loadMore ? state.page + 1 : 1, 
        limit = state.limit,
        query = '' 
      } = params;
      
      const response = await axiosService.get(
        `/group?page=${page}&limit=${limit}&query=${encodeURIComponent(query)}`
      );
      return {...response.data, isLoadMore: params.loadMore};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch groups');
    }
  }
);

export const fetchPopularGroups = createAsyncThunk(
  'group/fetchPopularGroups',
  async (limit = 5, { rejectWithValue }) => {
    try {
      // Since the server doesn't have a /group/popular endpoint yet,
      // we'll use the main endpoint with a sorting parameter
      const response = await axiosService.get(`/group?limit=${limit}&sort=memberCount`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch popular groups');
    }
  }
);

export const fetchUserGroups = createAsyncThunk(
  'group/fetchUserGroups',
  async (_, { rejectWithValue }) => {
    try {
      // Since the server doesn't have a /group/user endpoint yet,
      // we'll use the main endpoint with a filter for the current user's groups
      const response = await axiosService.get(`/group?membership=user`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user groups');
    }
  }
);

export const createGroup = createAsyncThunk(
  'group/createGroup',
  async (groupData, { rejectWithValue }) => {
    try {
      const response = await axiosService.post('/group/create', groupData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create group');
    }
  }
);

export const getGroupById = createAsyncThunk(
  'group/getGroupById',
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await axiosService.get(`/group/${groupId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch group');
    }
  }
);

export const updateGroup = createAsyncThunk(
  'group/updateGroup',
  async ({ groupId, groupData }, { rejectWithValue }) => {
    try {
      const response = await axiosService.patch(`/group/${groupId}`, groupData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update group');
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'group/deleteGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      await axiosService.delete(`/group/${groupId}`);
      return groupId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete group');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'group/joinGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post(`/group/${groupId}/join`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join group');
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'group/leaveGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post(`/group/${groupId}/leave`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to leave group');
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'group/updateMemberRole',
  async ({ groupId, userId, role }, { rejectWithValue }) => {
    try {
      const response = await axiosService.patch(`/group/${groupId}/member-role`, { userId, role });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update member role');
    }
  }
);

const groupSlice = createSlice({
  name: 'group',
  initialState,
  reducers: {
    clearGroups: (state) => {
      state.groups = [];
      state.currentGroup = null;
      state.error = null;
      state.hasMore = true;
      state.page = 1;
      state.totalGroups = 0;
    },
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Groups
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        const { data, pagination, isLoadMore } = action.payload;
        
        state.loading = false;
        
        if (!isLoadMore) {
          state.groups = data;
        } else {
          const existingIds = new Set(state.groups.map(group => group._id));
          const newGroups = data.filter(group => !existingIds.has(group._id));
          state.groups = [...state.groups, ...newGroups];
        }
        
        state.hasMore = pagination?.page < pagination?.totalPages;
        state.page = pagination?.page || 1;
        state.totalGroups = pagination?.total || data.length;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Popular Groups
      .addCase(fetchPopularGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.popularGroups = action.payload.data;
      })
      .addCase(fetchPopularGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch User Groups
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.userGroups = action.payload.data;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Group
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        const newGroup = action.payload.data;
        state.groups.unshift(newGroup);
        state.userGroups.unshift(newGroup);
        state.currentGroup = newGroup;
        state.totalGroups += 1;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Group By ID
      .addCase(getGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGroupById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGroup = action.payload.data;
      })
      .addCase(getGroupById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Group
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        const updatedGroup = action.payload.data;
        
        // Update in groups array
        const index = state.groups.findIndex(group => group._id === updatedGroup._id);
        if (index !== -1) {
          state.groups[index] = updatedGroup;
        }
        
        // Update in userGroups array
        const userGroupIndex = state.userGroups.findIndex(group => group._id === updatedGroup._id);
        if (userGroupIndex !== -1) {
          state.userGroups[userGroupIndex] = updatedGroup;
        }
        
        // Update current group if it matches
        if (state.currentGroup?._id === updatedGroup._id) {
          state.currentGroup = updatedGroup;
        }
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Group
      .addCase(deleteGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loading = false;
        const deletedGroupId = action.payload;
        
        state.groups = state.groups.filter(group => group._id !== deletedGroupId);
        state.userGroups = state.userGroups.filter(group => group._id !== deletedGroupId);
        
        if (state.currentGroup?._id === deletedGroupId) {
          state.currentGroup = null;
        }
        
        state.totalGroups -= 1;
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Join Group
      .addCase(joinGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { groupId, isPrivate } = action.payload.data;
        
        // If the group is not private, immediately add to user groups
        if (!isPrivate) {
          const group = state.groups.find(g => g._id === groupId);
          if (group && !state.userGroups.some(g => g._id === groupId)) {
            state.userGroups.push(group);
          }
        }
        
        // Update current group if it matches
        if (state.currentGroup?._id === groupId) {
          state.currentGroup = {
            ...state.currentGroup,
            isMember: !isPrivate,
            hasRequestedJoin: isPrivate
          };
        }
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Leave Group
      .addCase(leaveGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { groupId } = action.payload.data;
        
        // Remove from user groups
        state.userGroups = state.userGroups.filter(group => group._id !== groupId);
        
        // Update current group if it matches
        if (state.currentGroup?._id === groupId) {
          state.currentGroup = {
            ...state.currentGroup,
            isMember: false,
            hasRequestedJoin: false
          };
        }
      })
      .addCase(leaveGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Member Role
      .addCase(updateMemberRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.loading = false;
        // Update state if needed based on the response
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearGroups, clearCurrentGroup, clearError } = groupSlice.actions;

export default groupSlice.reducer; 