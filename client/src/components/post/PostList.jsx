import { memo, useRef, useCallback, useEffect, useState } from "react";
import PostCard from "./PostCard";
import { usePostContext } from "../../contexts/PostContext";
import { SkeletonCard } from "../skeleton";
import {
  prefetchImages,
  createImagePrefetchObserver,
} from "../../utils/prefetch";

// Utility function to check for duplicate IDs
const checkForDuplicates = (posts) => {
  if (!posts || !posts.length) return null;

  const ids = new Set();
  const duplicates = [];

  for (const post of posts) {
    if (!post._id) continue;

    if (ids.has(post._id)) {
      duplicates.push(post._id);
    } else {
      ids.add(post._id);
    }
  }

  return duplicates.length ? duplicates : null;
};

const PostList = ({
  groupId,
  posts: propPosts,
  loading: propLoading,
  error: propError,
  hasMore: propHasMore,
  loadMore: propLoadMore,
}) => {
  // For debugging
  const [duplicateIDs, setDuplicateIDs] = useState(null);

  // Nếu props được cung cấp, sử dụng props, nếu không sử dụng context
  const context = usePostContext();

  const posts = propPosts || context.posts;
  const loading = propLoading !== undefined ? propLoading : context.loading;
  const error = propError || context.error;
  const hasMore = propHasMore !== undefined ? propHasMore : context.hasMore;
  const loadMoreFunc = propLoadMore || context.loadMorePosts;

  const observer = useRef();
  const postsRef = useRef([]);

  // Khi component mount hoặc groupId thay đổi, tải bài đăng của nhóm
  useEffect(() => {
    if (groupId && context.fetchGroupPosts) {
      context.fetchGroupPosts(groupId);
    }
  }, [groupId, context.fetchGroupPosts]);

  // Prefetch hình ảnh cho các bài viết tiếp theo
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    // Lấy tất cả URL hình ảnh từ các bài viết
    const imageUrls = posts.slice(0, 3).flatMap((post) => {
      const images = [];
      // Thêm ảnh từ mảng images nếu có
      if (post.images && post.images.length > 0) {
        images.push(...post.images);
      }
      // Thêm single image nếu có
      if (post.image) {
        images.push(post.image);
      }
      // Thêm avatar của tác giả
      if (post.author && post.author.avatar) {
        images.push(post.author.avatar);
      }
      return images;
    });

    // Prefetch 3 bài viết đầu tiên với mức ưu tiên cao
    if (imageUrls.length > 0) {
      prefetchImages(imageUrls, { highPriority: true });
    }

    // Tạo observer để theo dõi và prefetch hình ảnh cho các bài viết khi gần đến viewport
    if (postsRef.current.length > 0) {
      const elements = postsRef.current.slice(3); // Bỏ qua 3 bài viết đầu đã prefetch
      const getPostImages = (element) => {
        const postIndex = parseInt(element.dataset.index || "0", 10);
        const post = posts[postIndex];
        if (!post) return null;

        const images = [];
        if (post.images && post.images.length > 0) {
          images.push(...post.images);
        }
        if (post.image) {
          images.push(post.image);
        }
        return images.length > 0 ? images : null;
      };

      createImagePrefetchObserver(elements, getPostImages, {
        rootMargin: "1000px 0px", // Tải trước khi cách 1000px
      });
    }
  }, [posts]);

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
          { threshold: 0.1, rootMargin: "500px 0px" }
        );

        if (node) observer.current.observe(node);
      }
    },
    [loading, hasMore, loadMoreFunc]
  );

  // Lưu trữ tham chiếu cho mỗi bài viết để prefetch
  const setPostRef = (el, index) => {
    if (el) {
      el.dataset.index = index;
      postsRef.current[index] = el;
    }
  };

  // Check for duplicates when posts change
  useEffect(() => {
    const duplicates = checkForDuplicates(posts);
    if (duplicates) {
      console.warn("Duplicate post IDs detected:", duplicates);
      setDuplicateIDs(duplicates);
    } else {
      setDuplicateIDs(null);
    }
  }, [posts]);

  if (loading && !posts?.length) {
    return (
      <div className="flex flex-col gap-6">
        {[...Array(3)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg">
        {error.message || "Failed to load posts"}
      </div>
    );
  }

  // Display warning about duplicate IDs if any were found
  if (duplicateIDs && duplicateIDs.length > 0) {
    console.warn(`PostList: Found ${duplicateIDs.length} duplicate post IDs`);
  }

  if (!posts?.length) {
    return (
      <div className="text-center p-8 bg-[var(--color-bg-tertiary)] rounded-lg">
        <svg
          className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0
             01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <p className="mt-3 text-[var(--color-text-secondary)]">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, index) => {
        // Generate a unique key that includes both ID and index for safety
        const key = post._id ? `${post._id}-${index}` : `post-${index}`;

        // Xác định xem đây có phải là phần tử cuối cùng không để gắn ref
        if (posts.length === index + 1) {
          return (
            <div
              key={key}
              ref={(el) => {
                lastPostElementRef(el);
                setPostRef(el, index);
              }}
            >
              <PostCard post={post} />
            </div>
          );
        } else {
          return (
            <div key={key} ref={(el) => setPostRef(el, index)}>
              <PostCard post={post} />
            </div>
          );
        }
      })}

      {loading && (
        <div className="py-4">
          <SkeletonCard />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center py-4 text-[var(--color-text-secondary)]">
          No more posts to load
        </p>
      )}
    </div>
  );
};

export default memo(PostList);
