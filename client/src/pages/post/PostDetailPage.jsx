import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getPostById } from '../../redux/postSlice';
import PostCard from '../../components/post/PostCard';
import Loading from '../../components/common/Loading';

const PostDetailPage = () => {
  const { postId } = useParams();
  const dispatch = useDispatch();
  const { currentPost, loading, error } = useSelector((state) => state.post);

  useEffect(() => {
    if (postId) {
      dispatch(getPostById(postId));
    }
  }, [dispatch, postId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!currentPost) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="text-center text-gray-500">
          Post not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <PostCard post={currentPost} />
    </div>
  );
};

export default PostDetailPage; 