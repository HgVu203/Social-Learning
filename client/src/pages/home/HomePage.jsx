// src/pages/home/HomePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PostList from '../../components/post/PostList';
import { fetchPosts, setFilter } from '../../redux/postSlice';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const dispatch = useDispatch();
  const { posts, loading, error, hasMore, filter } = useSelector((state) => state.post);
  const { user } = useSelector((state) => state.auth);

  // Initial load of posts
  useEffect(() => {
    dispatch(fetchPosts({}));
  }, [dispatch]);

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      dispatch(setFilter(newFilter));
      dispatch(fetchPosts({}));
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchPosts({ loadMore: true }));
    }
  }, [dispatch, loading, hasMore]);

  return (
    <div className="max-w-2xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
      {/* Welcome and Create Post Section */}
      <div className="bg-white shadow-sm rounded-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome{user ? `, ${user.username}` : ''}!</h1>
            <p className="mt-1 text-sm text-gray-500">Check out the latest posts or create your own</p>
          </div>
          <Link
            to="/posts/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleFilterChange('latest')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === 'latest'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => handleFilterChange('popular')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === 'popular'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => handleFilterChange('following')}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === 'following'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Following
            </button>
          </nav>
        </div>
      </div>

      {/* Posts */}
      <PostList 
        posts={posts}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadMore={handleLoadMore}
      />
      
      {/* Create Post Fab Button (mobile only) */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <Link
          to="/posts/create"
          className="inline-flex items-center justify-center p-3 rounded-full shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;