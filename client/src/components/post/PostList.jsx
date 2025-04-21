import { memo, useRef, useCallback, useEffect } from "react";
import PostCard from "./PostCard";
import Loading from "../common/Loading";
import { usePostContext } from "../../contexts/PostContext";

const PostList = ({
  groupId,
  posts: propPosts,
  loading: propLoading,
  error: propError,
  hasMore: propHasMore,
  loadMore: propLoadMore,
}) => {
  // Nếu props được cung cấp, sử dụng props, nếu không sử dụng context
  const context = usePostContext();

  const posts = propPosts || context.posts;
  const loading = propLoading !== undefined ? propLoading : context.loading;
  const error = propError || context.error;
  const hasMore = propHasMore !== undefined ? propHasMore : context.hasMore;
  const loadMoreFunc = propLoadMore || context.loadMorePosts;

  const observer = useRef();

  // Khi component mount hoặc groupId thay đổi, tải bài đăng của nhóm
  useEffect(() => {
    if (groupId && context.fetchGroupPosts) {
      context.fetchGroupPosts(groupId);
    }
  }, [groupId, context.fetchGroupPosts]);

  // Setup the intersection observer for infinite scroll
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      // Chỉ thiết lập observer nếu có hàm loadMore
      if (loadMoreFunc && hasMore) {
        observer.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasMore) {
              loadMoreFunc();
            }
          },
          { threshold: 0.5 }
        );

        if (node) observer.current.observe(node);
      }
    },
    [loading, hasMore, loadMoreFunc]
  );

  if (loading && !posts?.length) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 bg-red-900/20 rounded-lg">
        {error}
      </div>
    );
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <div className="text-center text-gray-400 p-8 bg-[#16181c] rounded-lg">
        No posts found. Be the first to create one!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, index) => (
        <div
          key={post._id}
          ref={
            loadMoreFunc && index === posts.length - 1
              ? lastPostElementRef
              : null
          }
          className="overflow-hidden"
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
        <div className="text-center text-gray-400 py-4 border border-gray-800 bg-[#16181c] rounded-lg mt-6">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
};

export default memo(PostList);
