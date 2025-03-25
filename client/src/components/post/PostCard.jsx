import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleLike, deletePost, optimisticToggleLike } from '../../redux/postSlice';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import { formatDistanceToNow } from 'date-fns';
import PostComments from './PostComment';

const PostCard = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const isAuthor = user?._id === post.author?._id;
  
  const isLiked = useMemo(() => {
    if (!user || !post.likes) return false;
    return post.likes.includes(user._id) || post.isLiked;
  }, [user, post.likes, post.isLiked]);


  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Optimistically update UI
    dispatch(optimisticToggleLike({ postId: post._id, userId: user._id }));

    try {
      await dispatch(toggleLike(post._id)).unwrap();
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // No need to revert UI as it will be handled by the rejected case in the slice
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      setIsDeleting(true);
      await dispatch(deletePost(post._id)).unwrap();
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/post/${post._id}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Post Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <Link to={`/profile/${post.author?._id}`}>
              <Avatar src={post.author?.avatar} alt={post.author?.username} />
            </Link>
            <div>
              <Link 
                to={`/profile/${post.author?._id}`}
                className="font-medium hover:underline"
              >
                {post.author?.fullname || 'Unknown User'}
              </Link>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="relative group">
              <button 
                className="p-1 rounded-full hover:bg-gray-100"
                disabled={isDeleting}
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          {post.image && (
            <img
              src={post.image}
              alt="Post content"
              className="mt-3 rounded-lg max-h-96 w-full object-cover"
            />
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex space-x-4">
            <span>{post.likesCount || post.likes?.length || 0} likes</span>
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {post.commentsCount || 0} comments
            </button>
          </div>
        </div>

        {/* Post Actions */}
        <div className="flex items-center space-x-4 mt-4 pt-4 border-t">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 ${
              isLiked ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Like</span>
          </button>
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Comment</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <PostComments postId={post._id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard; 