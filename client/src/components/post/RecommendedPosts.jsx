import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { postService } from "../../services/postService";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { FaThumbsUp, FaComment, FaTags, FaEye, FaStar } from "react-icons/fa";
import { useInView } from "react-intersection-observer";
import Skeleton from "../skeleton/Skeleton";

// Post animation variants
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

// Single recommended post card
const RecommendedPostCard = ({ post, index, isMobile }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Format post content to show as preview
  const getContentPreview = (content) => {
    if (!content) return "";
    const textContent = content.replace(/<[^>]+>/g, " ");
    return textContent.length > 120
      ? `${textContent.slice(0, 120)}...`
      : textContent;
  };

  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <Link to={`/posts/${post._id}`} className="block">
        {post.images && post.images.length > 0 && (
          <div className="w-full h-48 overflow-hidden">
            <img
              src={post.images[0]}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center mb-2">
            {post.recommendationType === "semantic" && (
              <div className="flex items-center bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full mr-2">
                <FaStar className="mr-1" />
                <span>Gợi ý thông minh</span>
              </div>
            )}
            {post.recommendationType === "content" && (
              <div className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full mr-2">
                <FaTags className="mr-1" />
                <span>Dựa trên sở thích</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white line-clamp-2">
            {post.title}
          </h3>

          {!isMobile && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {getContentPreview(post.content)}
            </p>
          )}

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            <div className="flex items-center mr-4">
              <FaThumbsUp className="mr-1" />
              <span>{post.likesCount || 0}</span>
            </div>
            <div className="flex items-center mr-4">
              <FaComment className="mr-1" />
              <span>{post.commentsCount || 0}</span>
            </div>
            <div className="flex items-center">
              <FaEye className="mr-1" />
              <span>{post.views || 0}</span>
            </div>
          </div>

          <div className="flex items-center mt-3">
            <img
              src={post.author?.avatar || "https://via.placeholder.com/40"}
              alt={post.author?.username}
              className="w-6 h-6 rounded-full mr-2"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {post.author?.fullname || post.author?.username} •{" "}
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </span>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

// Loading skeleton for recommendations
const RecommendationSkeleton = ({ count = 3, isMobile }) => {
  return (
    <div
      className={`grid ${
        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      } gap-4`}
    >
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md"
          >
            <Skeleton height={160} />
            <div className="p-4">
              <Skeleton height={24} width="80%" className="mb-2" />
              {!isMobile && <Skeleton height={16} count={2} className="mb-3" />}
              <div className="flex gap-2 mt-3">
                <Skeleton height={20} width={60} />
                <Skeleton height={20} width={60} />
                <Skeleton height={20} width={60} />
              </div>
              <div className="flex items-center mt-3">
                <Skeleton
                  height={24}
                  width={24}
                  className="rounded-full mr-2"
                />
                <Skeleton height={16} width={120} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

// Main component for recommended posts
const RecommendedPosts = ({ limit = 6, showTitle = true, className = "" }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch recommended posts
  useEffect(() => {
    const fetchRecommendedPosts = async () => {
      try {
        setLoading(true);
        const response = await postService.getRecommendedPosts(limit);
        setPosts(response.data || []);
      } catch (err) {
        console.error("Error fetching recommended posts:", err);
        setError("Không thể tải gợi ý");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedPosts();
  }, [limit]);

  // Handle refresh of recommendations
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await postService.getRecommendedPosts(limit);

      // Animate old posts out, then new ones in
      setPosts([]);
      setTimeout(() => {
        setPosts(response.data || []);
      }, 300);
    } catch (err) {
      console.error("Error refreshing recommended posts:", err);
      setError("Không thể làm mới gợi ý");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`recommended-posts ${className}`}>
      {showTitle && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Gợi ý cho bạn
          </h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            {loading ? "Đang làm mới..." : "Làm mới"}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <RecommendationSkeleton count={limit} isMobile={isMobile} />
      ) : (
        <div
          className={`grid ${
            isMobile
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          } gap-4`}
        >
          <AnimatePresence>
            {posts.map((post, index) => (
              <RecommendedPostCard
                key={post._id}
                post={post}
                index={index}
                isMobile={isMobile}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && posts.length === 0 && !error && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
          <h3 className="text-gray-600 dark:text-gray-300 mb-2">
            Chưa có gợi ý nào
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tương tác với nhiều bài viết hơn để nhận gợi ý cá nhân hóa
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendedPosts;
