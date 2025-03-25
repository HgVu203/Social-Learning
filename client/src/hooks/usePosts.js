import { useState, useCallback } from 'react';
import { postService } from './../services/postService';

export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await postService.getPosts(pageNum);
      const { data, pagination } = response.data;
      
      setPosts(prev => pageNum === 1 ? data : [...prev, ...data]);
      setHasMore(pagination.page < pagination.totalPages);
      setPage(pagination.page);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (postData) => {
    try {
      const response = await postService.createPost(postData);
      setPosts(prev => [response.data.data, ...prev]);
      return response.data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updatePost = useCallback(async (id, postData) => {
    try {
      const response = await postService.updatePost(id, postData);
      setPosts(prev => 
        prev.map(post => post._id === id ? response.data.data : post)
      );
      return response.data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deletePost = useCallback(async (id) => {
    try {
      await postService.deletePost(id);
      setPosts(prev => prev.filter(post => post._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(page + 1);
    }
  }, [loading, hasMore, page, fetchPosts]);

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    loadMore
  };
};