import { useParams, Link } from "react-router-dom";
import { usePost } from "../../hooks/queries/usePostQueries";
import PostCard from "../../components/post/PostCard";
import { SkeletonPostDetail } from "../../components/skeleton";
import { FaArrowLeft } from "react-icons/fa";

const PostDetailPage = () => {
  const { postId } = useParams();
  const { data, isLoading, error } = usePost(postId);
  const post = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)] mb-4 hover:bg-[var(--color-primary-light)] hover:text-white transition-colors"
        >
          <FaArrowLeft />
        </Link>
        <SkeletonPostDetail />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)] mb-4 hover:bg-[var(--color-primary-light)] hover:text-white transition-colors"
        >
          <FaArrowLeft />
        </Link>
        <div className="bg-red-900/20 text-red-500 p-4 rounded-lg">
          {error.message || "An error occurred while loading the post"}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)] mb-4 hover:bg-[var(--color-primary-light)] hover:text-white transition-colors"
        >
          <FaArrowLeft />
        </Link>
        <div className="text-center text-gray-400 bg-[#16181c] rounded-lg p-8">
          Post not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)] mb-4 hover:bg-[var(--color-primary-light)] hover:text-white transition-colors"
      >
        <FaArrowLeft />
      </Link>
      <PostCard post={post} />
    </div>
  );
};

export default PostDetailPage;
