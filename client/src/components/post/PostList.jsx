import { memo, useRef, useCallback, useEffect, useMemo } from "react";
import PostCard from "./PostCard";
import { usePostContext } from "../../contexts/PostContext";
import { SkeletonCard } from "../skeleton";
import {
  prefetchImages,
  createImagePrefetchObserver,
  forceRenderImages,
} from "../../utils/prefetch";

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
  const postsRef = useRef([]);
  const loadMoreRef = useRef(loadMoreFunc);
  const hasMoreRef = useRef(hasMore);
  const lastLoadMoreTimeRef = useRef(0); // Tránh việc tải quá nhanh

  // Cập nhật tham chiếu mới nhất của loadMore và hasMore để tránh stale closures
  useEffect(() => {
    loadMoreRef.current = loadMoreFunc;
    hasMoreRef.current = hasMore;
  }, [loadMoreFunc, hasMore]);

  // Tạo IntersectionObserver một lần và chỉ cập nhật khi cần thiết
  const observerCallback = useCallback((entries) => {
    if (entries[0].isIntersecting && hasMoreRef.current) {
      // Thêm throttling để tránh load quá nhiều lần
      const now = Date.now();
      if (now - lastLoadMoreTimeRef.current > 1000) {
        // Tối thiểu 1 giây giữa các lần tải
        lastLoadMoreTimeRef.current = now;
        loadMoreRef.current();
      }
    }
  }, []);

  const observerOptions = useMemo(
    () => ({
      threshold: 0.1,
      rootMargin: "2000px 0px", // Tăng từ 800px lên 2000px để tải các post tiếp theo sớm hơn nhiều
    }),
    []
  );

  // Khi component mount hoặc groupId thay đổi, tải bài đăng của nhóm
  useEffect(() => {
    if (groupId && context.fetchGroupPosts && (!posts || posts.length === 0)) {
      context.fetchGroupPosts(groupId);
    }
  }, [groupId, context.fetchGroupPosts, posts]);

  // Setup the intersection observer for infinite scroll
  const lastPostElementRef = useCallback(
    (node) => {
      if (loading) return;

      // Ngắt kết nối observer cũ nếu có
      if (observer.current) observer.current.disconnect();

      // Chỉ thiết lập observer nếu có hàm loadMore và còn dữ liệu để tải
      if (loadMoreFunc && hasMore) {
        // Sử dụng một observer duy nhất và chỉ cập nhật khi cần thiết
        observer.current = new IntersectionObserver(
          observerCallback,
          observerOptions
        );

        if (node) observer.current.observe(node);
      }
    },
    [loading, observerCallback, observerOptions]
  );

  // Lưu trữ tham chiếu cho mỗi bài viết để prefetch và prerender nếu cần
  const setPostRef = (el, index) => {
    if (el) {
      el.dataset.index = index;
      postsRef.current[index] = el;

      // Force prerender/prefetch cho các post gần viewport
      if (index < 20) {
        // Tăng từ 10 lên 20 post sẽ được prefetch
        // Force render ảnh trong post hiện tại
        forceRenderImages(el);

        // Tìm tất cả ảnh trong post và force preload chúng
        const images = el.querySelectorAll("img");
        images.forEach((img) => {
          if (img.src) {
            const preloadLink = document.createElement("link");
            preloadLink.rel = "preload";
            preloadLink.href = img.src;
            preloadLink.as = "image";
            preloadLink.fetchpriority = "high";
            document.head.appendChild(preloadLink);

            // Tạo ảnh mới và load nó vào cache
            const preloadImg = new Image();
            preloadImg.src = img.src;
            preloadImg.fetchPriority = "high";
            preloadImg.loading = "eager";
          }
        });
      }
    }
  };

  // Prefetch hình ảnh cho các bài viết tiếp theo với nhiều cải tiến
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    // Tạo một array để lưu trữ tất cả preload links để xóa sau khi unmount
    const preloadLinks = [];

    // Xác định ảnh cần prefetch ngay lập tức vs ảnh có thể prefetch từ từ
    const highPriorityPosts = posts.slice(0, 20); // Tăng từ 10 lên 20 bài đầu tiên
    const lowPriorityPosts = posts.slice(20);

    // Thu thập tất cả URL hình ảnh từ các bài viết ưu tiên cao
    const highPriorityImages = highPriorityPosts.flatMap(extractImagesFromPost);

    // Thực hiện prefetch với cả hai phương pháp để đảm bảo hiệu quả
    // 1. Sử dụng thẻ link preload
    highPriorityImages.forEach((imageUrl) => {
      if (imageUrl) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = imageUrl;
        link.fetchpriority = "high";
        link.importance = "high";
        document.head.appendChild(link);
        preloadLinks.push(link);

        // 2. Đồng thời sử dụng Image constructor để load vào cache
        const img = new Image();
        img.src = imageUrl;
        img.fetchPriority = "high";
        img.importance = "high";
        img.loading = "eager";
      }
    });

    // Thu thập URL hình ảnh từ các bài viết ưu tiên thấp
    const lowPriorityImages = lowPriorityPosts.flatMap(extractImagesFromPost);

    // Prefetch ảnh ưu tiên cao
    if (highPriorityImages.length > 0) {
      prefetchImages(highPriorityImages, {
        highPriority: true,
        quality: 85, // Sử dụng chất lượng tốt nhưng không quá lớn
      });
    }

    // Prefetch ảnh ưu tiên thấp ngay lập tức
    if (lowPriorityImages.length > 0) {
      prefetchImages(lowPriorityImages, {
        highPriority: true,
        quality: 80,
      });
    }

    // Tạo observer để theo dõi và prefetch hình ảnh cho các bài viết khi gần đến viewport
    if (postsRef.current.length > 20) {
      // Bỏ qua 20 bài viết đầu đã prefetch
      const elements = postsRef.current.slice(20);

      createImagePrefetchObserver(
        elements,
        (element) => {
          const postIndex = parseInt(element.dataset.index || "0", 10);
          const post = posts[postIndex];
          if (!post) return null;
          return extractImagesFromPost(post);
        },
        {
          rootMargin: "3000px 0px", // Tăng từ 2000px lên 3000px
          quality: 85,
        }
      );
    }

    // Helper function để trích xuất ảnh từ post
    function extractImagesFromPost(post) {
      if (!post) return [];

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
    }

    // Cleanup function để xóa các preload links khi component unmount
    return () => {
      preloadLinks.forEach((link) => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [posts]);

  // Cleanup observer when component unmounts
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  // Thêm cơ chế quan sát scroll để force render khi đến gần các post
  useEffect(() => {
    if (!posts || posts.length === 0 || !postsRef.current.length) return;

    // Tạo observer mới để xem người dùng scroll đến đâu
    const renderObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Khi gần đến post, force render các ảnh trong đó
            const el = entry.target;
            if (el) {
              // Force render tất cả hình ảnh trong post này
              forceRenderImages(el);

              // Cũng force render 2 post tiếp theo nếu có
              const index = parseInt(el.dataset.index || "0", 10);
              for (let i = 1; i <= 2; i++) {
                const nextPost = postsRef.current[index + i];
                if (nextPost) {
                  forceRenderImages(nextPost);
                }
              }
            }
          }
        });
      },
      {
        rootMargin: "500px 0px", // Khoảng cách ngắn hơn để xử lý khi thật sự gần
        threshold: 0.1,
      }
    );

    // Quan sát tất cả các post
    postsRef.current.forEach((el) => {
      if (el) renderObserver.observe(el);
    });

    return () => {
      renderObserver.disconnect();
    };
  }, [posts, postsRef.current.length]);

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
              className="post-item"
              data-post-id={post._id}
            >
              <PostCard post={post} index={index} />
            </div>
          );
        } else {
          return (
            <div
              key={key}
              ref={(el) => setPostRef(el, index)}
              className="post-item"
              data-post-id={post._id}
            >
              <PostCard post={post} index={index} />
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
