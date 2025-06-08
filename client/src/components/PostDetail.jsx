import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  usePostBasicInfo,
  usePostEngagement,
  usePostComments,
} from "../hooks/queries/usePostQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../services/axiosService";
import { useAuth } from "../hooks/useAuth";
import { formatDistance } from "date-fns";
import { POST_QUERY_KEYS } from "../hooks/queries/usePostQueries";
import { ClipLoader } from "react-spinners";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";
import { toast } from "react-toastify";
import { FaHeart, FaRegHeart, FaComment, FaEye } from "react-icons/fa";

const PostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(true);

  // Sử dụng các API tối ưu
  const {
    data: basicData,
    isLoading: isLoadingBasic,
    error: basicError,
  } = usePostBasicInfo(id);

  const { data: engagementData, isLoading: isLoadingEngagement } =
    usePostEngagement(id);

  const { data: commentsData, isLoading: isLoadingComments } = usePostComments(
    id,
    { enabled: showComments }
  );

  // Extract data from query results
  const post = basicData?.data;
  const engagement = engagementData?.data;

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosService.post(`/posts/${id}/like`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate engagement data instead of full post
      queryClient.invalidateQueries(POST_QUERY_KEYS.engagement(id));
    },
    onError: (error) => {
      console.error("Error liking post: " + error.message);
    },
  });

  // Handle error states
  if (basicError) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading post: {basicError.message}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingBasic) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader color="#4F46E5" size={50} />
      </div>
    );
  }

  // Handle deleted or non-existent post
  if (!post) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Post not found or has been deleted.
        </div>
      </div>
    );
  }

  const handleLikeClick = () => {
    if (!user) {
      toast.info("Please login to like posts");
      return;
    }
    likeMutation.mutate();
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Post Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <img
              src={post.author?.avatar || "/default-avatar.png"}
              alt={post.author?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <Link
                to={`/profile/${post.author?.username}`}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {post.author?.fullname || post.author?.username}
              </Link>
              <p className="text-xs text-gray-500">
                {formatDistance(new Date(post.createdAt), new Date(), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <h1 className="text-2xl font-bold mt-3">{post.title}</h1>
        </div>

        {/* Post Content */}
        <div className="p-4">
          <div className="prose max-w-none">
            {post.content.split("\n").map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {post.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className="rounded-lg shadow-sm object-cover w-full h-64"
                />
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Section */}
        <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
          {isLoadingEngagement ? (
            <div className="flex space-x-4">
              <ClipLoader size={16} color="#4F46E5" />
            </div>
          ) : (
            <div className="flex space-x-4">
              <button
                onClick={handleLikeClick}
                className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
                disabled={likeMutation.isLoading}
              >
                {engagement?.isLiked ? (
                  <FaHeart className="text-red-500" />
                ) : (
                  <FaRegHeart />
                )}
                <span>{engagement?.likesCount || 0}</span>
              </button>

              <button
                onClick={toggleComments}
                className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
              >
                <FaComment />
                <span>{engagement?.commentsCount || 0}</span>
              </button>

              <div className="flex items-center space-x-1 text-gray-600">
                <FaEye />
                <span>{post.views || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="p-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>
            <CommentForm postId={id} />

            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <ClipLoader color="#4F46E5" size={30} />
              </div>
            ) : (
              <CommentList
                comments={commentsData?.data?.comments || []}
                postId={id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
