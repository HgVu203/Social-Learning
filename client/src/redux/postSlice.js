import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosService from "../services/axiosService";

const initialState = {
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  limit: 10,
  totalPosts: 0,
  filter: 'latest',
  selectedPost: null,
  comments: {},
  commentsLoading: false,
  commentsError: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,
};

// Async thunks
const fetchPosts = createAsyncThunk(
  'post/fetchPosts',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().post;
      const { 
        filter = state.filter, 
        page = params.loadMore ? state.page + 1 : 1, 
        limit = state.limit 
      } = params;
      
      console.log(`Fetching posts with filter: ${filter}, page: ${page}, limit: ${limit}`);
      const response = await axiosService.get(`/posts?filter=${filter}&page=${page}&limit=${limit}`);
      return {...response.data, isLoadMore: params.loadMore};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch posts');
    }
  }
);

const createPost = createAsyncThunk(
  'post/createPost',
  async (postData, { rejectWithValue }) => {
    try {
      const response = await axiosService.post('/posts/create-post', postData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create post');
    }
  }
);

const getPostById = createAsyncThunk(
  'post/getPostById',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosService.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch post');
    }
  }
);

const updatePost = createAsyncThunk(
  'post/updatePost',
  async ({ postId, postData }, { rejectWithValue }) => {
    try {
      const response = await axiosService.patch(`/posts/${postId}`, postData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update post');
    }
  }
);

const deletePost = createAsyncThunk(
  'post/deletePost',
  async (postId, { rejectWithValue }) => {
    try {
      await axiosService.delete(`/posts/${postId}`);
      return postId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete post');
    }
  }
);

const toggleLike = createAsyncThunk(
  'post/toggleLike',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosService.post(`/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle like');
    }
  }
);

const searchPosts = createAsyncThunk(
  'post/searchPosts',
  async (params, { rejectWithValue }) => {
    try {
      const { keyword, tag, author, page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams();
      if (keyword) queryParams.append('keyword', keyword);
      if (tag) queryParams.append('tag', tag);
      if (author) queryParams.append('author', author);
      queryParams.append('page', page);
      queryParams.append('limit', limit);
      
      const response = await axiosService.get(`/posts/search?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search posts');
    }
  }
);

