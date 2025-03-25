import { memo, useEffect, useRef, useCallback } from 'react';
import PostCard from './PostCard';
import Loading from '../common/Loading';

const PostList = ({ posts, loading, error, hasMore, loadMore }) => {
  const observer = useRef();
  
  // Setup the intersection observer for infinite scroll
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    // Chỉ thiết lập observer nếu có hàm loadMore
    if (loadMore && hasMore) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      }, { threshold: 0.5 });
      
      if (node) observer.current.observe(node);
    }
  }, [loading, hasMore, loadMore]);

  if (loading && !posts?.length) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        No posts found. Be the first to create one!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <div 
          key={post._id} 
          ref={loadMore && index === posts.length - 1 ? lastPostElementRef : null}
        >
          <PostCard post={post} />
        </div>
      ))}
      {loading && (
        <div className="flex justify-center py-4">
          <Loading />
        </div>
      )}
      {hasMore === false && posts.length > 0 && (
        <div className="text-center text-gray-500 py-4 border-t border-gray-200">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
};

export default memo(PostList); 