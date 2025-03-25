import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosService";

const initialState = {
  profile: null,
  loading: false,
  error: null,
  leaderboard: [],
  leaderboardLoading: false,
  leaderboardError: null,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  "user/fetchProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/user/profile/${userId || ''}`);
      if (!response.data.success) {
        return rejectWithValue(response.data.error || "Failed to fetch profile");
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch profile");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch('/user/update-profile', profileData);
      if (!response.data.success) {
        return rejectWithValue(response.data.error || "Failed to update profile");
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to update profile");
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  "user/fetchLeaderboard",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/user/leaderboard?page=${page}&limit=${limit}`);
      if (!response.data.success) {
        return rejectWithValue(response.data.error || "Failed to fetch leaderboard");
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch leaderboard");
    }
  }
);

export const updatePoints = createAsyncThunk(
  "user/updatePoints",
  async ({ points, badge }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/user/update-points', { points, badge });
      if (!response.data.success) {
        return rejectWithValue(response.data.error || "Failed to update points");
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to update points");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
      state.loading = false;
    },
    clearLeaderboard: (state) => {
      state.leaderboard = [];
      state.leaderboardError = null;
      state.leaderboardLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.profile = payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.profile = { ...state.profile, ...payload };
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // Fetch leaderboard
      .addCase(fetchLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
        state.leaderboardError = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, { payload }) => {
        state.leaderboardLoading = false;
        state.leaderboard = payload;
        state.leaderboardError = null;
      })
      .addCase(fetchLeaderboard.rejected, (state, { payload }) => {
        state.leaderboardLoading = false;
        state.leaderboardError = payload;
      })

      // Update points
      .addCase(updatePoints.fulfilled, (state, { payload }) => {
        if (state.profile) {
          state.profile.points = payload.points;
          state.profile.rank = payload.rank;
          state.profile.badges = payload.badges;
        }
      });
  },
});

export const { clearProfile, clearLeaderboard } = userSlice.actions;

export default userSlice.reducer;