const addComment = createAsyncThunk(
  'post/addComment',
  async ({ postId, content, parentId = null }, { rejectWithValue }) => {
    try {
      const response = await axiosService.post(`/posts/${postId}/comment`, { 
        comment: content,
        parentId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

const deleteComment = createAsyncThunk(
  'post/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const response = await axiosService.delete(`/posts/${postId}/comment/${commentId}`);
      return { postId, commentId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete comment');
    }
  }
);

const fetchComments = createAsyncThunk(
  'post/fetchComments',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosService.get(`/posts/${postId}/comments`);
      return { postId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch comments');
    }
  }
);

const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    clearPosts: (state) => {
      state.posts = [];
      state.currentPost = null;
      state.error = null;
      state.hasMore = true;
      state.page = 1;
      state.totalPosts = 0;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
      state.page = 1;
      state.posts = [];
      state.hasMore = true;
    },
    setSelectedPost: (state, action) => {
      state.selectedPost = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Add optimistic update for like/unlike
    optimisticToggleLike: (state, action) => {
      const { postId, userId } = action.payload;
      
      // Update in posts array
      const postInList = state.posts.find(p => p._id === postId);
      if (postInList) {
        if (postInList.isLiked) {
          postInList.likes = postInList.likes.filter(id => id !== userId);
        } else {
          postInList.likes = [...(postInList.likes || []), userId];
        }
        postInList.likesCount = postInList.likes.length;
        postInList.isLiked = !postInList.isLiked;
      }

      // Update current post if it matches
      if (state.currentPost?._id === postId) {
        if (state.currentPost.isLiked) {
          state.currentPost.likes = state.currentPost.likes.filter(id => id !== userId);
        } else {
          state.currentPost.likes = [...(state.currentPost.likes || []), userId];
        }
        state.currentPost.likesCount = state.currentPost.likes.length;
        state.currentPost.isLiked = !state.currentPost.isLiked;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Posts
      .addCase(fetchPosts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        const { data, pagination, isLoadMore } = action.payload;
        
        state.loading = false;
        state.filter = action.meta.arg.filter || state.filter;
        
        if (!isLoadMore) {
          // Initial load or filter change
          state.posts = data;
        } else {
          // Append new posts, ensuring no duplicates
          const existingIds = new Set(state.posts.map(post => post._id));
          const newPosts = data.filter(post => !existingIds.has(post._id));
          state.posts = [...state.posts, ...newPosts];
        }
        
        state.hasMore = pagination.page < pagination.totalPages;
        state.page = pagination.page;
        state.totalPosts = pagination.total;
        
        console.log(`Posts updated. Total: ${state.posts.length}, HasMore: ${state.hasMore}`);
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('Failed to fetch posts:', action.payload);
      })

      // Create Post
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload.data);
        state.totalPosts += 1;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Post By ID
      .addCase(getPostById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPostById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload.data;
      })
      .addCase(getPostById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Post
      .addCase(updatePost.fulfilled, (state, action) => {
        const updatedPost = action.payload.data;
        const index = state.posts.findIndex(post => post._id === updatedPost._id);
        if (index !== -1) {
          state.posts[index] = updatedPost;
        }
        if (state.currentPost?._id === updatedPost._id) {
          state.currentPost = updatedPost;
        }
      })

      // Delete Post
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(post => post._id !== action.payload);
        state.totalPosts -= 1;
        if (state.currentPost?._id === action.payload) {
          state.currentPost = null;
        }
      })

      // Toggle Like
      .addCase(toggleLike.pending, (state, action) => {
        // Nothing needed here since we're using optimistic updates
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const postId = action.meta.arg;
        const { likes } = action.payload;
        const isLiked = !action.payload.message.includes('unliked');

        // Update in posts array
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          postInList.likes = likes;
          postInList.likesCount = likes.length;
          postInList.isLiked = isLiked;
        }

        // Update current post if it matches
        if (state.currentPost?._id === postId) {
          state.currentPost = {
            ...state.currentPost,
            likes,
            likesCount: likes.length,
            isLiked
          };
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        // If the API call fails, we need to revert the optimistic update
        const { postId, userId } = action.meta.arg;
        
        // Update in posts array
        const postInList = state.posts.find(p => p._id === postId);
        if (postInList) {
          if (!postInList.isLiked) {
            postInList.likes = postInList.likes.filter(id => id !== userId);
          } else {
            postInList.likes = [...(postInList.likes || []), userId];
          }
          postInList.likesCount = postInList.likes.length;
          postInList.isLiked = !postInList.isLiked;
        }

        // Update current post if it matches
        if (state.currentPost?._id === postId) {
          if (!state.currentPost.isLiked) {
            state.currentPost.likes = state.currentPost.likes.filter(id => id !== userId);
          } else {
            state.currentPost.likes = [...(state.currentPost.likes || []), userId];
          }
          state.currentPost.likesCount = state.currentPost.likes.length;
          state.currentPost.isLiked = !state.currentPost.isLiked;
        }
      })

      // Search Posts
      .addCase(searchPosts.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data;
      })
      .addCase(searchPosts.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      })

      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { postId, comment } = action.payload.data;
        
        // Update in posts array
        const post = state.posts.find(p => p._id === postId);
        if (post) {
          if (!post.comments) post.comments = [];
          
          // Replace any optimistic temp comment (if exists)
          const tempIndex = post.comments.findIndex(c => 
            c.isOptimistic && 
            c.content === comment.content && 
            c.userId._id === comment.userId._id
          );
          
          if (tempIndex >= 0) {
            // Replace temp comment with real one
            post.comments[tempIndex] = comment;
          } else {
            // Add new comment
            post.comments = [comment, ...post.comments];
          }
          
          post.commentsCount = (post.commentsCount || 0) + 1;
        }

        // Update current post if it matches
        if (state.currentPost?._id === postId) {
          if (!state.currentPost.comments) state.currentPost.comments = [];
          
          // Replace any optimistic temp comment (if exists)
          const tempIndex = state.currentPost.comments.findIndex(c => 
            c.isOptimistic && 
            c.content === comment.content && 
            c.userId._id === comment.userId._id
          );
          
          if (tempIndex >= 0) {
            // Replace temp comment with real one
            state.currentPost.comments[tempIndex] = comment;
          } else {
            // Add new comment
            state.currentPost.comments = [comment, ...state.currentPost.comments];
          }
          
          state.currentPost.commentsCount = (state.currentPost.commentsCount || 0) + 1;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload;
      })

      // Delete Comment
      .addCase(deleteComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { postId, commentId } = action.payload;
        
        // Update in posts array
        const post = state.posts.find(p => p._id === postId);
        if (post?.comments) {
          post.comments = post.comments.filter(c => c._id !== commentId);
          post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
        }

        // Update current post if it matches
        if (state.currentPost?._id === postId && state.currentPost.comments) {
          state.currentPost.comments = state.currentPost.comments.filter(c => c._id !== commentId);
          state.currentPost.commentsCount = Math.max(0, (state.currentPost.commentsCount || 1) - 1);
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload;
      })

      // Fetch Comments
      .addCase(fetchComments.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { postId, data: comments } = action.payload;
        
        // Ensure comments is an array
        const validComments = Array.isArray(comments) ? comments : [];
        
        // Update in posts array
        const post = state.posts.find(p => p._id === postId);
        if (post) {
          // Keep optimistic comments that aren't in the response yet
          const optimisticComments = (post.comments || [])
            .filter(c => c.isOptimistic);
          
          // Combine with fetched comments, removing duplicates  
          const uniqueComments = [...validComments];
          
          // Add optimistic comments if they don't exist in the response
          optimisticComments.forEach(optimisticComment => {
            if (!uniqueComments.some(c => 
              c.content === optimisticComment.content && 
              c.userId._id === optimisticComment.userId._id
            )) {
              uniqueComments.push(optimisticComment);
            }
          });
          
          post.comments = uniqueComments;
          post.commentsCount = uniqueComments.length;
        }

        // Update current post if it matches
        if (state.currentPost?._id === postId) {
          // Keep optimistic comments that aren't in the response yet
          const optimisticComments = (state.currentPost.comments || [])
            .filter(c => c.isOptimistic);
          
          // Combine with fetched comments, removing duplicates
          const uniqueComments = [...validComments];
          
          // Add optimistic comments if they don't exist in the response
          optimisticComments.forEach(optimisticComment => {
            if (!uniqueComments.some(c => 
              c.content === optimisticComment.content && 
              c.userId._id === optimisticComment.userId._id
            )) {
              uniqueComments.push(optimisticComment);
            }
          });
          
          state.currentPost.comments = uniqueComments;
          state.currentPost.commentsCount = uniqueComments.length;
        }
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload;
      });
  }
});

// Export regular actions
export const { 
  clearPosts, 
  setFilter,
  setSelectedPost, 
  clearSearchResults, 
  clearError,
  optimisticToggleLike
} = postSlice.actions;

// Export reducer
export default postSlice.reducer;

// Export async thunks
export {
  fetchPosts,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  searchPosts,
  addComment,
  deleteComment,
  fetchComments
};
