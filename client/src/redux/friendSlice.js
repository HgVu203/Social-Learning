import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosService from "../services/axiosService";

const initialState = {
  friends: [],
  pendingRequests: [], // Lời mời kết bạn đang chờ
  sentRequests: [], // Lời mời đã gửi đi
  suggestions: [], // Gợi ý kết bạn
  loading: false,
  error: null
};

// Async thunks
export const fetchFriends = createAsyncThunk(
  'friend/fetchFriends',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosService.get('/friendship');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch friends');
    }
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'friend/fetchPendingRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosService.get('/friendship/pending');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending requests');
    }
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friend/fetchSentRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosService.get('/friends/sent-requests');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sent requests');
    }
  }
);

export const fetchFriendSuggestions = createAsyncThunk(
  'friend/fetchFriendSuggestions',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await axiosService.get(`/users/suggestions?limit=${limit}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch friend suggestions');
    }
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friend/sendFriendRequest',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post('/friendship/send', { receiverId: userId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send friend request');
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friend/acceptFriendRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post('/friendship/accept', { requestId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept friend request');
    }
  }
);

export const rejectFriendRequest = createAsyncThunk(
  'friend/rejectFriendRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post('/friendship/reject', { requestId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject friend request');
    }
  }
);

export const cancelFriendRequest = createAsyncThunk(
  'friend/cancelFriendRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      const response = await axiosService.delete(`/friends/cancel/${requestId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel friend request');
    }
  }
);

export const unfriend = createAsyncThunk(
  'friend/unfriend',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosService.delete(`/friendship/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unfriend user');
    }
  }
);

const friendSlice = createSlice({
  name: 'friend',
  initialState,
  reducers: {
    clearFriendState: (state) => {
      state.friends = [];
      state.pendingRequests = [];
      state.sentRequests = [];
      state.suggestions = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Friends
      .addCase(fetchFriends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.loading = false;
        state.friends = action.payload.data;
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Pending Requests
      .addCase(fetchPendingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingRequests = action.payload.data;
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Friend Suggestions
      .addCase(fetchFriendSuggestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriendSuggestions.fulfilled, (state, action) => {
        state.loading = false;
        state.suggestions = action.payload.data;
      })
      .addCase(fetchFriendSuggestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Send Friend Request
      .addCase(sendFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        const { request } = action.payload.data;
        
        // Add to sent requests
        state.sentRequests.push(request);
        
        // Remove from suggestions if present
        state.suggestions = state.suggestions.filter(
          suggestion => suggestion._id !== request.receiver._id
        );
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Accept Friend Request
      .addCase(acceptFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        const { requestId, friend } = action.payload.data;
        
        // Remove from pending requests
        state.pendingRequests = state.pendingRequests.filter(
          request => request._id !== requestId
        );
        
        // Add to friends list
        if (friend) {
          state.friends.push(friend);
        }
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Reject Friend Request
      .addCase(rejectFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        const { requestId } = action.payload.data;
        
        // Remove from pending requests
        state.pendingRequests = state.pendingRequests.filter(
          request => request._id !== requestId
        );
      })
      .addCase(rejectFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Cancel Friend Request
      .addCase(cancelFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        const { requestId } = action.payload.data;
        
        // Remove from sent requests
        state.sentRequests = state.sentRequests.filter(
          request => request._id !== requestId
        );
      })
      .addCase(cancelFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Unfriend
      .addCase(unfriend.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unfriend.fulfilled, (state, action) => {
        state.loading = false;
        const { userId } = action.payload.data;
        
        // Remove from friends list
        state.friends = state.friends.filter(friend => friend._id !== userId);
      })
      .addCase(unfriend.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearFriendState, clearError } = friendSlice.actions;

export default friendSlice.reducer; 