import { useParams } from "react-router-dom";
import { usePost } from "../../hooks/queries/usePostQueries";
import PostCard from "../../components/post/PostCard";
import { SkeletonPostDetail } from "../../components/skeleton";

const PostDetailPage = () => {
  const { postId } = useParams();
  const { data, isLoading, error } = usePost(postId);
  const post = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <SkeletonPostDetail />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-900/20 text-red-500 p-4 rounded-lg">
          {error.message || "An error occurred while loading the post"}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="text-center text-gray-400 bg-[#16181c] rounded-lg p-8">
          Post not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <PostCard post={post} />
    </div>
  );
};

export default PostDetailPage;
